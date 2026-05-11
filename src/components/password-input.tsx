'use client'

import { useState } from 'react'
import { t } from '../lib/i18n'
import type { Locale } from '../lib/types'

export function PasswordInput({
  value,
  onChange,
  placeholder,
  autoComplete,
  autoFocus,
  locale,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoComplete?: string
  autoFocus?: boolean
  locale: Locale
}) {
  const [show, setShow] = useState(false)
  const [pressed, setPressed] = useState(false)
  return (
    <div className='border-line bg-paper ring-sage/40 focus-within:ring-2 flex overflow-hidden rounded-xl border transition-all'>
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        className='text-ink placeholder:text-ink-faint min-w-0 flex-1 px-4 py-3 text-sm outline-none'
      />
      <button
        type='button'
        onClick={() => setShow((s) => !s)}
        onPointerDown={() => setPressed(true)}
        onPointerUp={() => setPressed(false)}
        onPointerLeave={() => setPressed(false)}
        aria-label={t(locale, show ? 'password.hide' : 'password.show')}
        className={`text-ink-faint hover:text-ink-soft border-line flex w-12 shrink-0 items-center justify-center border-l transition-colors ${pressed || show ? 'bg-ink/10' : ''}`}
      >
        <span className={`transition-transform duration-100 ${pressed ? 'scale-75' : 'scale-100'}`}>
          {show ? <EyeOff /> : <Eye />}
        </span>
      </button>
    </div>
  )
}

function Eye() {
  return (
    <svg
      width='18'
      height='18'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden
    >
      <path d='M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z' />
      <path d='M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z' />
    </svg>
  )
}

function EyeOff() {
  return (
    <svg
      width='18'
      height='18'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden
    >
      <path d='M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88' />
    </svg>
  )
}
