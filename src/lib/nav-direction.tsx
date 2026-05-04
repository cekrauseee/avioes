'use client'

import { createContext, useCallback, useContext, useMemo, useRef } from 'react'

type Direction = 1 | -1
type NavDirectionCtx = {
  get: () => Direction
  set: (d: Direction) => void
}

const Ctx = createContext<NavDirectionCtx>({ get: () => 1, set: () => {} })

export function NavDirectionProvider({ children }: { children: React.ReactNode }) {
  const ref = useRef<Direction>(1)
  const get = useCallback(() => ref.current, [])
  const set = useCallback((d: Direction) => { ref.current = d }, [])
  const value = useMemo(() => ({ get, set }), [get, set])
  return <Ctx value={value}>{children}</Ctx>
}

export function useNavDirection() {
  return useContext(Ctx)
}
