import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { Client } from 'pg'

function resolveDbUrl() {
  return (
    process.env.SUPABASE_DB_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL ||
    ''
  ).trim()
}

async function main() {
  const fileArg = process.argv[2]
  if (!fileArg) {
    throw new Error('Usage: node --experimental-strip-types scripts/run-sql-file.ts <sql-file-path>')
  }

  const filePath = path.resolve(process.cwd(), fileArg)
  if (!fs.existsSync(filePath)) {
    throw new Error(`SQL file not found: ${filePath}`)
  }

  const sql = fs.readFileSync(filePath, 'utf8').trim()
  if (!sql) {
    throw new Error(`SQL file is empty: ${filePath}`)
  }

  const dbUrl = resolveDbUrl()
  if (!dbUrl) {
    throw new Error('Missing DB URL. Set SUPABASE_DB_URL or POSTGRES_URL_NON_POOLING or POSTGRES_URL.')
  }

  const client = new Client({ connectionString: dbUrl })

  await client.connect()
  try {
    await client.query(sql)
    console.log(`Applied: ${fileArg}`)
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(message)
  process.exit(1)
})
