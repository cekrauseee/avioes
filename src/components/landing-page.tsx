'use client'

import { AnimatePresence, motion } from 'motion/react'
import Image from 'next/image'
import { useState } from 'react'
import { t, type TKey } from '../lib/i18n'
import { MOTION_EASE } from '../lib/motion'
import type { Locale } from '../lib/types'
import { ButtonLink } from './button'
import { IconArrowRight } from './icons'

const sectionAnim = { duration: 0.7, ease: MOTION_EASE }

function FadeIn({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ ...sectionAnim, delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

const FEATURES: { title: TKey; body: TKey; accent: string }[] = [
  { title: 'landing.features.counter.title', body: 'landing.features.counter.body', accent: 'bg-sage' },
  { title: 'landing.features.diary.title', body: 'landing.features.diary.body', accent: 'bg-sky' },
  { title: 'landing.features.scoreboard.title', body: 'landing.features.scoreboard.body', accent: 'bg-clay' }
]

const STEPS: { n: string; title: TKey; body: TKey }[] = [
  { n: '1', title: 'landing.steps.1.title', body: 'landing.steps.1.body' },
  { n: '2', title: 'landing.steps.2.title', body: 'landing.steps.2.body' },
  { n: '3', title: 'landing.steps.3.title', body: 'landing.steps.3.body' }
]

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className='border-line bg-bg mx-auto w-[240px] rounded-[2.5rem] border-2 p-2 md:w-[280px]'>
      <div className='bg-ink mx-auto mt-2 mb-3 h-[5px] w-16 rounded-full opacity-10 md:w-20' />
      <div className='overflow-hidden rounded-[2rem]'>{children}</div>
      <div className='h-2' />
    </div>
  )
}

function CounterPreview() {
  return (
    <div className='bg-bg mt-4 flex flex-col items-center rounded-xl py-5'>
      <span className='font-display text-3xl tracking-tight'>23</span>
      <span className='text-ink-faint mt-0.5 text-[10px]'>aviões</span>
    </div>
  )
}

function DiaryPreview() {
  return (
    <div className='bg-bg mt-4 flex flex-col gap-1.5 rounded-xl p-3'>
      {[
        { name: 'Ana', color: 'text-sage', streak: '3×' },
        { name: 'Leo', color: 'text-clay', streak: '1×' },
        { name: 'Ana', color: 'text-sage', streak: '2×' }
      ].map((e, i) => (
        <div
          key={i}
          className='flex items-center gap-1.5 text-[10px]'
        >
          <span className={`font-medium ${e.color}`}>{e.name}</span>
          <span className='text-ink-faint'>· {e.streak}</span>
        </div>
      ))}
    </div>
  )
}

function ScoreboardPreview() {
  return (
    <div className='bg-bg mt-4 flex flex-col gap-1.5 rounded-xl p-3'>
      {[
        { rank: '1°', name: 'Ana', count: '23', color: 'text-sage' },
        { rank: '2°', name: 'Leo', count: '18', color: 'text-clay' },
        { rank: '3°', name: 'Mia', count: '12', color: 'text-sky' }
      ].map((e, i) => (
        <div
          key={i}
          className='flex items-center gap-2 text-[10px]'
        >
          <span className='font-display text-ink-faint w-4 italic'>{e.rank}</span>
          <span className={`font-medium ${e.color}`}>{e.name}</span>
          <span className='text-ink-faint ml-auto font-mono'>{e.count}</span>
        </div>
      ))}
    </div>
  )
}

const FEATURE_PREVIEWS = [CounterPreview, DiaryPreview, ScoreboardPreview]

function DemoCounter({ locale }: { locale: Locale }) {
  const [count, setCount] = useState(0)

  return (
    <div className='flex h-[360px] flex-col items-center justify-center px-4 md:h-[400px]'>
      <div className='flex flex-col items-center'>
        <AnimatePresence mode='wait'>
          <motion.span
            key={count}
            initial={{ scale: 1.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 220, damping: 22 }}
            className='font-display text-7xl tracking-tight'
          >
            {count}
          </motion.span>
        </AnimatePresence>
        <span className='text-ink-faint mt-1 text-xs'>{count === 1 ? t(locale, 'counter.airplane') : t(locale, 'counter.airplanes')}</span>
      </div>
      <button
        onClick={() => setCount((c) => c + 1)}
        className='bg-sage text-bg mt-8 flex h-16 w-16 items-center justify-center rounded-full text-lg font-medium transition-transform active:scale-95'
      >
        +1
      </button>
      <span className='text-ink-faint mt-4 text-[11px]'>{t(locale, 'landing.demo.tapHint')}</span>
    </div>
  )
}

