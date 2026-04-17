import { afterEach, describe, expect, it, vi } from 'vitest'

const createClientMock = vi.fn()

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn(),
}))

vi.mock('react', () => ({
  cache: <T>(fn: T) => fn,
}))

vi.mock('pg', () => ({
  Client: function MockClient(options: { connectionString: string }) {
    return createClientMock(options)
  },
}))

describe('db facade', () => {
  afterEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    delete process.env.DATABASE_URL
    delete process.env.POSTGRES_URL_NON_POOLING
    delete process.env.POSTGRES_URL
    delete process.env.SUPABASE_DB_URL
  })

  it('opens and closes a client for each query call', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ ok: true }] })
    const connect = vi.fn().mockResolvedValue(undefined)
    const end = vi.fn().mockResolvedValue(undefined)
    createClientMock.mockReturnValue({ connect, query, end })

    const { createDbFacade } = await import('@/lib/server/db')
    const db = createDbFacade({
      connectionString: 'postgres://example',
      source: 'hyperdrive',
    })

    const result = await db.query('select 1')

    expect(connect).toHaveBeenCalledTimes(1)
    expect(query).toHaveBeenCalledWith('select 1', undefined)
    expect(end).toHaveBeenCalledTimes(1)
    expect(result).toEqual({ rows: [{ ok: true }] })
  })

  it('reuses one client within withClient and closes it afterward', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] })
    const connect = vi.fn().mockResolvedValue(undefined)
    const end = vi.fn().mockResolvedValue(undefined)
    const client = { connect, query, end }
    createClientMock.mockReturnValue(client)

    const { createDbFacade } = await import('@/lib/server/db')
    const db = createDbFacade({
      connectionString: 'postgres://example',
      source: 'database_url',
    })

    const result = await db.withClient(async (receivedClient) => {
      expect(receivedClient).toBe(client)
      await receivedClient.query('select 1')
      await receivedClient.query('select 2')
      return 'ok'
    })

    expect(connect).toHaveBeenCalledTimes(1)
    expect(query).toHaveBeenNthCalledWith(1, 'select 1')
    expect(query).toHaveBeenNthCalledWith(2, 'select 2')
    expect(end).toHaveBeenCalledTimes(1)
    expect(result).toBe('ok')
  })

  it('wraps transactions with begin and commit', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] })
    const connect = vi.fn().mockResolvedValue(undefined)
    const end = vi.fn().mockResolvedValue(undefined)
    const client = { connect, query, end }
    createClientMock.mockReturnValue(client)

    const { createDbFacade } = await import('@/lib/server/db')
    const db = createDbFacade({
      connectionString: 'postgres://example',
      source: 'hyperdrive',
    })

    await db.transaction(async (receivedClient) => {
      await receivedClient.query('select 1')
    })

    expect(query).toHaveBeenNthCalledWith(1, 'begin')
    expect(query).toHaveBeenNthCalledWith(2, 'select 1')
    expect(query).toHaveBeenNthCalledWith(3, 'commit')
    expect(end).toHaveBeenCalledTimes(1)
  })

  it('rolls back transactions on failure and rethrows the original error', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] })
    const connect = vi.fn().mockResolvedValue(undefined)
    const end = vi.fn().mockResolvedValue(undefined)
    createClientMock.mockReturnValue({ connect, query, end })

    const { createDbFacade } = await import('@/lib/server/db')
    const db = createDbFacade({
      connectionString: 'postgres://example',
      source: 'hyperdrive',
    })

    const failure = new Error('boom')

    await expect(
      db.transaction(async () => {
        throw failure
      })
    ).rejects.toThrow('boom')

    expect(query).toHaveBeenNthCalledWith(1, 'begin')
    expect(query).toHaveBeenNthCalledWith(2, 'rollback')
    expect(end).toHaveBeenCalledTimes(1)
  })
})
