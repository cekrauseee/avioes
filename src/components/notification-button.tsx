'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { getUnreadNotificationCount } from '../actions'
import { useRealtimeNotifications } from '../lib/realtime'
import { useAppStore } from '../lib/store/app-store'
import { IconMail } from './icons'

export function NotificationButton() {
  const userId = useAppStore((s) => s.identity)
  const [unread, setUnread] = useState(0)

  const refresh = useCallback(() => {
    void getUnreadNotificationCount().then(setUnread)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  useRealtimeNotifications(userId, refresh)

  return (
    <Link
      href='/notifications'
      aria-label={unread > 0 ? `${unread} notificações` : 'notificações'}
      className='group text-ink-soft hover:bg-line/50 hover:text-ink focus-visible:bg-line/50 focus-visible:text-ink relative inline-flex h-10 w-10 items-center justify-center rounded-full text-lg leading-none transition-colors active:scale-90'
    >
      <span
        aria-hidden
        className='inline-block transition-transform duration-300 ease-out group-hover:scale-110 group-hover:-rotate-[10deg] group-focus-visible:scale-110 group-focus-visible:-rotate-[10deg]'
      >
        <IconMail size={20} />
      </span>
      {unread > 0 && <span className='bg-clay absolute top-1 right-1 h-2 w-2 rounded-full' />}
    </Link>
  )
}
