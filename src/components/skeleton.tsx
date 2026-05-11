export function Skel({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`bg-line/60 block animate-pulse ${className.includes('rounded') ? '' : 'rounded-md'} ${className}`}
    />
  )
}
