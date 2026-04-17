#!/usr/bin/env node

const fs = require('node:fs')
const path = require('node:path')
const { Client } = require('pg')

if (fs.existsSync(path.join(process.cwd(), '.env'))) {
  process.loadEnvFile?.('.env')
}

if (fs.existsSync(path.join(process.cwd(), '.env.local'))) {
  process.loadEnvFile?.('.env.local')
}

const checkMode = process.argv.includes('--check')
const outputPath = path.join(process.cwd(), 'lib', 'database.generated.ts')
const dbUrl =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.POSTGRES_URL ||
  process.env.SUPABASE_DB_URL

if (!dbUrl) {
  console.error('Missing DATABASE_URL (or POSTGRES_URL_NON_POOLING / POSTGRES_URL)')
  process.exit(1)
}

function mapPgType(udtName, dataType) {
  if (udtName.startsWith('_')) {
    return `${mapPgType(udtName.slice(1), dataType)}[]`
  }

  switch (udtName) {
    case 'bool':
      return 'boolean'
    case 'int2':
    case 'int4':
    case 'int8':
    case 'float4':
    case 'float8':
    case 'numeric':
    case 'decimal':
      return 'number'
    case 'json':
    case 'jsonb':
      return 'Json'
    case 'uuid':
    case 'text':
    case 'varchar':
    case 'bpchar':
    case 'date':
    case 'timestamp':
    case 'timestamptz':
    case 'time':
    case 'timetz':
    case 'inet':
    case 'bytea':
      return 'string'
    default:
      if (dataType === 'USER-DEFINED') return 'string'
      return 'unknown'
  }
}

function mapFormattedPgType(typeName) {
  const normalized = String(typeName || '').toLowerCase()

  switch (normalized) {
    case 'boolean':
      return 'boolean'
    case 'smallint':
    case 'integer':
    case 'bigint':
    case 'real':
    case 'double precision':
    case 'numeric':
    case 'decimal':
      return 'number'
    case 'uuid':
    case 'text':
    case 'character varying':
    case 'character':
    case 'date':
    case 'timestamp without time zone':
    case 'timestamp with time zone':
    case 'time without time zone':
    case 'time with time zone':
    case 'inet':
    case 'bytea':
      return 'string'
    case 'json':
    case 'jsonb':
      return 'Json'
    case 'void':
      return 'undefined'
    default:
      if (normalized.endsWith('[]')) {
        return `${mapFormattedPgType(normalized.slice(0, -2))}[]`
      }
      return 'unknown'
  }
}

function toTsKey(raw) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(raw) ? raw : `'${raw}'`
}

function normalize(content) {
  return `${content.trim()}\n`
}

