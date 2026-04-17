const fs = require('node:fs')
const path = require('node:path')

const nextTypesPath = path.join(process.cwd(), '.next', 'types')

try {
  fs.rmSync(nextTypesPath, { recursive: true, force: true })
  console.log(`Removed stale Next.js route types at ${nextTypesPath}`)
} catch (error) {
  if (error && (error.code === 'ENOENT' || error.code === 'EPERM')) {
    console.warn(`Skipped cleanup for ${nextTypesPath}: ${error.code}`)
    process.exit(0)
  }

  console.error(`Failed to remove ${nextTypesPath}`)
  throw error
}
