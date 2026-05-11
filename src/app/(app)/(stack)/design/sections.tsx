'use client'

import { useState, useSyncExternalStore, type ReactNode } from 'react'
import { AnimatedList, AnimatedListItem } from '@/components/animated-list'
import { Button, ButtonLink, buttonVariants, usePromiseStatus, type ButtonStatus, type ButtonVariant } from '@/components/button'
import { ConfirmActionSlot, ConfirmRow, ConfirmTriggerRow } from '@/components/confirm-row'
import { ExpandableItem } from '@/components/expandable-item'
import { Skel } from '@/components/skeleton'
import { PALETTES, type Palette, type Theme } from '@/lib/types'

// ─── Tokens tab ──────────────────────────────────────────────────────────────

const COLOR_TOKENS: { name: string; cssVar: string; note?: string }[] = [
  { name: 'bg', cssVar: '--bg', note: 'page' },
  { name: 'bg-soft', cssVar: '--bg-soft', note: 'subtle surface' },
  { name: 'paper', cssVar: '--paper', note: 'card' },
  { name: 'ink', cssVar: '--ink', note: 'primary text' },
  { name: 'ink-soft', cssVar: '--ink-soft', note: 'secondary text' },
  { name: 'ink-faint', cssVar: '--ink-faint', note: 'labels, hints' },
  { name: 'sage', cssVar: '--sage', note: 'primary accent' },
  { name: 'sage-soft', cssVar: '--sage-soft' },
  { name: 'clay', cssVar: '--clay', note: 'destructive accent' },
  { name: 'clay-soft', cssVar: '--clay-soft' },
  { name: 'sky', cssVar: '--sky' },
  { name: 'line', cssVar: '--line', note: 'borders' }
]

function subscribeDocumentAttribute(attr: string) {
  return (cb: () => void) => {
    const observer = new MutationObserver(cb)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: [`data-${attr}`] })
    return () => observer.disconnect()
  }
}

function readTheme(): Theme {
  return (document.documentElement.dataset.theme as Theme) || 'system'
}
function readPalette(): Palette {
  return (document.documentElement.dataset.palette as Palette) || 'default'
}
function writeTheme(t: Theme) {
  document.documentElement.dataset.theme = t
}
function writePalette(p: Palette) {
  document.documentElement.dataset.palette = p
}

export function ThemePaletteSection() {
  const theme = useSyncExternalStore(subscribeDocumentAttribute('theme'), readTheme, () => 'system' as Theme)
  const palette = useSyncExternalStore(subscribeDocumentAttribute('palette'), readPalette, () => 'default' as Palette)

  return (
    <Section
      label='theme & palette'
      hint='Live preview. Resets on reload.'
    >
      <div className='grid grid-cols-3 gap-2'>
        {(['light', 'dark', 'system'] as Theme[]).map((t) => (
          <Button
            key={t}
            variant={theme === t ? 'primary' : 'secondary'}
            size='sm'
            fullWidth
            onClick={() => writeTheme(t)}
          >
            {t}
          </Button>
        ))}
      </div>

      <div className='mt-3 grid grid-cols-3 gap-2'>
        {(Object.keys(PALETTES) as Palette[]).map((p) => (
          <Button
            key={p}
            variant={palette === p ? 'primary' : 'secondary'}
            size='sm'
            fullWidth
            onClick={() => writePalette(p)}
          >
            {PALETTES[p].label.toLowerCase()}
          </Button>
        ))}
      </div>
    </Section>
  )
}

export function ColorTokensSection() {
  return (
    <Section label='color tokens'>
      <div className='border-line bg-paper grid grid-cols-1 divide-y divide-[var(--line)] overflow-hidden rounded-xl border'>
        {COLOR_TOKENS.map((c) => (
          <div
            key={c.name}
            className='flex items-center gap-3 px-3 py-2'
          >
            <span
              className='border-line h-7 w-7 shrink-0 rounded-md border'
              style={{ background: `var(${c.cssVar})` }}
              aria-hidden
            />
            <div className='flex min-w-0 flex-1 flex-col'>
              <span className='font-mono text-xs'>{c.name}</span>
              {c.note && <span className='text-ink-faint text-[10px]'>{c.note}</span>}
            </div>
            <span className='text-ink-faint font-mono text-[10px]'>{c.cssVar}</span>
          </div>
        ))}
      </div>
    </Section>
  )
}

