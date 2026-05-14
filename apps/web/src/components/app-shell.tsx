export function AppShell({ children, scroll = false }: { children: React.ReactNode; scroll?: boolean }) {
  return (
    <div className={scroll ? 'scroll-area flex min-h-0 flex-1 flex-col overflow-y-auto' : 'flex min-h-0 flex-1 flex-col overflow-hidden'}>{children}</div>
  )
}
