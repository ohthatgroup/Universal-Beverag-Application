// Default outreach templates + DB-override resolver.
//
// Each prompt kind that uses the generic outreach drawer has a
// default template here. Admins override per-kind via the Settings
// page (slice 5a). The drawer fetches the resolved template via
// `resolveMessageTemplate(kind)`.

import type { DbFacade } from '@/lib/server/db'

export const TEMPLATE_KINDS = [
  'stale-customers',
  'stale-drafts-nudge',
  'first-order-welcome',
  'customer-anniversary',
  'drafts-near-delivery-nudge',
] as const

export type TemplateKind = (typeof TEMPLATE_KINDS)[number]

/** In-code defaults. Voice: ordering-prompt, not CRM celebration. */
export const DEFAULT_TEMPLATES: Record<TemplateKind, string> = {
  'stale-customers':
    "Hey {{businessName}}, ready to restock? It's been {{days}} days — let me know if you want to put together an order.",
  'stale-drafts-nudge':
    "Hey {{businessName}}, your draft for {{deliveryDate}} has been sitting for {{days}} days — can we help you finish it?",
  'first-order-welcome':
    'Hey {{businessName}}, thanks for the first order. Anything we can pencil in for next week?',
  'customer-anniversary':
    "Hey {{businessName}}, just hit your 1-year mark with us. Anniversary order on the house's recommendation? I'll put together a starter list.",
  'drafts-near-delivery-nudge':
    'Hey {{businessName}}, your order for {{deliveryDate}} is delivering soon — submit it when ready, or let me know if you need help.',
}

export function isTemplateKind(value: string): value is TemplateKind {
  return (TEMPLATE_KINDS as readonly string[]).includes(value)
}

/** Returns the override body for `kind` if one exists, else the
 *  in-code default. */
export async function resolveMessageTemplate(
  db: DbFacade,
  kind: TemplateKind,
): Promise<string> {
  const { rows } = await db.query<{ body: string }>(
    `select body from message_templates where kind = $1 limit 1`,
    [kind],
  )
  return rows[0]?.body ?? DEFAULT_TEMPLATES[kind]
}

/** Returns every template's resolved body keyed by kind. Cheap —
 *  one query, ~5 rows max. */
export async function resolveAllMessageTemplates(
  db: DbFacade,
): Promise<Record<TemplateKind, string>> {
  const { rows } = await db.query<{ kind: string; body: string }>(
    `select kind, body from message_templates`,
  )
  const overrides = new Map(rows.map((row) => [row.kind, row.body]))
  const out = { ...DEFAULT_TEMPLATES }
  for (const kind of TEMPLATE_KINDS) {
    const override = overrides.get(kind)
    if (override) out[kind] = override
  }
  return out
}

/** Renders a template with the given variables. Unknown variables
 *  are left as-is so the salesman sees the raw token (signal that
 *  data is missing). */
export function renderTemplate(
  body: string,
  vars: Record<string, string | number | null | undefined>,
): string {
  return body.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = vars[key]
    if (value === null || value === undefined || value === '') return match
    return String(value)
  })
}
