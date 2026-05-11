'use client'

import { AnimatePresence, motion, useReducedMotion, type HTMLMotionProps } from 'motion/react'
import NextLink, { type LinkProps as NextLinkProps } from 'next/link'
import { forwardRef, useCallback, useEffect, useRef, useState, type AnchorHTMLAttributes, type ReactNode } from 'react'
import { MOTION_OFFSET, MOTION_SPRING, MOTION_TRANSITION } from '../lib/motion'

export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'destructive-outline' | 'row' | 'row-accent' | 'ghost' | 'ghost-destructive'
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg'
export type ButtonShape = 'rounded' | 'pill' | 'square'
export type ButtonAlign = 'center' | 'between' | 'start'
export type ButtonStatus = 'idle' | 'pending' | 'success' | 'error'

const cn = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ')

const VARIANT_CHROME: Record<ButtonVariant, string> = {
  primary: 'bg-sage text-bg font-medium active:scale-[0.98] disabled:opacity-50',
  secondary: 'border-line bg-paper text-ink-soft border active:scale-[0.98] disabled:opacity-50',
  destructive: 'bg-clay text-bg font-medium active:scale-[0.98] disabled:opacity-50',
  'destructive-outline': 'border-clay/30 text-clay border active:scale-[0.98] disabled:opacity-50',
  row: 'border-line text-ink-soft border transition-colors disabled:opacity-50',
  'row-accent': 'border-line bg-paper text-sage border transition-colors disabled:opacity-50',
  ghost: 'text-ink-soft transition-colors active:scale-[0.98] disabled:opacity-50',
  'ghost-destructive': 'text-clay transition-colors disabled:opacity-50'
}

const VARIANT_HOVER_FOCUS: Record<ButtonVariant, string> = {
  primary: '',
  secondary: 'hover:bg-line/40 focus-visible:bg-line/40 focus-visible:ring-sage/40 focus-visible:ring-2 focus-visible:outline-none',
  destructive: '',
  'destructive-outline': 'hover:bg-clay/8 focus-visible:bg-clay/8 focus-visible:ring-clay/30 focus-visible:ring-2 focus-visible:outline-none',
  row: 'hover:bg-paper',
  'row-accent': 'hover:bg-sage-soft',
  ghost: 'hover:bg-line/40',
  'ghost-destructive': 'hover:bg-clay/8'
}

const ALIGN_CLASSES: Record<ButtonAlign, string> = {
  center: 'inline-flex items-center justify-center gap-2',
  between: 'flex items-center justify-between gap-2',
  start: 'inline-flex items-center justify-start gap-2'
}

const DEFAULT_ALIGN: Record<ButtonVariant, ButtonAlign> = {
  primary: 'center',
  secondary: 'center',
  destructive: 'center',
  'destructive-outline': 'center',
  row: 'between',
  'row-accent': 'between',
  ghost: 'center',
  'ghost-destructive': 'between'
}

const SIZE_CLASSES: Record<ButtonSize, string> = {
  xs: 'h-10 px-3 text-xs',
  sm: 'min-h-11 px-4 text-sm',
  md: 'h-12 px-4 text-sm',
  lg: 'min-h-14 px-5 text-sm'
}

const SHAPE_CLASSES: Record<ButtonShape, string> = {
  rounded: 'rounded-xl',
  pill: 'rounded-full',
  square: ''
}

const STATUS_OVERRIDES: Record<ButtonStatus, string> = {
  idle: '',
  pending: '',
  success: 'bg-sage-soft text-ink border-transparent',
  error: 'bg-clay-soft text-ink border-transparent'
}

const STATUS_HOVER_FOCUS: Record<ButtonStatus, string> = {
  idle: '',
  pending: '',
  success: 'hover:bg-[color-mix(in_srgb,var(--sage-soft),var(--sage)_20%)] focus-visible:ring-2 focus-visible:ring-sage/40 focus-visible:outline-none',
  error: 'hover:bg-[color-mix(in_srgb,var(--clay-soft),var(--clay)_20%)] focus-visible:ring-2 focus-visible:ring-clay/40 focus-visible:outline-none'
}