export function TypographySection() {
  return (
    <Section label='typography'>
      <div className='border-line bg-paper flex flex-col gap-4 rounded-xl border p-4'>
        <div>
          <p className='font-display text-3xl leading-tight tracking-tight'>
            Aviões <span className='text-sage italic'>no céu</span>
          </p>
          <p className='text-ink-faint mt-1 font-mono text-[11px]'>Fraunces · display</p>
        </div>
        <div>
          <p className='text-ink text-sm'>The quick brown airplane jumps over the lazy cloud.</p>
          <p className='text-ink-faint mt-1 font-mono text-[11px]'>Geist Sans · body</p>
        </div>
        <div>
          <p className='font-mono text-base tracking-wider'>1 234 567 890</p>
          <p className='text-ink-faint mt-1 font-mono text-[11px]'>Geist Mono · numerals</p>
        </div>
      </div>
    </Section>
  )
}

// ─── Buttons tab ─────────────────────────────────────────────────────────────

const VARIANT_LABELS: Record<ButtonVariant, string> = {
  primary: 'primary',
  secondary: 'secondary',
  destructive: 'destructive',
  'destructive-outline': 'destructive-outline',
  row: 'row',
  'row-accent': 'row-accent',
  ghost: 'ghost',
  'ghost-destructive': 'ghost-destructive'
}

const VARIANTS = Object.keys(VARIANT_LABELS) as ButtonVariant[]

export function VariantsSection() {
  return (
    <Section
      label='variants'
      hint={`${VARIANTS.length} chrome variants, all md size`}
    >
      <div className='flex flex-col gap-2'>
        {VARIANTS.map((v) => (
          <Button
            key={v}
            variant={v}
            size='md'
            fullWidth
            trailing={v === 'row' || v === 'row-accent' || v === 'ghost-destructive' ? <span className='text-ink-faint text-xs'>→</span> : null}
          >
            {VARIANT_LABELS[v]}
          </Button>
        ))}
      </div>
    </Section>
  )
}

export function SizesSection() {
  return (
    <Section
      label='sizes'
      hint='xs / sm / md / lg'
    >
      <div className='flex flex-col gap-2'>
        <Button
          variant='primary'
          size='xs'
          fullWidth
        >
          xs · h-10
        </Button>
        <Button
          variant='primary'
          size='sm'
          fullWidth
        >
          sm · min-h-11
        </Button>
        <Button
          variant='primary'
          size='md'
          fullWidth
        >
          md · h-12
        </Button>
        <Button
          variant='primary'
          size='lg'
          fullWidth
        >
          lg · min-h-14
        </Button>
      </div>
    </Section>
  )
}

export function ShapesSection() {
  return (
    <Section
      label='shapes'
      hint='rounded / pill / square'
    >
      <div className='flex flex-col gap-2'>
        <Button
          variant='secondary'
          size='md'
          shape='rounded'
          fullWidth
        >
          rounded
        </Button>
        <Button
          variant='secondary'
          size='md'
          shape='pill'
          fullWidth
        >
          pill
        </Button>
        <Button
          variant='secondary'
          size='md'
          shape='square'
          fullWidth
        >
          square (no radius)
        </Button>
      </div>
    </Section>
  )
}

export function AlignmentSection() {
  return (
    <Section
      label='alignment'
      hint='center / between / start, with leading + trailing'
    >
      <div className='flex flex-col gap-2'>
        <Button
          variant='secondary'
          size='md'
          fullWidth
          align='center'
          leading={<span aria-hidden>←</span>}
          trailing={<span aria-hidden>→</span>}
        >
          center
        </Button>
        <Button
          variant='secondary'
          size='md'
          fullWidth
          align='between'
          leading={<span aria-hidden>←</span>}
          trailing={<span aria-hidden>→</span>}
        >
          between
        </Button>
        <Button
          variant='secondary'
          size='md'
          fullWidth
          align='start'
          leading={<span aria-hidden>←</span>}
          trailing={<span aria-hidden>→</span>}
        >
          start
        </Button>
      </div>
    </Section>
  )
}

export function StatesSection() {
  const states: ButtonStatus[] = ['idle', 'pending', 'success', 'error']
  return (
    <Section
      label='status'
      hint='Static states with pending/success/error labels'
    >
      <div className='flex flex-col gap-2'>
        {states.map((s) => (
          <Button
            key={s}
            variant='primary'
            size='md'
            fullWidth
            status={s}
            pendingLabel='Working…'
            successLabel='Saved'
            errorLabel='Failed'
          >
            {s}
          </Button>
        ))}
      </div>
    </Section>
  )
}

export function PromiseDemoSection() {
  const success = usePromiseStatus({ resetMs: 1800 })
  const failure = usePromiseStatus({ resetMs: 1800 })

  return (
    <Section
      label='promise status (interactive)'
      hint='usePromiseStatus drives the chrome and resets after 1.8s'
    >
      <div className='flex flex-col gap-2'>
        <Button
          variant='primary'
          size='md'
          fullWidth
          status={success.status}
          pendingLabel='Saving…'
          successLabel='Saved'
          errorLabel='Failed'
          onClick={() =>
            success.run(async () => {
              await new Promise((r) => setTimeout(r, 900))
            })
          }
        >
          Trigger success
        </Button>
        <Button
          variant='destructive'
          size='md'
          fullWidth
          status={failure.status}
          pendingLabel='Working…'
          successLabel='Done'
          errorLabel='Could not delete'
          onClick={() =>
            failure.run(async () => {
              await new Promise((_, rej) => setTimeout(() => rej(new Error('boom')), 900))
            })
          }
        >
          Trigger error
        </Button>
      </div>
    </Section>
  )
}

