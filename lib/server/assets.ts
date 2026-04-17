import { getCloudflareContext } from '@opennextjs/cloudflare'

const ASSET_ROOT = 'uploads'
const ALLOWED_FOLDERS = new Set(['products', 'brands', 'pallets'])

declare global {
  interface CloudflareEnv {
    ASSET_BUCKET?: {
      put(
        key: string,
        value: ArrayBuffer | ArrayBufferView | ReadableStream,
        options?: { httpMetadata?: { contentType?: string } }
      ): Promise<void>
      get(
        key: string
      ): Promise<
        | {
            body: ReadableStream | null
            arrayBuffer(): Promise<ArrayBuffer>
            httpMetadata?: { contentType?: string }
          }
        | null
      >
    }
  }
}

function normalizeFolder(folder: string) {
  const trimmed = folder.trim().toLowerCase()
  if (!ALLOWED_FOLDERS.has(trimmed)) {
    throw new Error(`Folder must be one of: ${Array.from(ALLOWED_FOLDERS).join(', ')}`)
  }
  return trimmed
}

function sanitizeBaseName(name: string) {
  return name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50) || 'upload'
}

function sanitizeExt(name: string) {
  return name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin'
}

function normalizePath(rawPath: string) {
  const segments = rawPath
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)

  if (segments.length < 2) {
    throw new Error('Invalid asset path')
  }

  const [folder, ...rest] = segments
  if (!ALLOWED_FOLDERS.has(folder)) {
    throw new Error('Invalid asset folder')
  }

  if (rest.some((segment) => segment === '.' || segment === '..')) {
    throw new Error('Invalid asset path')
  }

  return `${folder}/${rest.join('/')}`
}

export function buildAssetUrl(assetPath: string) {
  return `/${ASSET_ROOT}/${assetPath.split('/').map(encodeURIComponent).join('/')}`
}

async function resolveBucket() {
  const context = await getCloudflareContext({ async: true }).catch(() => null)
  return context?.env?.ASSET_BUCKET ?? null
}

async function writeLocalAsset(assetPath: string, bytes: ArrayBuffer) {
  const [{ mkdir, writeFile }, path] = await Promise.all([
    import('node:fs/promises'),
    import('node:path'),
  ])

  const fullPath = path.join(process.cwd(), 'public', ASSET_ROOT, ...assetPath.split('/'))
  await mkdir(path.dirname(fullPath), { recursive: true })
  await writeFile(fullPath, Buffer.from(bytes))
}

async function readLocalAsset(assetPath: string) {
  const [{ readFile }, path] = await Promise.all([
    import('node:fs/promises'),
    import('node:path'),
  ])

  const fullPath = path.join(process.cwd(), 'public', ASSET_ROOT, ...assetPath.split('/'))
  return readFile(fullPath)
}

function contentTypeFromPath(assetPath: string) {
  const ext = assetPath.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    case 'webp':
      return 'image/webp'
    case 'gif':
      return 'image/gif'
    case 'svg':
      return 'image/svg+xml'
    default:
      return 'application/octet-stream'
  }
}

export async function storeUploadedAsset(file: File, folder: string) {
  const normalizedFolder = normalizeFolder(folder)
  const timestamp = Date.now()
  const assetPath = `${normalizedFolder}/${timestamp}-${sanitizeBaseName(file.name)}.${sanitizeExt(file.name)}`
  const bytes = await file.arrayBuffer()
  const bucket = await resolveBucket()

  if (bucket) {
    await bucket.put(assetPath, bytes, {
      httpMetadata: {
        contentType: file.type || contentTypeFromPath(assetPath),
      },
    })
  } else {
    await writeLocalAsset(assetPath, bytes)
  }

  return {
    assetPath,
    url: buildAssetUrl(assetPath),
  }
}

export async function readUploadedAsset(rawPath: string) {
  const assetPath = normalizePath(rawPath)
  const bucket = await resolveBucket()

  if (bucket) {
    const object = await bucket.get(assetPath)
    if (!object?.body) {
      return null
    }

    return {
      body: object.body,
      contentType: object.httpMetadata?.contentType || contentTypeFromPath(assetPath),
    }
  }

  const file = await readLocalAsset(assetPath).catch(() => null)
  if (!file) {
    return null
  }

  return {
    body: file,
    contentType: contentTypeFromPath(assetPath),
  }
}
