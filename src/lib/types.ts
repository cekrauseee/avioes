export type Identity = 'henrique' | 'pietra'

export type AirplaneEvent = {
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

export type QueueOp =
  | { id: string; op: 'add'; who: Identity; ts: number }
  | { id: string; op: 'undo'; who: Identity }

export const IDENTITIES: Record<
  Identity,
  {
    label: string
    bg: string
    text: string
    bgSoft: string
    border: string
  }
> = {
  henrique: {
    label: 'Henrique',
    bg: 'bg-sage',
    text: 'text-sage',
    bgSoft: 'bg-sage-soft',
    border: 'border-sage'
  },
  pietra: {
    label: 'Pietra',
    bg: 'bg-clay',
    text: 'text-clay',
    bgSoft: 'bg-clay-soft',
    border: 'border-clay'
  }
}