export function LandingPage({ locale: initialLocale }: { locale: Locale }) {
  const [locale, setLocale] = useState(initialLocale)

  return (
    <div className='scroll-area flex min-h-0 flex-1 flex-col overflow-y-auto'>
      <header className='border-line bg-bg sticky top-0 z-10 border-b'>
        <div className='mx-auto flex max-w-5xl items-center justify-between px-6 py-3'>
          <span className='font-display text-xl tracking-tight'>Aviões</span>
          <div className='flex items-center gap-2'>
            <button
              type='button'
              onClick={() => setLocale(locale === 'pt' ? 'en' : 'pt')}
              className='text-ink-faint hover:text-ink border-line rounded-full border px-2.5 py-1 text-xs transition-colors'
            >
              {locale === 'pt' ? 'PT' : 'EN'}
            </button>
            <ButtonLink
              href='/auth'
              variant='primary'
              size='xs'
              shape='pill'
              trailing={<IconArrowRight />}
            >
              {t(locale, 'landing.hero.cta')}
            </ButtonLink>
          </div>
        </div>
      </header>

      <section className='flex min-h-[80dvh] items-center px-6 py-16'>
        <div className='mx-auto flex w-full max-w-5xl flex-col items-center gap-10 md:flex-row md:items-center md:justify-between'>
          <FadeIn className='flex flex-col items-center text-center md:items-start md:text-left'>
            <h1 className='font-display text-[52px] leading-none tracking-tight md:text-[72px]'>Aviões</h1>
            <p className='font-display text-ink-soft mt-3 text-xl md:text-2xl'>
              {t(locale, 'landing.hero.tagline')} <span className='text-sage italic'>{t(locale, 'landing.hero.taglineItalic')}</span>
            </p>
            <p className='text-ink-soft mt-5 max-w-sm text-sm leading-relaxed md:text-base'>{t(locale, 'landing.hero.body')}</p>
            <div className='mt-8 w-full max-w-xs'>
              <ButtonLink
                href='/auth'
                variant='primary'
                size='md'
                fullWidth
                trailing={<IconArrowRight />}
              >
                {t(locale, 'landing.hero.cta')}
              </ButtonLink>
            </div>
          </FadeIn>
          <FadeIn
            delay={0.15}
            className='relative w-[72%] max-w-xs md:w-[40%] md:max-w-md'
          >
            <Image
              src='/onboarding-hero-light.png'
              alt=''
              aria-hidden
              width={1254}
              height={1254}
              sizes='(max-width: 768px) 72vw, 400px'
              loading='eager'
              fetchPriority='high'
              className='theme-light-only h-auto w-full select-none'
              draggable={false}
            />
            <Image
              src='/onboarding-hero-dark.png'
              alt=''
              aria-hidden
              width={1254}
              height={1254}
              sizes='(max-width: 768px) 72vw, 400px'
              loading='eager'
              fetchPriority='high'
              className='theme-dark-only h-auto w-full select-none'
              draggable={false}
            />
          </FadeIn>
        </div>
      </section>

      <section className='bg-bg-soft px-6 py-20'>
        <div className='mx-auto max-w-4xl'>
          <FadeIn className='text-center'>
            <h2 className='font-display text-3xl tracking-tight md:text-4xl'>
              {t(locale, 'landing.features.title')} <span className='text-sage italic'>{t(locale, 'landing.features.titleItalic')}</span>
            </h2>
          </FadeIn>
          <div className='mt-12 grid gap-6 md:grid-cols-3'>
            {FEATURES.map((f, i) => {
              const Preview = FEATURE_PREVIEWS[i]
              return (
                <FadeIn
                  key={f.title}
                  delay={i * 0.1}
                  className='border-line bg-paper rounded-2xl border p-6'
                >
                  <div className={`mb-4 h-1.5 w-8 rounded-full ${f.accent}`} />
                  <h3 className='font-display text-lg tracking-tight'>{t(locale, f.title)}</h3>
                  <p className='text-ink-soft mt-2 text-sm leading-relaxed'>{t(locale, f.body)}</p>
                  <Preview />
                </FadeIn>
              )
            })}
          </div>
        </div>
      </section>

      <section className='px-6 py-20'>
        <div className='mx-auto flex max-w-4xl flex-col items-center gap-10 md:flex-row md:items-center md:justify-between'>
          <FadeIn className='flex flex-col items-center text-center md:items-start md:text-left'>
            <h2 className='font-display text-3xl tracking-tight md:text-4xl'>
              {t(locale, 'landing.demo.title')} <span className='text-sage italic'>{t(locale, 'landing.demo.titleItalic')}</span>
            </h2>
            <p className='text-ink-soft mt-3 max-w-xs text-sm leading-relaxed'>{t(locale, 'landing.demo.subtitle')}</p>
          </FadeIn>
          <FadeIn delay={0.15}>
            <PhoneFrame>
              <DemoCounter locale={locale} />
            </PhoneFrame>
          </FadeIn>
        </div>
      </section>

      <section className='bg-bg-soft px-6 py-20'>
        <div className='mx-auto max-w-4xl'>
          <FadeIn className='text-center'>
            <h2 className='font-display text-3xl tracking-tight md:text-4xl'>
              {t(locale, 'landing.steps.title')} <span className='text-sage italic'>{t(locale, 'landing.steps.titleItalic')}</span>
            </h2>
          </FadeIn>
          <div className='mt-12 grid gap-8 md:grid-cols-3'>
            {STEPS.map((s, i) => (
              <FadeIn
                key={s.n}
                delay={i * 0.1}
                className='flex flex-col items-center text-center'
              >
                <span className='font-display text-sage text-4xl italic'>{s.n}</span>
                <h3 className='font-display mt-3 text-lg tracking-tight'>{t(locale, s.title)}</h3>
                <p className='text-ink-soft mt-2 max-w-xs text-sm leading-relaxed'>{t(locale, s.body)}</p>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section className='px-6 py-24'>
        <FadeIn className='mx-auto flex max-w-md flex-col items-center text-center'>
          <h2 className='font-display text-3xl tracking-tight md:text-4xl'>
            {t(locale, 'landing.final.title')} <span className='text-sage italic'>{t(locale, 'landing.final.titleItalic')}</span>
          </h2>
          <div className='mt-8 w-full max-w-xs'>
            <ButtonLink
              href='/auth'
              variant='primary'
              size='md'
              fullWidth
              trailing={<IconArrowRight />}
            >
              {t(locale, 'landing.final.cta')}
            </ButtonLink>
          </div>
        </FadeIn>
      </section>
    </div>
  )
}
