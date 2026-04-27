// Legacy adapter — converts old-shape `Prompt` rows into new-shape
// `Moment` rows so the fade-down renderer has a single contract.
//
// New resolvers should emit `Moment` directly. This adapter exists
// only to migrate the six existing prompts (default-group-bucket,
// stale-customers, first-order-welcome [stub], stale-drafts,
// expiring-deals, uncovered-groups, customers-with-missing-info,
// products-with-missing-info, plus evergreen creates) without
// rewriting them in one swing.
//
// The adapter writes hand-tuned narratives + primary/secondary
// doorways for each known prompt `kind`. Anything it doesn't
// recognize falls through to a calm default.

import type {
  Doorway,
  Moment,
  MomentCategory,
  Prompt,
  PromptCategory,
  Subject,
} from './types'

interface NarrativeShape {
  /** Function that builds the narrative sentence given a count + subjects. */
  narrative: (count: number, subjects: Subject[]) => string
  /** When string ("2 hours ago", "this week"…). */
  when?: string
  /** Primary doorway — replaces the prompt's single CTA. */
  primary: (prompt: Prompt) => Doorway
  /** Secondary doorways — additional verbs the same state unlocks. */
  secondary?: (prompt: Prompt) => Doorway[]
  /** Override the moment category. Defaults from prompt.category. */
  category?: MomentCategory
}

/**
 * Hand-tuned moment shapes per prompt kind. Voice = salesperson aloud.
 */
const KIND_SHAPES: Record<string, NarrativeShape> = {
  'default-group-bucket': {
    narrative: (count) =>
      count === 1
        ? "1 customer is still in the Default group."
        : `${count} customers are still in the Default group.`,
    when: 'segmenting',
    primary: (p) => ({
      label: p.subjects.length === 1 ? 'Move them to a real group' : 'Sort them into groups',
      action: { kind: 'drawer', drawerKind: 'bulk-assign-group' },
    }),
    secondary: () => [
      {
        label: 'Make a new group first',
        action: { kind: 'href', href: '/admin/customers/groups' },
      },
    ],
  },

  'customers-with-missing-info': {
    narrative: (count) =>
      count === 1
        ? "1 customer's profile is missing details."
        : `${count} customers are missing some details.`,
    when: 'profile cleanup',
    primary: () => ({
      label: 'Fill in what’s missing',
      action: { kind: 'drawer', drawerKind: 'customers-missing-info' },
    }),
  },

  'products-with-missing-info': {
    narrative: (count) =>
      count === 1
        ? "1 product is missing image, brand, or pack details."
        : `${count} products are missing image, brand, or pack details.`,
    when: 'catalog cleanup',
    primary: () => ({
      label: 'Tidy up the catalog',
      action: { kind: 'drawer', drawerKind: 'products-missing-info' },
    }),
  },

  'stale-customers': {
    narrative: (count) =>
      count === 1
        ? "1 customer hasn’t ordered in a while."
        : `${count} customers haven’t ordered in a while.`,
    when: 'this week',
    primary: () => ({
      label: 'Reach out',
      action: {
        kind: 'drawer',
        drawerKind: 'outreach',
        payload: { templateKind: 'stale-customers' },
      },
    }),
    secondary: () => [
      {
        label: 'Pin a one-off deal for them',
        action: { kind: 'href', href: '/admin/announcements' },
      },
    ],
  },

  'stale-drafts': {
    narrative: (count) =>
      count === 1
        ? "1 draft has been sitting untouched for over a week."
        : `${count} drafts have been sitting untouched for over a week.`,
    when: 'order cleanup',
    primary: () => ({
      label: 'Nudge or close them',
      action: { kind: 'drawer', drawerKind: 'stale-drafts' },
    }),
  },

  'expiring-deals': {
    narrative: (count) =>
      count === 1
        ? "1 deal is about to expire."
        : `${count} deals are about to expire.`,
    when: 'this week',
    primary: () => ({
      label: 'Extend or let them lapse',
      action: { kind: 'drawer', drawerKind: 'bulk-extend-deals' },
    }),
  },

  'uncovered-groups': {
    narrative: (count) =>
      count === 1
        ? "1 group has no deals targeting it right now."
        : `${count} groups have no deals targeting them right now.`,
    when: 'opportunity',
    primary: () => ({
      label: 'Pin a deal for them',
      action: { kind: 'drawer', drawerKind: 'pin-deal-for-groups' },
    }),
  },

  // Evergreens — the create rail at the bottom of the page.
  'new-customer': {
    narrative: () => 'Add a customer',
    primary: () => ({
      label: 'New customer',
      action: { kind: 'drawer', drawerKind: 'new-customer' },
    }),
    category: 'any-time',
  },
  'new-order': {
    narrative: () => 'Open a draft',
    primary: () => ({
      label: 'New order',
      action: { kind: 'drawer', drawerKind: 'pick-customer-and-open-draft' },
    }),
    category: 'any-time',
  },
  'new-product': {
    narrative: () => 'Add a product',
    primary: () => ({
      label: 'New product',
      action: { kind: 'drawer', drawerKind: 'new-product' },
    }),
    category: 'any-time',
  },
  'new-announcement': {
    narrative: () => 'Pin a deal or announcement',
    primary: () => ({
      label: 'New deal',
      action: { kind: 'drawer', drawerKind: 'new-announcement' },
    }),
    category: 'any-time',
  },
}

/** Convert a legacy Prompt into a Moment. */
export function legacyPromptToMoment(prompt: Prompt): Moment {
  const shape = KIND_SHAPES[prompt.kind]
  const category: MomentCategory =
    shape?.category ??
    (prompt.category === 'evergreen' ? 'any-time' : mapLegacyCategory(prompt.category))

  if (!shape) {
    return {
      id: prompt.id,
      category,
      kind: prompt.kind,
      narrative: prompt.title.endsWith('.') ? prompt.title : `${prompt.title}.`,
      subjects: prompt.subjects,
      primary: { label: prompt.cta, action: prompt.action },
      secondary: [],
      weight: weightFor(prompt),
    }
  }

  const primary = shape.primary(prompt)
  const secondary = (shape.secondary?.(prompt) ?? []).slice(0, 3)

  return {
    id: prompt.id,
    category,
    kind: prompt.kind,
    narrative: shape.narrative(prompt.count, prompt.subjects),
    when: shape.when,
    subjects: prompt.subjects,
    primary,
    secondary,
    weight: weightFor(prompt),
  }
}

/** Compute a weight in [0, 1] from a legacy prompt's category +
 *  subject count. New resolvers should compute this themselves
 *  using freshness × event-priority. */
function weightFor(prompt: Prompt): number {
  const base: Record<PromptCategory, number> = {
    urgent: 0.95,
    opportunity: 0.7,
    celebration: 0.65,
    hygiene: 0.4,
    evergreen: 0.1,
  }
  const sizeBump = Math.min(0.05, prompt.count * 0.005)
  return Math.min(1, base[prompt.category] + sizeBump)
}

function mapLegacyCategory(category: PromptCategory): MomentCategory {
  switch (category) {
    case 'urgent':
    case 'opportunity':
    case 'celebration':
      return 'just-in'
    case 'hygiene':
      return 'worth-a-look'
    case 'evergreen':
      return 'any-time'
  }
}