interface BaseStyleProps {
  variant?: ButtonVariant
  size?: ButtonSize
  shape?: ButtonShape
  align?: ButtonAlign
  fullWidth?: boolean
}

export function buttonVariants(opts: BaseStyleProps = {}): string {
  const { variant = 'primary', size = 'md', shape = 'rounded', align, fullWidth } = opts
  const resolvedAlign = align ?? DEFAULT_ALIGN[variant]
  return cn('transition-all', ALIGN_CLASSES[resolvedAlign], VARIANT_CHROME[variant], VARIANT_HOVER_FOCUS[variant], SIZE_CLASSES[size], SHAPE_CLASSES[shape], fullWidth && 'w-full')
}

// ─── Button ─────────────────────────────────────────────────────────────────

type MotionButtonProps = Omit<HTMLMotionProps<'button'>, 'children'>

export interface ButtonProps extends BaseStyleProps, MotionButtonProps {
  status?: ButtonStatus
  pendingLabel?: ReactNode
  successLabel?: ReactNode
  errorLabel?: ReactNode
  leading?: ReactNode
  trailing?: ReactNode
  children?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    shape = 'rounded',
    align,
    fullWidth,
    status = 'idle',
    pendingLabel,
    successLabel,
    errorLabel,
    leading,
    trailing,
    className,
    disabled,
    children,
    ...rest
  },
  ref
) {
  const resolvedAlign = align ?? DEFAULT_ALIGN[variant]
  const isStatusOverride = status === 'success' || status === 'error'
  const hoverFocus = isStatusOverride ? STATUS_HOVER_FOCUS[status] : VARIANT_HOVER_FOCUS[variant]

  const labelByStatus: Record<ButtonStatus, ReactNode> = {
    idle: children,
    pending: pendingLabel ?? children,
    success: successLabel ?? children,
    error: errorLabel ?? children
  }

  return (
    <motion.button
      ref={ref}
      type='button'
      disabled={disabled || status === 'pending'}
      className={cn(
        'transition-all',
        ALIGN_CLASSES[resolvedAlign],
        VARIANT_CHROME[variant],
        hoverFocus,
        SIZE_CLASSES[size],
        SHAPE_CLASSES[shape],
        fullWidth && 'w-full',
        STATUS_OVERRIDES[status],
        className
      )}
      {...rest}
    >
      {leading ? (
        <span className='inline-flex items-center gap-2'>
          {leading}
          <ButtonStatusContent
            status={status}
            label={labelByStatus[status]}
          />
        </span>
      ) : (
        <ButtonStatusContent
          status={status}
          label={labelByStatus[status]}
        />
      )}
      {trailing}
    </motion.button>
  )
})

// ─── ButtonLink ─────────────────────────────────────────────────────────────

type AnchorRest = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof NextLinkProps | 'className' | 'children'>

export interface ButtonLinkProps extends BaseStyleProps, NextLinkProps, AnchorRest {
  leading?: ReactNode
  trailing?: ReactNode
  className?: string
  children?: ReactNode
}

export const ButtonLink = forwardRef<HTMLAnchorElement, ButtonLinkProps>(function ButtonLink(
  { variant = 'primary', size = 'md', shape = 'rounded', fullWidth, leading, trailing, className, children, ...rest },
  ref
) {
  return (
    <NextLink
      ref={ref}
      className={cn(buttonVariants({ variant, size, shape, fullWidth }), className)}
      {...rest}
    >
      {leading ? (
        <span className='inline-flex items-center gap-2'>
          {leading}
          {children}
        </span>
      ) : (
        children
      )}
      {trailing}
    </NextLink>
  )
})

// ─── Status content + icons ─────────────────────────────────────────────────

