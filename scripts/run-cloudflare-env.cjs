const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

function stripJsonComments(input) {
  return input
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
}

function loadWranglerConfig() {
  const wranglerPath = path.join(process.cwd(), 'wrangler.jsonc')
  const raw = fs.readFileSync(wranglerPath, 'utf8')
  return Function(`"use strict"; return (${stripJsonComments(raw)});`)()
}

function main() {
  const [, , envName, ...commandParts] = process.argv

  if (!envName || commandParts.length === 0) {
    console.error('Usage: node scripts/run-cloudflare-env.cjs <env> <command...>')
    process.exit(1)
  }

  const config = loadWranglerConfig()
  const envConfig = config.env?.[envName]

  if (!envConfig) {
    console.error(`Unknown Wrangler environment: ${envName}`)
    process.exit(1)
  }

  const mergedEnv = {
    ...process.env,
    ...envConfig.vars,
  }

  const result = spawnSync(commandParts.join(' '), {
    stdio: 'inherit',
    shell: true,
    env: mergedEnv,
  })

  if (typeof result.status === 'number') {
    process.exit(result.status)
  }

  process.exit(1)
}

main()
