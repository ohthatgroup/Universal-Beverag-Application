import { expiringDealsPrompt } from '../prompts/announcements/expiring-deals'
import { uncoveredGroupsPrompt } from '../prompts/announcements/uncovered-groups'
import { newAnnouncementPrompt } from '../prompts/announcements/new-announcement'
import type { Moment } from '../types'
import type { DbFacade } from '@/lib/server/db'

export async function getAnnouncementsPageMoments(
  db: DbFacade,
): Promise<Moment[]> {
  const [expiring, uncovered] = await Promise.all([
    expiringDealsPrompt(db),
    uncoveredGroupsPrompt(db),
  ])
  const flat: Moment[] = []
  if (expiring) flat.push(expiring)
  if (uncovered) flat.push(uncovered)
  flat.push(newAnnouncementPrompt())
  return flat.sort((a, b) => b.weight - a.weight)
}
