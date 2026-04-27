// Fold + sort helpers for the prompt resolver.
//
// In practice each per-prompt file already returns one folded `Prompt`
// (its own SQL groups subjects). The fold helper is the safety net + the
// public API for any signal that emits multiple rows that should
// coalesce.

import type {
  Prompt,
  PromptCategory,
  PromptSeverity,
  PromptTitleComposer,
  Subject,
} from './types'

export const CATEGORY_ORDER: PromptCategory[] = [
  'urgent',
  'opportunity',
  'celebration',
  'hygiene',
  'evergreen',
]

const CATEGORY_RANK: Record<PromptCategory, number> = CATEGORY_ORDER.reduce(
  (acc, cat, i) => {
    acc[cat] = i
    return acc
  },
  {} as Record<PromptCategory, number>,
)

const SEVERITY_RANK: Record<PromptSeverity, number> = {
  success: 0,
  info: 1,
  warn: 2,
}

/** Canonical category order, then within-category by descending count. */
export function sortByCategoryOrder(prompts: Prompt[]): Prompt[] {
  return [...prompts].sort((a, b) => {
    const catDiff = CATEGORY_RANK[a.category] - CATEGORY_RANK[b.category]
    if (catDiff !== 0) return catDiff
    return b.count - a.count
  })
}

/** Severity max-wins: warn > info > success. */
function maxSeverity(a: PromptSeverity, b: PromptSeverity): PromptSeverity {
  return SEVERITY_RANK[a] >= SEVERITY_RANK[b] ? a : b
}

/** Coalesce candidate prompts by `(category, kind)`. Subjects union'd
 *  in input order, deduped by id. `count` = sum of input counts (so a
 *  resolver that returned a preview slice still surfaces the true
 *  total). Severity = max-wins. Title is recomputed via composer. Body,
 *  cta, action taken from the first input.
 */
export function foldPrompts(
  candidates: Prompt[],
  titleFor: PromptTitleComposer,
): Prompt[] {
  const buckets = new Map<string, Prompt[]>()
  for (const candidate of candidates) {
    const key = `${candidate.category}/${candidate.kind}`
    const existing = buckets.get(key)
    if (existing) existing.push(candidate)
    else buckets.set(key, [candidate])
  }

  const out: Prompt[] = []
  for (const [, group] of buckets) {
    if (group.length === 1) {
      out.push(group[0]!)
      continue
    }
    const first = group[0]!
    const seen = new Set<string>()
    const subjects: Subject[] = []
    let count = 0
    let severity: PromptSeverity = 'success'
    for (const item of group) {
      count += item.count
      severity = maxSeverity(severity, item.severity)
      for (const subject of item.subjects) {
        if (seen.has(subject.id)) continue
        seen.add(subject.id)
        subjects.push(subject)
      }
    }
    out.push({
      ...first,
      severity,
      subjects,
      count,
      title: titleFor(
        { category: first.category, kind: first.kind },
        count,
        subjects[0],
      ),
    })
  }

  return sortByCategoryOrder(out)
}
