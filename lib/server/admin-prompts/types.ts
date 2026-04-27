// Moment model — a single piece of news from the system to the salesman.
//
// A `Moment` is what gets rendered on the homepage and per-domain pages.
// It's a (subject, narrative, primary-doorway, [secondary-doorways])
// shape with a numeric `weight` that drives BOTH ranking and visual
// volume on the page. The fade-down renderer maps weight to type tier:
//
//   weight ≥ 0.85  →  HEADLINE  (28-32px serif, the page's center of mass)
//   weight ≥ 0.55  →  SUBHEAD   (20-22px sans medium)
//   weight ≥ 0.25  →  BODY      (16-17px sans regular)
//   weight <  0.25 →  FOOTNOTE  (13-14px sans muted)
//
// The previous "Prompt" model and its category/severity scaffolding
// is retained as an alias so legacy resolvers keep compiling during
// the transition; new code should emit Moments directly.

export type MomentCategory =
  | 'just-in' // recent state change — top of the page
  | 'worth-a-look' // lingering signal that hasn't been resolved
  | 'any-time' // create affordances — bottom of the page
  | 'evergreen' // alias for any-time used by legacy code

export interface Subject {
  /** Stable id — used as the row key when a drawer opens. */
  id: string
  /** Headline ("Acme Hardware"). */
  label: string
  /** Optional second line ("28 days · last order Mar 19"). */
  sublabel?: string
}

export type DoorwayAction =
  | { kind: 'href'; href: string }
  | {
      kind: 'drawer'
      /** Lookup key in `promptDrawerRegistry`. */
      drawerKind: string
      /** Optional payload passed to the drawer. */
      payload?: Record<string, unknown>
    }

export interface Doorway {
  /** Hand-tuned label, voiced like a salesperson speaks aloud:
   *  "Send a thank-you", "Build a pallet from this order",
   *  "Reach out", "Pin a Tuesday special". */
  label: string
  action: DoorwayAction
}

export interface Moment {
  /** `${category}/${kind}` — unique within a page's resolver output. */
  id: string
  category: MomentCategory
  /** Stable kind id, e.g. 'just-submitted', 'first-order',
   *  'gone-quiet', 'group-mid-rhythm'. */
  kind: string
  /** Hand-tuned narrative sentence in the salesperson's voice.
   *  Subject name(s) usually inlined; should read as a complete
   *  sentence including punctuation. Example:
   *  "Bob's Pub just submitted a $240 order." */
  narrative: string
  /** Optional human-friendly time tag — "2 hours ago", "yesterday",
   *  "weekly check", "this morning". Rendered in muted type to the
   *  right of the narrative. */
  when?: string
  /** Backing subjects — used by drawer payloads, not always rendered
   *  on the moment line itself. The narrative typically already
   *  names the subject inline. */
  subjects: Subject[]
  /** The single most-likely-wanted action. Rendered as the primary
   *  inked verb beneath the narrative. */
  primary: Doorway
  /** Other actions the same state unlocks. Rendered ghosted after
   *  the lead-in "Or:" beneath the primary verb. Up to 3. */
  secondary: Doorway[]
  /** Drives ranking AND visual tier. 0..1, computed by the resolver
   *  from freshness × event-priority. */
  weight: number
}

// ---- Legacy aliases -------------------------------------------------
//
// Kept so legacy resolver files (`prompts/<domain>/*.ts` written
// against the old `Prompt` shape) keep compiling. Slice 5d cleans
// them up. New resolvers should emit `Moment` directly.

export type PromptCategory =
  | 'urgent'
  | 'opportunity'
  | 'celebration'
  | 'hygiene'
  | 'evergreen'
export type PromptSeverity = 'info' | 'warn' | 'success'
export type PromptAction = DoorwayAction

export interface Prompt {
  id: string
  category: PromptCategory
  kind: string
  severity: PromptSeverity
  title: string
  body?: string
  subjects: Subject[]
  count: number
  cta: string
  action: PromptAction
}

export type PromptTitleComposer = (
  key: { category: PromptCategory; kind: string },
  count: number,
  first: Subject | undefined,
) => string
