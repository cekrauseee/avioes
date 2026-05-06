import { AppShell } from '../../components/app-shell'
import {
  AlignmentSection,
  ButtonLinkSection,
  ColorTokensSection,
  ExpandableSection,
  PromiseDemoSection,
  ShapesSection,
  SizesSection,
  SkeletonSection,
  StatesSection,
  ThemePaletteSection,
  TypographySection,
  VariantsSection
} from './sections'

export const metadata = {
  title: 'Design system',
  robots: { index: false, follow: false }
}

export default function DesignPage() {
  return (
    <AppShell scroll>
      <div className='flex flex-col gap-12 px-5 pt-[max(env(safe-area-inset-top),1.5rem)] pb-[max(env(safe-area-inset-bottom),3rem)]'>
        <header className='flex flex-col gap-1'>
          <p className='text-ink-faint font-mono text-[11px]'>airplanes / dev</p>
          <h1 className='font-display text-3xl tracking-tight'>
            Design <span className='text-sage italic'>system</span>
          </h1>
          <p className='text-ink-soft mt-1 text-sm'>Tokens, primitives, and motion samples. Public dev page — not behind auth.</p>
        </header>

        <ThemePaletteSection />
        <ColorTokensSection />
        <TypographySection />
        <VariantsSection />
        <SizesSection />
        <ShapesSection />
        <AlignmentSection />
        <StatesSection />
        <PromiseDemoSection />
        <ButtonLinkSection />
        <SkeletonSection />
        <ExpandableSection />

        <footer className='border-line border-t pt-6'>
          <p className='text-ink-faint font-mono text-[11px]'>
            Source: <span className='text-ink-soft'>src/components/button.tsx</span>
          </p>
          <p className='text-ink-faint mt-1 font-mono text-[11px]'>
            Docs: <span className='text-ink-soft'>docs/ui-ux.md</span>, <span className='text-ink-soft'>docs/code-style.md</span>
          </p>
        </footer>
      </div>
    </AppShell>
  )
}
