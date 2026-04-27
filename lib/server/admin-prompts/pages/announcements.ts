import { expiringDealsPrompt } from '../prompts/announcements/expiring-deals'
import { uncoveredGroupsPrompt } from '../prompts/announcements/uncovered-groups'
import { newAnnouncementPrompt } from '../prompts/announcements/new-announcement'
import { sortByCategoryOrder } from '../fold'
import type { Prompt } from '../types'
import type { DbFacade } from '@/lib/server/db'

export async function getAnnouncementsPagePrompts(
  db: DbFacade,
): Promise<Prompt[]> {
  const [expiring, uncovered] = await Promise.all([
    expiringDealsPrompt(db),
    uncoveredGroupsPrompt(db),
  ])
  const flat: Prompt[] = []
  if (expiring) flat.push(expiring)
  if (uncovered) flat.push(uncovered)
  flat.push(newAnnouncementPrompt())
  return sortByCategoryOrder(flat)
}
