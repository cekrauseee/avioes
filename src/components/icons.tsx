import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function I({ size = 18, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.7'
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden
      {...props}
    />
  )
}

export function IconArrowLeft(props: IconProps) {
  return (
    <I {...props}>
      <path d='M19 12H5' />
      <path d='m11 18-6-6 6-6' />
    </I>
  )
}

export function IconArrowRight(props: IconProps) {
  return (
    <I {...props}>
      <path d='M5 12h14' />
      <path d='m13 6 6 6-6 6' />
    </I>
  )
}

export function IconChevronRight(props: IconProps) {
  return (
    <I {...props}>
      <path d='m9 6 6 6-6 6' />
    </I>
  )
}

export function IconChevronDown(props: IconProps) {
  return (
    <I {...props}>
      <path d='m6 9 6 6 6-6' />
    </I>
  )
}

export function IconPlus(props: IconProps) {
  return (
    <I {...props}>
      <path d='M12 5v14' />
      <path d='M5 12h14' />
    </I>
  )
}

export function IconX(props: IconProps) {
  return (
    <I {...props}>
      <path d='m18 6-12 12' />
      <path d='m6 6 12 12' />
    </I>
  )
}

export function IconMore(props: IconProps) {
  return (
    <I {...props}>
      <circle
        cx='12'
        cy='12'
        r='1'
        fill='currentColor'
        stroke='none'
      />
      <circle
        cx='5'
        cy='12'
        r='1'
        fill='currentColor'
        stroke='none'
      />
      <circle
        cx='19'
        cy='12'
        r='1'
        fill='currentColor'
        stroke='none'
      />
    </I>
  )
}

export function IconUndo(props: IconProps) {
  return (
    <I {...props}>
      <path d='M3 7v6h6' />
      <path d='M3 13a9 9 0 1 0 3-7.7' />
    </I>
  )
}

export function IconRefresh(props: IconProps) {
  return (
    <I {...props}>
      <path d='M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8' />
      <path d='M3 3v5h5' />
      <path d='M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16' />
      <path d='M21 21v-5h-5' />
    </I>
  )
}

export function IconSun(props: IconProps) {
  return (
    <I {...props}>
      <circle
        cx='12'
        cy='12'
        r='4'
      />
      <path d='M12 2v2' />
      <path d='M12 20v2' />
      <path d='m4.93 4.93 1.41 1.41' />
      <path d='m17.66 17.66 1.41 1.41' />
      <path d='M2 12h2' />
      <path d='M20 12h2' />
      <path d='m6.34 17.66-1.41 1.41' />
      <path d='m19.07 4.93-1.41 1.41' />
    </I>
  )
}

export function IconMoon(props: IconProps) {
  return (
    <I {...props}>
      <path d='M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z' />
    </I>
  )
}

export function IconSunMoon(props: IconProps) {
  return (
    <I {...props}>
      <path d='M12 8a2.83 2.83 0 0 0 4 4 4 4 0 1 1-4-4' />
      <path d='M12 2v2' />
      <path d='M12 20v2' />
      <path d='m4.9 4.9 1.4 1.4' />
      <path d='m17.7 17.7 1.4 1.4' />
      <path d='M2 12h2' />
      <path d='M20 12h2' />
      <path d='m6.3 17.7-1.4 1.4' />
      <path d='m19.1 4.9-1.4 1.4' />
    </I>
  )
}

export function IconCheck(props: IconProps) {
  return (
    <I {...props}>
      <path d='M20 6 9 17l-5-5' />
    </I>
  )
}

export function IconMail(props: IconProps) {
  return (
    <I {...props}>
      <rect
        width='20'
        height='16'
        x='2'
        y='4'
        rx='2'
      />
      <path d='m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7' />
    </I>
  )
}

export function IconLogOut(props: IconProps) {
  return (
    <I {...props}>
      <path d='M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4' />
      <polyline points='16 17 21 12 16 7' />
      <line
        x1='21'
        x2='9'
        y1='12'
        y2='12'
      />
    </I>
  )
}

export function IconLeave(props: IconProps) {
  return (
    <I {...props}>
      <path d='M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4' />
      <polyline points='16 17 21 12 16 7' />
      <line
        x1='21'
        x2='9'
        y1='12'
        y2='12'
      />
    </I>
  )
}

export function IconCopy(props: IconProps) {
  return (
    <I {...props}>
      <rect
        width='14'
        height='14'
        x='8'
        y='8'
        rx='2'
      />
      <path d='M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2' />
    </I>
  )
}

export function IconShare(props: IconProps) {
  return (
    <I {...props}>
      <path d='M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8' />
      <polyline points='16 6 12 2 8 6' />
      <line
        x1='12'
        x2='12'
        y1='2'
        y2='15'
      />
    </I>
  )
}

export function IconUsers(props: IconProps) {
  return (
    <I {...props}>
      <path d='M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' />
      <circle
        cx='9'
        cy='7'
        r='4'
      />
      <path d='M22 21v-2a4 4 0 0 0-3-3.87' />
      <path d='M16 3.13a4 4 0 0 1 0 7.75' />
    </I>
  )
}

export function IconUserEdit(props: IconProps) {
  return (
    <I {...props}>
      <path d='M11.5 15H7a4 4 0 0 0-4 4v2' />
      <circle
        cx='9.5'
        cy='7'
        r='4'
      />
      <path d='m15.2 15.5 4.6 4.6' />
      <path d='m19.8 15.5-4.6 4.6' />
    </I>
  )
}

export function IconKey(props: IconProps) {
  return (
    <I {...props}>
      <circle
        cx='7.5'
        cy='15.5'
        r='5.5'
      />
      <path d='m11.5 11.5 9-9' />
      <path d='M17 3h4v4' />
      <path d='m21 3-4 4' />
    </I>
  )
}

export function IconLink(props: IconProps) {
  return (
    <I {...props}>
      <path d='M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71' />
      <path d='M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71' />
    </I>
  )
}

export function IconLock(props: IconProps) {
  return (
    <I {...props}>
      <rect
        width='18'
        height='11'
        x='3'
        y='11'
        rx='2'
      />
      <path d='M7 11V7a5 5 0 0 1 10 0v4' />
    </I>
  )
}

export function IconSettings(props: IconProps) {
  return (
    <I {...props}>
      <path d='M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z' />
      <circle
        cx='12'
        cy='12'
        r='3'
      />
    </I>
  )
}

export function IconSend(props: IconProps) {
  return (
    <I {...props}>
      <path d='m22 2-7 20-4-9-9-4Z' />
      <path d='m22 2-11 11' />
    </I>
  )
}

export function IconUserPlus(props: IconProps) {
  return (
    <I {...props}>
      <path d='M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' />
      <circle
        cx='9'
        cy='7'
        r='4'
      />
      <line
        x1='19'
        x2='19'
        y1='8'
        y2='14'
      />
      <line
        x1='22'
        x2='16'
        y1='11'
        y2='11'
      />
    </I>
  )
}
