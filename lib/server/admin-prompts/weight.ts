// Weight curve for foldable Moments — base priority + a small bump
// proportional to subject count. Capped at 1.0.
//
// Base values used today by domain:
//   0.95  Urgent (e.g. expiring-deals)
//   0.7   Opportunity (e.g. uncovered-groups, stale-customers, default-group-bucket)
//   0.4   Hygiene / cleanup (e.g. stale-drafts, missing-info)
//   0.1   Evergreen (any-time create cards) — count is always 0
//
// `<MomentStream>` maps the resulting weight to a typographic tier:
//   ≥ 0.85  HEADLINE
//   ≥ 0.55  SUBHEAD
//   ≥ 0.25  BODY
//   <  0.25 FOOTNOTE

export function foldedWeight(base: number, count: number): number {
  const sizeBump = Math.min(0.05, count * 0.005)
  return Math.min(1, base + sizeBump)
}