async function generateTypes() {
  const client = new Client({ connectionString: dbUrl })
  await client.connect()

  const tablesRes = await client.query(`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_type = 'BASE TABLE'
    order by table_name
  `)

  const columnsRes = await client.query(`
    select
      table_name,
      column_name,
      is_nullable,
      data_type,
      udt_name,
      column_default,
      is_generated,
      is_identity,
      ordinal_position
    from information_schema.columns
    where table_schema = 'public'
    order by table_name, ordinal_position
  `)

  const fksRes = await client.query(`
    select
      tc.constraint_name,
      tc.table_name,
      kcu.column_name,
      ccu.table_name as foreign_table_name,
      ccu.column_name as foreign_column_name
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name
     and tc.table_schema = kcu.table_schema
    join information_schema.constraint_column_usage ccu
      on ccu.constraint_name = tc.constraint_name
     and ccu.table_schema = tc.table_schema
    where tc.table_schema = 'public'
      and tc.constraint_type = 'FOREIGN KEY'
    order by tc.table_name, tc.constraint_name
  `)

  const functionsRes = await client.query(`
    select
      p.proname as function_name,
      coalesce(p.proargnames, '{}'::text[]) as arg_names,
      coalesce(
        (
          select array_agg(pg_catalog.format_type(arg_type, null) order by ordinality)
          from unnest(coalesce(p.proargtypes::oid[], '{}'::oid[])) with ordinality as args(arg_type, ordinality)
        ),
        '{}'::text[]
      ) as arg_types,
      pg_catalog.format_type(p.prorettype, null) as return_type
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and pg_catalog.format_type(p.prorettype, null) <> 'trigger'
      and not exists (
        select 1
        from pg_depend d
        join pg_extension e on e.oid = d.refobjid
        where d.classid = 'pg_proc'::regclass
          and d.objid = p.oid
          and d.deptype = 'e'
      )
    order by p.proname
  `)

  const tableNames = tablesRes.rows.map((row) => row.table_name)
  const columnsByTable = new Map()
  const fksByTable = new Map()

  for (const row of columnsRes.rows) {
    if (!columnsByTable.has(row.table_name)) columnsByTable.set(row.table_name, [])
    columnsByTable.get(row.table_name).push(row)
  }

  for (const row of fksRes.rows) {
    if (!fksByTable.has(row.table_name)) fksByTable.set(row.table_name, [])
    fksByTable.get(row.table_name).push(row)
  }

  const out = []
  out.push('// AUTO-GENERATED by scripts/generate-db-types.cjs')
  out.push('// Source: live PostgreSQL database introspection')
  out.push('')
  out.push('export type Json =')
  out.push('  | string')
  out.push('  | number')
  out.push('  | boolean')
  out.push('  | null')
  out.push('  | { [key: string]: Json | undefined }')
  out.push('  | Json[]')
  out.push('')
  out.push('export type Database = {')
  out.push('  public: {')
  out.push('    Tables: {')

  for (const tableName of tableNames) {
    const columns = columnsByTable.get(tableName) || []
    const fks = fksByTable.get(tableName) || []

    out.push(`      ${toTsKey(tableName)}: {`)
    out.push('        Row: {')
    for (const col of columns) {
      const type = mapPgType(col.udt_name, col.data_type)
      const nullable = col.is_nullable === 'YES'
      out.push(`          ${toTsKey(col.column_name)}: ${type}${nullable ? ' | null' : ''}`)
    }
    out.push('        }')

    out.push('        Insert: {')
    for (const col of columns) {
      const type = mapPgType(col.udt_name, col.data_type)
      const nullable = col.is_nullable === 'YES'
      const hasDefault = col.column_default !== null
      const generated = col.is_generated && col.is_generated !== 'NEVER'
      const identity = col.is_identity === 'YES'
      const optional = nullable || hasDefault || generated || identity
      out.push(
        `          ${toTsKey(col.column_name)}${optional ? '?' : ''}: ${type}${nullable ? ' | null' : ''}`
      )
    }
    out.push('        }')

    out.push('        Update: {')
    for (const col of columns) {
      const type = mapPgType(col.udt_name, col.data_type)
      const nullable = col.is_nullable === 'YES'
      out.push(`          ${toTsKey(col.column_name)}?: ${type}${nullable ? ' | null' : ''}`)
    }
    out.push('        }')

    out.push('        Relationships: [')
    for (const fk of fks) {
      out.push('          {')
      out.push(`            foreignKeyName: '${fk.constraint_name}'`)
      out.push(`            columns: ['${fk.column_name}']`)
      out.push('            isOneToOne: false')
      out.push(`            referencedRelation: '${fk.foreign_table_name}'`)
      out.push(`            referencedColumns: ['${fk.foreign_column_name}']`)
      out.push('          },')
    }
    out.push('        ]')
    out.push('      }')
  }

  out.push('    }')
  out.push('    Views: Record<PropertyKey, never>')
  out.push('    Functions: {')
  for (const fn of functionsRes.rows) {
    const argNames = Array.isArray(fn.arg_names) ? fn.arg_names : []
    const argTypes = Array.isArray(fn.arg_types) ? fn.arg_types : []

    out.push(`      ${toTsKey(fn.function_name)}: {`)
    if (argTypes.length === 0) {
      out.push('        Args: Record<PropertyKey, never>')
    } else {
      const argPairs = argTypes.map((argType, index) => {
        const argName = argNames[index] || `arg${index + 1}`
        return `${toTsKey(argName)}: ${mapFormattedPgType(argType)}`
      })
      out.push(`        Args: { ${argPairs.join('; ')} }`)
    }
    out.push(`        Returns: ${mapFormattedPgType(fn.return_type)}`)
    out.push('      }')
  }
  out.push('    }')
  out.push('    Enums: Record<PropertyKey, never>')
  out.push('    CompositeTypes: Record<PropertyKey, never>')
  out.push('  }')
  out.push('}')

  await client.end()
  return normalize(out.join('\n'))
}

async function main() {
  const generated = await generateTypes()

  if (checkMode) {
    if (!fs.existsSync(outputPath)) {
      console.error(`Missing ${outputPath}. Run npm run db:types:generate first.`)
      process.exit(1)
    }

    const current = normalize(fs.readFileSync(outputPath, 'utf8'))
    if (current !== generated) {
      console.error('Generated database types are out of date. Run "npm run db:types:generate".')
      process.exit(1)
    }

    console.log('database.generated.ts is up to date.')
    return
  }

  fs.writeFileSync(outputPath, generated)
  console.log(`Generated ${outputPath}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
