export function Placeholder({ label, ratio = '1 / 1', glyph }: { label: string; ratio?: string; glyph?: string }) {
  return (
    <div
      aria-hidden
      className='border-line/80 text-ink-faint relative w-full overflow-hidden rounded-2xl border border-dashed'
      style={{
        aspectRatio: ratio,
        backgroundImage:
          'repeating-linear-gradient(45deg, var(--line) 0 1px, transparent 1px 9px), repeating-linear-gradient(-45deg, var(--line) 0 1px, transparent 1px 9px)'
      }}
    >
      <div className='absolute inset-0 flex flex-col items-center justify-center gap-2 text-center'>
        {glyph && <span className='font-display text-4xl leading-none opacity-60'>{glyph}</span>}
        <span className='text-[11px] tracking-wide opacity-70'>{label}</span>
      </div>
    </div>
  )
}
