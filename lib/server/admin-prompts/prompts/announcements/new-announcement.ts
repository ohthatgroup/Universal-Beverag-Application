import type { Moment } from '../../types'

/** Evergreen "Create" affordance for the Announcements page +
 *  dashboard. Drawer wraps the existing `<AnnouncementDialog>`. */
export function newAnnouncementPrompt(): Moment {
  return {
    id: 'any-time/new-announcement',
    category: 'any-time',
    kind: 'new-announcement',
    narrative: 'Pin a deal or announcement',
    subjects: [],
    primary: {
      label: 'New deal',
      action: { kind: 'drawer', drawerKind: 'new-announcement' },
    },
    secondary: [],
    weight: 0.1,
  }
}
