# Universal Beverages App

Universal Beverages is a Next.js 15 application for beverage ordering and admin operations.

## Stack

- Next.js 15 App Router
- React 18
- Neon Postgres
- Neon Auth
- Cloudflare Workers via OpenNext
- Resend
- Tailwind CSS + shadcn/ui
- Vitest + Playwright

## Runtime

- Admin routes live under `/admin/*`
- Customer portal routes live under `/portal/[token]/*`
- Admin auth is email/password through Neon Auth
- Customer access is bearer-link based

## Local Development

```bash
npm ci
npm run dev
```

Copy `.env.local.example` to `.env.local` and fill the active runtime values:

- `DATABASE_URL`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_ASSET_BASE_URL`
- `NEON_AUTH_BASE_URL`
- `NEON_AUTH_COOKIE_SECRET`
- `NEON_PROJECT_ID`
- `NEON_BRANCH_ID`
- `NEON_API_KEY`
- `RESEND_API_KEY`
- `INVITES_FROM_EMAIL`

## Commands

```bash
npm run dev
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run test:e2e:certification
npm run test:e2e:certification:preview
npm run test:e2e:certification:production
npm run build
```

Database/bootstrap:

```bash
npm run db:reset
npm run db:migrate
npm run db:verify
npm run db:import
npm run db:provision
npm run db:smoke
npm run ci:prepare-db
```

Workers/deploy:

```bash
npm run cf:check:preview
npm run cf:check:production
npm run deploy:preview
npm run deploy:production
npm run deploy:production:live
npm run triggers:preview
npm run triggers:production
npm run rollback:production
npm run smoke:deploy
npm run smoke:preview
npm run smoke:production
```

Deployment runbook:

- `docs/st-7.5-preview-live-deployment-runbook.md`
- `docs/st-9-full-touchpoint-flow-certification.md`

## Repo Notes

- `db/` is the active migration source
- `.env.local.example` is the canonical env template
- `.next`, `.open-next`, `.wrangler`, `output`, `test-results`, and `.playwright-cli` are local/generated artifacts and should stay untracked
