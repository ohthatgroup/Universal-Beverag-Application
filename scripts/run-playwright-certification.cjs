const { spawnSync } = require('node:child_process')
const path = require('node:path')

const target = process.argv[2] ?? 'local'
const passthroughArgs = process.argv.slice(3)

const targetBaseUrls = {
  local: '',
  preview: 'https://universal-beverage-app-preview.inbox-23c.workers.dev',
  production: 'https://universal-beverage-app.inbox-23c.workers.dev',
}

if (!Object.prototype.hasOwnProperty.call(targetBaseUrls, target)) {
  console.error(`Unknown certification target "${target}". Use local, preview, or production.`)
  process.exit(1)
}

const env = { ...process.env }
const explicitBaseUrl = env.PLAYWRIGHT_BASE_URL?.trim() || targetBaseUrls[target]

if (explicitBaseUrl) {
  env.PLAYWRIGHT_BASE_URL = explicitBaseUrl
  env.PLAYWRIGHT_SKIP_WEBSERVER = '1'
}

const localBinary = path.join(
  process.cwd(),
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'playwright.cmd' : 'playwright'
)

const command = localBinary
const args = ['test', 'tests/e2e/certification', ...passthroughArgs]

const result = spawnSync(command, args, {
  cwd: process.cwd(),
  env,
  stdio: 'inherit',
  shell: process.platform === 'win32',
})

if (typeof result.status === 'number') {
  process.exit(result.status)
}

process.exit(1)
