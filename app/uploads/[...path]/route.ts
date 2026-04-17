import { readUploadedAsset } from '@/lib/server/assets'

export async function GET(
  _request: Request,
  routeContext: { params: Promise<{ path: string[] }> }
) {
  const { path } = await routeContext.params
  const asset = await readUploadedAsset(path.join('/'))

  if (!asset) {
    return new Response('Not found', { status: 404 })
  }

  return new Response(asset.body, {
    status: 200,
    headers: {
      'Content-Type': asset.contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