export function ButtonLinkSection() {
  return (
    <Section
      label='ButtonLink'
      hint='next/link wrapper accepting the same variant props'
    >
      <div className='flex flex-col gap-2'>
        <ButtonLink
          href='/design'
          variant='primary'
          size='md'
          fullWidth
        >
          Primary link
        </ButtonLink>
        <ButtonLink
          href='/design'
          variant='row'
          size='md'
          fullWidth
          trailing={<span className='text-ink-faint text-xs'>→</span>}
        >
          Row link
        </ButtonLink>
        <ButtonLink
          href='/design'
          variant='secondary'
          size='sm'
          shape='pill'
          className='self-start'
          leading={<span aria-hidden>←</span>}
        >
          Back link
        </ButtonLink>
      </div>
      <pre className='border-line bg-paper text-ink-soft mt-3 overflow-x-auto rounded-xl border p-3 font-mono text-[11px] leading-relaxed'>
        {`buttonVariants({ variant: 'primary', size: 'md' })\n→ "${buttonVariants({ variant: 'primary', size: 'md' })}"`}
      </pre>
    </Section>
  )
}

// ─── Components tab ──────────────────────────────────────────────────────────

export function SkeletonSection() {
  return (
    <Section
      label='skeleton (Skel)'
      hint='Animate-pulse placeholder'
    >
      <div className='flex flex-col gap-2'>
        <Skel className='h-12 w-full rounded-xl' />
        <Skel className='h-6 w-1/2 rounded-md' />
        <Skel className='h-4 w-24 rounded-md' />
      </div>
    </Section>
  )
}

export function ExpandableSection() {
  const [items, setItems] = useState([
    { id: 'a', label: 'Boeing 747' },
    { id: 'b', label: 'Cessna 172' },
    { id: 'c', label: 'Embraer E190' }
  ])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  return (
    <Section
      label='ExpandableItem + ConfirmRow + AnimatedList'
      hint='Tap ⋯ to expand. Confirm to remove.'
    >
      <AnimatedList className='flex flex-col gap-2'>
        {items.map((item) => {
          const expanded = expandedId === item.id
          const confirming = confirmingId === item.id
          return (
            <AnimatedListItem key={item.id}>
              <ExpandableItem
                expanded={expanded}
                onToggle={() => {
                  setExpandedId((prev) => (prev === item.id ? null : item.id))
                  setConfirmingId(null)
                }}
                toggleAriaLabel='Actions'
                main={
                  <div className='flex flex-1 flex-col gap-0.5 px-5 py-3.5'>
                    <span className='text-ink text-sm'>{item.label}</span>
                    <span className='text-ink-faint text-xs'>id: {item.id}</span>
                  </div>
                }
              >
                <ConfirmActionSlot>
                  {confirming ?
                    <ConfirmRow
                      key='confirm'
                      label={`Remove ${item.label}?`}
                      busy={false}
                      cancelLabel='cancel'
                      confirmLabel='remove'
                      onCancel={() => setConfirmingId(null)}
                      onConfirm={() => {
                        setItems((prev) => prev.filter((i) => i.id !== item.id))
                        setConfirmingId(null)
                        setExpandedId(null)
                      }}
                    />
                  : <ConfirmTriggerRow
                      key='trigger'
                      label='remove'
                      icon='×'
                      onClick={() => setConfirmingId(item.id)}
                    />
                  }
                </ConfirmActionSlot>
              </ExpandableItem>
            </AnimatedListItem>
          )
        })}
      </AnimatedList>
      {items.length === 0 && (
        <div className='mt-3'>
          <Button
            variant='secondary'
            size='sm'
            fullWidth
            onClick={() =>
              setItems([
                { id: 'a', label: 'Boeing 747' },
                { id: 'b', label: 'Cessna 172' },
                { id: 'c', label: 'Embraer E190' }
              ])
            }
          >
            Reset list
          </Button>
        </div>
      )}
    </Section>
  )
}

// ─── Section helper ──────────────────────────────────────────────────────────

export function Section({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <section className='flex flex-col gap-3'>
      <div className='flex flex-col gap-0.5'>
        <h2 className='text-ink-faint font-mono text-[11px]'>{label}</h2>
        {hint && <p className='text-ink-faint text-[11px]'>{hint}</p>}
      </div>
      {children}
    </section>
  )
}
