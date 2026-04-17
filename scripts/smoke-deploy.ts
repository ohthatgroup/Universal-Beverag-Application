import fs from 'node:fs'

type SmokeCheck = {
  label: string
  url: string
  expectedStatus?: number
  expectedLocationPrefix?: string
}

type CliArgs = {
  appUrl?: string
  inviteUrl?: string
  portalUrl?: string
}

function loadLocalEnvFiles() {
  if (fs.existsSync('.env')) {
    process.loadEnvFile?.('.env')
  }

  if (fs.existsSync('.env.local')) {
    process.loadEnvFile?.('.env.local')
  }
}

function readCliArgs(argv: string[]): CliArgs {
  const args: CliArgs = {}

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    const next = argv[index + 1]

    if (!next) continue

    if (arg === '--app-url') {
      args.appUrl = next
      index += 1
      continue
    }

    if (arg === '--invite-url') {
      args.inviteUrl = next
      index += 1
      continue
    }

    if (arg === '--portal-url') {
      args.portalUrl = next
      index += 1
    }
  }

  return args
}

function requireUrl(name: string, override?: string): string {
  const value = override?.trim() || process.env[name]?.trim()
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return new URL(value).toString()
}

function optionalUrl(name: string, override?: string): string | null {
  const value = override?.trim() || process.env[name]?.trim()
  if (!value) return null
  return new URL(value).toString()
}

async function runCheck(check: SmokeCheck) {
  const response = await fetch(check.url, {
    method: 'GET',
    redirect: 'manual',
    headers: {
      'user-agent': 'universal-beverage-app-smoke/1.0',
    },
  })

  const location = response.headers.get('location')

  if (typeof check.expectedStatus === 'number' && response.status !== check.expectedStatus) {
    throw new Error(
      `${check.label} failed: expected status ${check.expectedStatus}, received ${response.status} for ${check.url}`
    )
  }

  if (check.expectedLocationPrefix) {
    if (!location) {
      throw new Error(`${check.label} failed: expected redirect location for ${check.url}`)
    }

    const absoluteLocation = new URL(location, check.url).toString()
    if (!absoluteLocation.startsWith(check.expectedLocationPrefix)) {
      throw new Error(
        `${check.label} failed: expected redirect to start with ${check.expectedLocationPrefix}, received ${absoluteLocation}`
      )
    }
  }

  return {
    label: check.label,
    url: check.url,
    status: response.status,
    location,
  }
}

async function main() {
  loadLocalEnvFiles()
  const cliArgs = readCliArgs(process.argv.slice(2))

  const appUrl = requireUrl('SMOKE_APP_URL', cliArgs.appUrl)
  const inviteUrl = optionalUrl('SMOKE_INVITE_URL', cliArgs.inviteUrl)
  const portalUrl = optionalUrl('SMOKE_PORTAL_URL', cliArgs.portalUrl)

  const checks: SmokeCheck[] = [
    {
      label: 'admin login page',
      url: new URL('/auth/login', appUrl).toString(),
      expectedStatus: 200,
    },
    {
      label: 'password reset page',
      url: new URL('/auth/reset-password', appUrl).toString(),
      expectedStatus: 200,
    },
    {
      label: 'legacy auth callback redirect',
      url: new URL('/auth/callback?next=%2Fauth%2Freset-password', appUrl).toString(),
      expectedStatus: 307,
      expectedLocationPrefix: new URL('/auth/reset-password', appUrl).toString(),
    },
  ]

  if (inviteUrl) {
    checks.push({
      label: 'staff invite landing URL',
      url: inviteUrl,
      expectedStatus: 200,
    })
  }

  if (portalUrl) {
    checks.push({
      label: 'customer portal landing URL',
      url: portalUrl,
      expectedStatus: 200,
    })
  }

  const results = []
  for (const check of checks) {
    results.push(await runCheck(check))
  }

  console.log(JSON.stringify({ appUrl, results }, null, 2))
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(message)
  process.exit(1)
})
