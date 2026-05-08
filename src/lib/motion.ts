export const MOTION_EASE = [0.22, 1, 0.36, 1] as const

export const MOTION_OFFSET = {
  route: 20,
  screen: 20,
  step: 24,
  tab: 32,
  token: 2,
  buttonLabel: 4
} as const

export const MOTION_TRANSITION = {
  route: { duration: 0.2, ease: MOTION_EASE },
  screen: { duration: 0.2, ease: MOTION_EASE },
  screenExit: { duration: 0.1, ease: 'easeIn' as const },
  stepSlide: { duration: 0.28, ease: MOTION_EASE },
  tab: { duration: 0.32, ease: MOTION_EASE },
  header: { duration: 0.28, ease: MOTION_EASE },
  section: { duration: 0.7, ease: MOTION_EASE },
  sectionMedium: { duration: 0.5, ease: MOTION_EASE },
  inline: { duration: 0.18, ease: MOTION_EASE },
  token: { duration: 0.15, ease: MOTION_EASE },
  fastFade: { duration: 0.12, ease: MOTION_EASE },
  listEnter: { duration: 0.14, ease: MOTION_EASE },
  listLayout: { duration: 0.18, ease: MOTION_EASE },
  expandable: { duration: 0.22, ease: MOTION_EASE },
  confirmation: { duration: 0.4, ease: MOTION_EASE },
  check: { duration: 0.32, ease: MOTION_EASE },
  avatar: { duration: 0.32, ease: MOTION_EASE },
  mapExpand: { duration: 0.4, ease: MOTION_EASE },
  sheetBackdrop: { duration: 0.2 },
  sheetPanel: { duration: 0.35, ease: MOTION_EASE },
  sheetLayout: { duration: 0.24, ease: MOTION_EASE },
  navIndicator: { duration: 0.45, ease: MOTION_EASE },
  intro: { duration: 0.42, ease: MOTION_EASE },
  introEnter: { duration: 0.5, ease: MOTION_EASE },
  introExit: { duration: 0.36, ease: MOTION_EASE },
  offlineStagger: { duration: 0.55, ease: MOTION_EASE },
  spinner: { duration: 0.9, repeat: Infinity, ease: 'linear' as const },
  pulse: { duration: 1, repeat: Infinity },
  planeArc: { duration: 1.4, ease: 'linear' as const }
} as const

export const MOTION_SPRING = {
  counter: { stiffness: 220, damping: 22 },
  selection: { type: 'spring' as const, stiffness: 400, damping: 30 },
  toolbarIndicator: { type: 'spring' as const, stiffness: 380, damping: 32 },
  warning: { type: 'spring' as const, stiffness: 420, damping: 18 }
} as const

export function withMotionDelay<T extends object>(transition: T, delay: number): T & { delay: number } {
  return { ...transition, delay }
}
