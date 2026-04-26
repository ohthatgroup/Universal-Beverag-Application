import { getCloudflareContext } from '@opennextjs/cloudflare'
import { Client, type QueryResult, type QueryResultRow } from 'pg'
import { cache } from 'react'

declare global {
  interface CloudflareEnv {
    DATABASE_URL?: string
    HYPERDRIVE?: { connectionString?: string }
  }
}

type DbConfigSource = 'hyperdrive' | 'database_url'

type DbConfig = {
  connectionString: string
  source: DbConfigSource
}

type DbFacade = {
  readonly source: DbConfigSource
  query<Row extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[]
  ): Promise<QueryResult<Row>>
  withClient<T>(callback: (client: Client) => Promise<T>): Promise<T>
  transaction<T>(callback: (client: Client) => Promise<T>): Promise<T>
}

function resolveProcessDbUrl() {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL ||
    ''
  ).trim()
}

function createClient(connectionString: string) {
  return new Client({ connectionString })
}

async function withConnectedClient<T>(
  connectionString: string,
  callback: (client: Client) => Promise<T>
): Promise<T> {
  const client = createClient(connectionString)
  await client.connect()

  try {
    return await callback(client)
  } finally {
    await client.end()
  }
}

export async function resolveRequestDbConfig(): Promise<DbConfig> {
  const context = await getCloudflareContext({ async: true }).catch(() => null)
  const hyperdriveConnectionString = context?.env?.HYPERDRIVE?.connectionString?.trim()

  if (hyperdriveConnectionString) {
    return {
      connectionString: hyperdriveConnectionString,
      source: 'hyperdrive',
    }
  }

  const databaseUrl = context?.env?.DATABASE_URL?.trim() || resolveProcessDbUrl()
  if (databaseUrl) {
    return {
      connectionString: databaseUrl,
      source: 'database_url',
    }
  }

  throw new Error('Missing database connection. Configure a Hyperdrive binding or DATABASE_URL.')
}

export function createDbFacade(config: DbConfig): DbFacade {
  const { connectionString, source } = config

  const withClient: DbFacade['withClient'] = async (callback) => {
    return withConnectedClient(connectionString, callback)
  }

  const transaction: DbFacade['transaction'] = async (callback) => {
    return withConnectedClient(connectionString, async (client) => {
      await client.query('begin')
      try {
        const result = await callback(client)
        await client.query('commit')
        return result
      } catch (error) {
        await client.query('rollback')
        throw error
      }
    })
  }

  return {
    source,
    query(text, values) {
      return withConnectedClient(connectionString, (client) => client.query(text, values))
    },
    withClient,
    transaction,
  }
}

export const getRequestDb = cache(async (): Promise<DbFacade> => {
  const config = await resolveRequestDbConfig()
  return createDbFacade(config)
})

export type { DbFacade, DbConfig, DbConfigSource }
