import {
  Activity,
  CupSoda,
  Droplets,
  Leaf,
  MoreHorizontal,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import type { ProductFamily } from '@/lib/server/schemas'

export type FamilyGroupBy = 'size-brand' | 'brand'

export interface FamilyDefinition {
  key: ProductFamily
  label: string
  icon: LucideIcon
  // The grouping the FamilySheet applies inside this family. Soda + Water are
  // pack/size-led; the rest are brand-led.
  defaultGroupBy: FamilyGroupBy
  // Tailwind classes for the FamilyCard icon backplate. Each family has a
  // distinctive hue so customers can pre-attentively jump to a category
  // without reading the label. Kept on the icon tile only — the card
  // surface stays neutral so the page reads calm.
  iconBg: string
  iconFg: string
}

// Ordered as they appear in the BROWSE grid and the pill switcher.
export const FAMILIES: readonly FamilyDefinition[] = [
  {
    key: 'soda',
    label: 'Soda',
    icon: CupSoda,
    defaultGroupBy: 'size-brand',
    iconBg: 'bg-red-100',
    iconFg: 'text-red-600',
  },
  {
    key: 'water',
    label: 'Water',
    icon: Droplets,
    defaultGroupBy: 'size-brand',
    iconBg: 'bg-sky-100',
    iconFg: 'text-sky-600',
  },
  {
    key: 'sports_hydration',
    label: 'Sports & Hydration',
    icon: Activity,
    defaultGroupBy: 'brand',
    iconBg: 'bg-emerald-100',
    iconFg: 'text-emerald-600',
  },
  {
    key: 'tea_juice',
    label: 'Tea & Juice',
    icon: Leaf,
    defaultGroupBy: 'brand',
    iconBg: 'bg-amber-100',
    iconFg: 'text-amber-700',
  },
  {
    key: 'energy_coffee',
    label: 'Energy & Coffee',
    icon: Zap,
    defaultGroupBy: 'brand',
    iconBg: 'bg-violet-100',
    iconFg: 'text-violet-600',
  },
  {
    key: 'other',
    label: 'Other',
    icon: MoreHorizontal,
    defaultGroupBy: 'brand',
    iconBg: 'bg-muted',
    iconFg: 'text-muted-foreground',
  },
] as const

export function getFamilyDefinition(family: ProductFamily): FamilyDefinition {
  return FAMILIES.find((entry) => entry.key === family) ?? FAMILIES[FAMILIES.length - 1]
}
