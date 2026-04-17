import fs from 'node:fs'
import path from 'node:path'
import { Client } from 'pg'

function loadLocalEnvFiles() {
  if (fs.existsSync('.env')) {
    process.loadEnvFile?.('.env')
  }

  if (fs.existsSync('.env.local')) {
    process.loadEnvFile?.('.env.local')
  }
}

function resolveDbUrl() {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL ||
    process.env.SUPABASE_DB_URL ||
    ''
  ).trim()
}

async function ensureMigrationTable(client: Client) {
  await client.query(`
    create table if not exists public.schema_migrations (
      id text primary key,
      applied_at timestamptz not null default now()
    )
  `)
}

async function main() {
  loadLocalEnvFiles()

  const dbUrl = resolveDbUrl()
  if (!dbUrl) {
    throw new Error(
      'Missing DB URL. Set DATABASE_URL or POSTGRES_URL_NON_POOLING or POSTGRES_URL.'
    )
  }

  const migrationsDir = path.join(process.cwd(), 'db', 'migrations')
  if (!fs.existsSync(migrationsDir)) {
    throw new Error(`Migration directory not found: ${migrationsDir}`)
  }

  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b))

  const client = new Client({ connectionString: dbUrl })
  await client.connect()

  try {
    await ensureMigrationTable(client)

    for (const migrationFile of migrationFiles) {
      const applied = await client.query<{ id: string }>(
        'select id from public.schema_migrations where id = $1',
        [migrationFile]
      )

      if (applied.rowCount) {
        console.log(`Skipped: ${migrationFile}`)
        continue
      }

      const sql = fs.readFileSync(path.join(migrationsDir, migrationFile), 'utf8').trim()
      if (!sql) {
        throw new Error(`Migration file is empty: ${migrationFile}`)
      }

      await client.query('begin')
      try {
        await client.query(sql)
        await client.query('insert into public.schema_migrations (id) values ($1)', [migrationFile])
        await client.query('commit')
      } catch (error) {
        await client.query('rollback')
        throw error
      }

      console.log(`Applied: ${migrationFile}`)
    }
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(message)
  process.exit(1)
})
