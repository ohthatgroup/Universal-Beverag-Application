import { AnnouncementCard } from '@/components/portal/announcement-card'

export type AnnouncementContentType =
  | 'text'
  | 'image'
  | 'image_text'
  | 'product'
  | 'specials_grid'

export interface Announcement {
  id: string
  content_type: AnnouncementContentType
  title: string | null
  body: string | null
  image_url: string | null
  cta_label: string | null
  cta_url: string | null
  product_id: string | null
  product_ids: string[]
  badge_overrides: Record<string, string>
  audience_tags: string[]
  starts_at: string | null
  ends_at: string | null
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

interface AnnouncementsStackProps {
  announcements: Announcement[]
  token: string
  primaryDraftOrderId: string | null
  showPrices: boolean
}

export async function AnnouncementsStack({
  announcements,
  token,
  primaryDraftOrderId,
  showPrices,
}: AnnouncementsStackProps) {
  if (announcements.length === 0) return null

  return (
    <div className="mx-auto w-full max-w-[600px] space-y-4">
      {announcements.map((a) => (
        <AnnouncementCard
          key={a.id}
          announcement={a}
          token={token}
          primaryDraftOrderId={primaryDraftOrderId}
          showPrices={showPrices}
        />
      ))}
    </div>
  )
}
