import type { Prompt } from '../../types'

/** Evergreen "Create" affordance for the Announcements page +
 *  dashboard. Drawer wraps the existing `<AnnouncementDialog>`. */
export function newAnnouncementPrompt(): Prompt {
  return {
    id: 'evergreen/new-announcement',
    category: 'evergreen',
    kind: 'new-announcement',
    severity: 'info',
    title: 'New announcement or deal',
    body: 'Pick a content type, target groups, and dates.',
    subjects: [],
    count: 0,
    cta: 'New',
    action: { kind: 'drawer', drawerKind: 'new-announcement' },
  }
}