function ButtonStatusContent({ status, label }: { status: ButtonStatus; label: ReactNode }) {
  const reduce = useReducedMotion()
  return (
    <AnimatePresence
      mode='wait'
      initial={false}
    >
      <motion.span
        key={status}
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: MOTION_OFFSET.buttonLabel, filter: 'blur(2px)' }}
        animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, y: -MOTION_OFFSET.buttonLabel, filter: 'blur(2px)' }}
        transition={MOTION_TRANSITION.inline}
        className='inline-flex items-center gap-2'
      >
        <StatusIcon status={status} />
        {label != null && <span>{label}</span>}
      </motion.span>
    </AnimatePresence>
  )
}

function StatusIcon({ status }: { status: ButtonStatus }) {
  if (status === 'pending') return <Spinner />
  if (status === 'success') return <CheckIcon />
  if (status === 'error') return <WarningIcon />
  return null
}

function Spinner() {
  return (
    <motion.svg
      width='14'
      height='14'
      viewBox='0 0 16 16'
      className='shrink-0'
      animate={{ rotate: 360 }}
      transition={MOTION_TRANSITION.spinner}
      aria-hidden='true'
    >
      <circle
        cx='8'
        cy='8'
        r='6'
        stroke='currentColor'
        strokeOpacity='0.25'
        strokeWidth='2'
        fill='none'
      />
      <path
        d='M14 8a6 6 0 0 0-6-6'
        stroke='currentColor'
        strokeWidth='2'
        strokeLinecap='round'
        fill='none'
      />
    </motion.svg>
  )
}

function CheckIcon() {
  return (
    <svg
      width='14'
      height='14'
      viewBox='0 0 16 16'
      fill='none'
      className='shrink-0'
      aria-hidden='true'
    >
      <motion.path
        d='M3 8.5l3.5 3.5L13 5'
        stroke='currentColor'
        strokeWidth='2.4'
        strokeLinecap='round'
        strokeLinejoin='round'
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={MOTION_TRANSITION.check}
      />
    </svg>
  )
}

function WarningIcon() {
  return (
    <motion.svg
      width='14'
      height='14'
      viewBox='0 0 16 16'
      fill='none'
      className='shrink-0'
      initial={{ scale: 0.7, rotate: -8 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={MOTION_SPRING.warning}
      aria-hidden='true'
    >
      <path
        d='M8 1.8L14.7 14H1.3z'
        stroke='currentColor'
        strokeWidth='1.8'
        strokeLinejoin='round'
      />
      <path
        d='M8 6v3.6'
        stroke='currentColor'
        strokeWidth='1.8'
        strokeLinecap='round'
      />
      <circle
        cx='8'
        cy='11.6'
        r='0.95'
        fill='currentColor'
      />
    </motion.svg>
  )
}

// ─── usePromiseStatus ────────────────────────────────────────────────────────

export interface UsePromiseStatusOptions {
  resetMs?: number
  successMs?: number
  errorMs?: number
}

export interface PromiseStatusController {
  status: ButtonStatus
  run: (fn: () => Promise<unknown>) => Promise<void>
  reset: () => void
}

export function usePromiseStatus(opts: UsePromiseStatusOptions = {}): PromiseStatusController {
  const { resetMs = 1500, successMs = resetMs, errorMs = resetMs } = opts
  const [status, setStatus] = useState<ButtonStatus>('idle')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const aliveRef = useRef(true)

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const reset = useCallback(() => {
    clearTimer()
    setStatus('idle')
  }, [clearTimer])

  const run = useCallback(
    async (fn: () => Promise<unknown>) => {
      clearTimer()
      setStatus('pending')
      try {
        await fn()
        if (!aliveRef.current) return
        setStatus('success')
        timerRef.current = setTimeout(() => {
          if (aliveRef.current) setStatus('idle')
        }, successMs)
      } catch {
        if (!aliveRef.current) return
        setStatus('error')
        timerRef.current = setTimeout(() => {
          if (aliveRef.current) setStatus('idle')
        }, errorMs)
      }
    },
    [clearTimer, successMs, errorMs]
  )

  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
      clearTimer()
    }
  }, [clearTimer])

  return { status, run, reset }
}
