'use client'

import { AnimatePresence, motion, useReducedMotion, type PanInfo } from 'motion/react'
import { useState, useTransition } from 'react'
import { markIntroSeen } from '../actions'
import { t, type TKey } from '../lib/i18n'
import { applyIntroSeen } from '../lib/offline-store'
import type { Locale } from '../lib/types'
import { Placeholder } from './placeholder'

type Page = {
  eyebrow: string
  titleKey: TKey
  italicKey: TKey
  bodyKey: TKey
  artLabelKey: TKey
  glyph: string
}

const PAGES: Page[] = [
  {
    eyebrow: 'i.',
    titleKey: 'intro.page1.title',
    italicKey: 'intro.page1.italic',
    bodyKey: 'intro.page1.body',
    artLabelKey: 'intro.page1.artLabel',
    glyph: '✈'
  },
  {
    eyebrow: 'ii.',
    titleKey: 'intro.page2.title',
    italicKey: 'intro.page2.italic',
    bodyKey: 'intro.page2.body',
    artLabelKey: 'intro.page2.artLabel',
    glyph: '·'
  },
  {
    eyebrow: 'iii.',
    titleKey: 'intro.page3.title',
    italicKey: 'intro.page3.italic',
    bodyKey: 'intro.page3.body',
    artLabelKey: 'intro.page3.artLabel',
    glyph: '◌'
  }
]

const SLIDE_THRESHOLD = 60

export function Intro({ onDone, locale }: { onDone: () => void; locale: Locale }) {
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState<1 | -1>(1)
  const [leaving, setLeaving] = useState(false)
  const [pending, start] = useTransition()
  const reduce = useReducedMotion()

  const total = PAGES.length
  const page = PAGES[index]
  const isLast = index === total - 1

  const goNext = () => {
    if (leaving) return
    if (isLast) {
      finish()
      return
    }
    setDirection(1)
    setIndex((i) => Math.min(total - 1, i + 1))
  }

  const goPrev = () => {
    if (leaving || index === 0) return
    setDirection(-1)
    setIndex((i) => Math.max(0, i - 1))
  }

  const goTo = (i: number) => {
    if (leaving || i === index) return
    setDirection(i > index ? 1 : -1)
    setIndex(i)
  }

  const finish = () => {
    if (leaving) return
    setLeaving(true)
    start(async () => {
      try {
        await markIntroSeen()
      } catch {}
      window.setTimeout(() => {
        applyIntroSeen()
        onDone()
      }, reduce ? 0 : 380)
    })
  }

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -SLIDE_THRESHOLD) goNext()
    else if (info.offset.x > SLIDE_THRESHOLD) goPrev()
  }

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={leaving ? { opacity: 0, y: -12, filter: 'blur(6px)' } : { opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: leaving ? 0.36 : 0.5, ease: [0.22, 1, 0.36, 1] }}
      className='relative flex h-full w-full flex-col px-5 pt-[max(env(safe-area-inset-top),1rem)] pb-[max(env(safe-area-inset-bottom),1.25rem)]'
    >
      <header className='relative z-10 flex items-baseline justify-between'>
        <span className='text-ink-faint font-mono text-[11px] tracking-wide'>
          aviões · <span className='text-ink-soft'>{String(index + 1).padStart(3, '0')}</span>
          <span className='opacity-60'> / {String(total).padStart(3, '0')}</span>
        </span>
        <button
          type='button'
          onClick={finish}
          disabled={pending || leaving}
          className='text-ink-faint hover:text-ink-soft focus-visible:text-ink-soft -mr-2 rounded-full px-2 py-1 text-xs transition-colors disabled:opacity-50'
        >
          {t(locale, 'intro.skip')}
        </button>
      </header>

      <motion.div
        className='relative mt-3 flex flex-1 touch-pan-y flex-col active:cursor-grabbing'
        drag={leaving ? false : 'x'}
        dragElastic={0.18}
        dragConstraints={{ left: 0, right: 0 }}
        onDragEnd={onDragEnd}
      >
        <AnimatePresence
          mode='wait'
          custom={direction}
          initial={false}
        >
          <motion.section
            key={index}
            custom={direction}
            initial={reduce ? { opacity: 0 } : { opacity: 0, x: direction * 24, filter: 'blur(4px)' }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, x: 0, filter: 'blur(0px)' }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, x: -direction * 24, filter: 'blur(4px)' }}
            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            className='flex flex-1 flex-col'
          >
            <div className='mt-3 mb-5 flex items-baseline gap-3'>
              <span className='font-display text-ink-faint text-sm italic'>{page.eyebrow}</span>
              <span
                aria-hidden
                className='bg-line/60 h-px flex-1'
              />
            </div>

            <div className='relative mx-auto w-[78%] max-w-[260px]'>
              <Placeholder
                label={`placeholder · ${t(locale, page.artLabelKey)}`}
                glyph={page.glyph}
              />
            </div>

            <div className='mt-7'>
              <h1 className='font-display text-[34px] leading-[0.95] tracking-tight'>
                {t(locale, page.titleKey)}
                <br />
                <span className='text-clay italic'>{t(locale, page.italicKey)}</span>.
              </h1>
              <p className='font-display text-ink-soft mt-3 max-w-[30ch] text-sm italic'>{t(locale, page.bodyKey)}</p>
            </div>
          </motion.section>
        </AnimatePresence>
      </motion.div>

      <div className='relative z-10 mt-6 grid grid-cols-3 items-center gap-3'>
        <div className='flex justify-start'>
          <button
            type='button'
            onClick={goPrev}
            disabled={pending || leaving || index === 0}
            aria-label={t(locale, 'intro.prevPage')}
            aria-hidden={index === 0}
            tabIndex={index === 0 ? -1 : 0}
            className={`group focus-visible:bg-line/40 hover:bg-line/40 -ml-2 inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm transition-all duration-300 active:scale-[0.99] ${
              index === 0 ? 'pointer-events-none opacity-0' : 'opacity-100'
            }`}
          >
            <span
              aria-hidden
              className='text-base leading-none transition-transform duration-300 group-hover:-translate-x-1 group-focus-visible:-translate-x-1'
            >
              ←
            </span>
            <span className='font-display'>{t(locale, 'intro.back')}</span>
          </button>
        </div>

        <div
          role='tablist'
          aria-label={t(locale, 'intro.pagesAriaLabel')}
          className='flex items-center justify-center gap-2'
        >
          {PAGES.map((_, i) => {
            const active = i === index
            return (
              <button
                key={i}
                type='button'
                role='tab'
                aria-selected={active}
                aria-label={`${t(locale, 'intro.goToPage')} ${i + 1}`}
                onClick={() => goTo(i)}
                disabled={pending || leaving}
                className='group relative h-6 px-1'
              >
                <span
                  className={`block h-[3px] rounded-full transition-all duration-300 ${
                    active ? 'bg-sage w-7' : 'bg-line group-hover:bg-ink-faint w-3'
                  }`}
                />
              </button>
            )
          })}
        </div>

        <div className='flex justify-end'>
          <button
            type='button'
            onClick={goNext}
            disabled={pending || leaving}
            className='group focus-visible:bg-line/40 hover:bg-line/40 -mr-2 inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm transition-colors active:scale-[0.99] disabled:opacity-50'
          >
            <span className='font-display'>{isLast ? t(locale, 'intro.start') : t(locale, 'intro.next')}</span>
            <span
              aria-hidden
              className='text-base leading-none transition-transform duration-300 group-hover:translate-x-1 group-focus-visible:translate-x-1'
            >
              →
            </span>
          </button>
        </div>
      </div>
    </motion.main>
  )
}
