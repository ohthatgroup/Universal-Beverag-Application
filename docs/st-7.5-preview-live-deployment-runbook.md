# ST-7.5 Preview + Live Deployment Runbook

## Status

- Preview deploy: complete
- Production deploy wiring: complete
- Production remote verification: run from an authenticated PowerShell shell before broad traffic use

## Cloudflare Worker Names

- Preview: `universal-beverage-app-preview`
- Production: `universal-beverage-app`

## workers.dev URLs

- Preview: `https://universal-beverage-app-preview.inbox-23c.workers.dev`
- Production: `https://universal-beverage-app.inbox-23c.workers.dev`

## Bound Resources

- Preview Hyperdrive: `640cc4f553704d8498c42ab0d5b060cd`
- Production Hyperdrive: `698855f267e94931ac3823501d3f0806`
- Preview R2 bucket: `universal-beverage-app-preview-assets`
- Production R2 bucket: `universal-beverage-app-assets`

## Required Secrets Per Environment

- `NEON_AUTH_COOKIE_SECRET`
- `RESEND_API_KEY`
- `NEON_API_KEY`
- `TURNSTILE_SECRET_KEY` when Turnstile is enabled

## What Unblocked Cloudflare Free

The original OpenNext Worker exceeded the Cloudflare Workers free-plan gzip limit.
Removing Sentry runtime integration from the Cloudflare build path reduced the packaged Worker to approximately `1606 KiB` gzip, which allowed the preview upload to succeed.

The affected integration points were:

- `next.config.mjs`
- `instrumentation.ts`
- `instrumentation-client.ts`
- `app/global-error.tsx`

## Preview Commands

Run these from an authenticated PowerShell shell with `CLOUDFLARE_API_TOKEN` set:

```powershell
npm run deploy:preview
npx wrangler versions deploy 3b82faab-7336-454b-97ad-0bfcde65b3f9@100 --env preview -y
npm run triggers:preview
npm run smoke:preview
```

## Preview Verification Record

- Uploaded preview Worker version: `3b82faab-7336-454b-97ad-0bfcde65b3f9`
- `workers.dev` trigger applied: yes
- Smoke checks passed:
  - `/auth/login`
  - `/auth/reset-password`
  - `/auth/callback?next=/auth/reset-password`

## Production Commands

Run these from the same authenticated PowerShell shell:

```powershell
npm run deploy:production:live
npm run smoke:production
```

`deploy:production:live` performs the Worker deploy and then reapplies the `workers.dev` trigger so the environment route stays live.
The deploy scripts inject the matching Wrangler environment vars into the `next build` step so prerendered auth pages use the correct `https://...workers.dev` origin during production builds.

## Production Verification Checklist

- `/auth/login` returns `200`
- `/auth/reset-password` returns `200`
- `/auth/callback?next=/auth/reset-password` returns `307` to `/auth/reset-password`
- one real admin invite email is received and opens the accept-invite page
- one real password reset email is received and opens the reset flow
- one real customer portal link opens the expected `/portal/[token]` route

## Rollback

If the production deploy fails after upload or breaks live traffic:

```powershell
npm run rollback:production
npm run triggers:production
```

If the rollback path changes the active Worker version but the route still looks stale, redeploy the production trigger again.

## Known Notes

- `wrangler secret put` can create a placeholder Worker before the first real deploy. That is safe, but the real Worker code and bindings are only present after a deploy.
- `wrangler triggers deploy` was required to make the environment-specific `workers.dev` hostname respond after the initial preview rollout.
- `scripts/smoke-deploy.ts` supports either environment variables or CLI flags so preview and production smoke runs are repeatable from `package.json`.
