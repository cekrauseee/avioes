export type Identity = string

export type Locale = 'pt' | 'en'

export type AirplaneEvent = {
  id: string
  who: Identity
  ts: number
}

export type Streak = {
  who: Identity
  count: number
  startTs: number
  endTs: number
}

export type Theme = 'light' | 'dark' | 'system'

export type Palette = 'default' | 'ocean' | 'lavender' | 'earth' | 'blossom' | 'sky'

export type GroupRole = 'owner' | 'member'

export type GroupMember = {
  userId: string
  name: string
  email: string
  role: GroupRole
}

export type Group = {
  id: string
  name: string
  ownerId: string
}

export type PendingOp =
  | { id: string; kind: 'add-event'; event: AirplaneEvent }
  | { id: string; kind: 'delete-event'; eventId: string }
  | { id: string; kind: 'set-theme'; theme: Theme }
  | { id: string; kind: 'set-palette'; palette: Palette }
  | { id: string; kind: 'set-locale'; locale: Locale }

export type PalettePreview = {
  bg: string
  sage: string
  clay: string
}

export const PALETTES: Record<Palette, { label: string; light: PalettePreview; dark: PalettePreview }> = {
  default: { label: 'Caderno', light: { bg: '#F6F1E7', sage: '#7C9A82', clay: '#C97B5C' }, dark: { bg: '#15191B', sage: '#9CB6A1', clay: '#E59A7E' } },
  ocean: { label: 'Oceano', light: { bg: '#ECF2F6', sage: '#4E8FA8', clay: '#C8754E' }, dark: { bg: '#101A20', sage: '#68A8C0', clay: '#DA886A' } },
  lavender: { label: 'Lavanda', light: { bg: '#F0EBF6', sage: '#7B6EAA', clay: '#C07488' }, dark: { bg: '#161220', sage: '#988AC5', clay: '#D08A9C' } },
  earth: { label: 'Terra', light: { bg: '#F4EEE0', sage: '#8A7A4A', clay: '#B56840' }, dark: { bg: '#1A1610', sage: '#A69860', clay: '#D0804E' } },
  blossom: { label: 'Flor', light: { bg: '#F6EEEF', sage: '#A06880', clay: '#D08860' }, dark: { bg: '#1C1316', sage: '#BE7E98', clay: '#DE9E78' } },
  sky: { label: 'Céu', light: { bg: '#EEF3F8', sage: '#5892AA', clay: '#CC7E50' }, dark: { bg: '#0E161C', sage: '#6EAABC', clay: '#DC9468' } }
}

export const MEMBER_COLORS = [
  { bg: 'bg-sage', text: 'text-sage', bgSoft: 'bg-sage-soft', border: 'border-sage' },
  { bg: 'bg-clay', text: 'text-clay', bgSoft: 'bg-clay-soft', border: 'border-clay' },
  { bg: 'bg-sky', text: 'text-sky', bgSoft: 'bg-sky-soft', border: 'border-sky' }
] as const

export type MemberColor = (typeof MEMBER_COLORS)[number]

export function getMemberColor(userId: string, members: GroupMember[]): MemberColor {
  const index = members.findIndex((m) => m.userId === userId)
  return MEMBER_COLORS[Math.max(0, index) % MEMBER_COLORS.length]
}

export function getMemberName(userId: string, members: GroupMember[]): string {
  return members.find((m) => m.userId === userId)?.name ?? 'Alguém'
}
