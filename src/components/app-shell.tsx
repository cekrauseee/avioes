export function AppShell({ children, scroll = false }: { children: React.ReactNode; scroll?: boolean }) {
  return <div className={scroll ? 'scroll-area flex-1 overflow-y-auto' : 'flex-1 overflow-hidden'}>{children}</div>
}
