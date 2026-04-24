import type { TransitionScene } from '@/domain/types'

// Unsplash-hosted scene images (w=1600&q=80)
const PERSON_SCENES: Record<number, TransitionScene> = {
  7:   { image: 'https://images.unsplash.com/photo-1516849841032-87cbac4d88f7?w=1600&q=80', label: 'AUSTIN',       subLabel: 'Technology · Aerospace' },
  1:   { image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1600&q=80', label: 'SANTA CLARA',  subLabel: 'Semiconductor · AI' },
  6:   { image: 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=1600&q=80', label: 'MENLO PARK',   subLabel: 'Social Media · AI' },
  9:   { image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1600&q=80', label: 'OMAHA',        subLabel: 'Finance · Investment' },
  12:  { image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1600&q=80', label: 'NEW YORK',     subLabel: 'Banking · Finance' },
  61:  { image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1600&q=80', label: 'SAN FRANCISCO', subLabel: 'Artificial Intelligence' },
  66:  { image: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1600&q=80', label: 'SEATTLE',      subLabel: 'E-Commerce · Cloud' },
  67:  { image: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1600&q=80', label: 'SEATTLE',      subLabel: 'Technology · Philanthropy' },
  75:  { image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1600&q=80', label: 'NEW YORK',     subLabel: 'Asset Management · Finance' },
  148: { image: 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=1600&q=80', label: 'BEIJING',      subLabel: "People's Republic of China" },
  3:   { image: 'https://images.unsplash.com/photo-1513326738677-b964603b136d?w=1600&q=80', label: 'MOSCOW',       subLabel: 'Russian Federation' },
  173: { image: 'https://images.unsplash.com/photo-1501466044931-62695aada8e9?w=1600&q=80', label: 'WASHINGTON',   subLabel: 'United States of America' },
  174: { image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1600&q=80', label: 'PARIS',        subLabel: 'French Republic' },
  191: { image: 'https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=1600&q=80', label: 'FRANKFURT',    subLabel: 'European Central Bank' },
  192: { image: 'https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=1600&q=80', label: 'FEDERAL RESERVE', subLabel: 'United States Monetary Policy' },
}

const COMPANY_SCENES: Record<number, TransitionScene> = {
  1:  { image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1600&q=80', label: 'NVIDIA',        subLabel: 'Semiconductor · AI Compute' },
  2:  { image: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1600&q=80', label: 'CUPERTINO',     subLabel: 'Consumer Technology' },
  3:  { image: 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=1600&q=80', label: 'MOUNTAIN VIEW', subLabel: 'Search · Cloud · AI' },
  4:  { image: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1600&q=80', label: 'REDMOND',       subLabel: 'Enterprise Cloud · AI' },
  5:  { image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1600&q=80', label: 'SANTA CLARA',   subLabel: 'E-Commerce · Cloud' },
  7:  { image: 'https://images.unsplash.com/photo-1516849841032-87cbac4d88f7?w=1600&q=80', label: 'AUSTIN',        subLabel: 'Electric Vehicles · Energy' },
  41: { image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1600&q=80', label: 'HSINCHU',       subLabel: 'Semiconductor Manufacturing' },
  42: { image: 'https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=1600&q=80', label: 'DHAHRAN',       subLabel: 'Energy · Petroleum' },
  90: { image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1600&q=80', label: 'BLACKROCK',     subLabel: 'Asset Management' },
}

const FALLBACK: TransitionScene = {
  image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&q=80',
  label: 'INTELLIGENCE',
  subLabel: 'IPM Analysis',
}

export function getScene(id: number, type: 'PERSON' | 'COMPANY' | 'COUNTRY' | 'COMMODITY', name: string): TransitionScene {
  if (type === 'PERSON') return PERSON_SCENES[id] ?? { ...FALLBACK, label: name.toUpperCase() }
  if (type === 'COMPANY') return COMPANY_SCENES[id] ?? { ...FALLBACK, label: name.toUpperCase() }
  return { ...FALLBACK, label: name.toUpperCase() }
}
