export function startOfWeekBRT(now: number): number {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour12: false
  })
  const parts = Object.fromEntries(fmt.formatToParts(new Date(now)).map((p) => [p.type, p.value]))
  const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday as string)
  // BRT is UTC-3 year-round (Brazil abolished DST in 2019). 00:00 BRT == 03:00 UTC.
  const todayUtcMidday = Date.UTC(+parts.year, +parts.month - 1, +parts.day, 12)
  const sundayUtcMidday = todayUtcMidday - dow * 86_400_000
  const d = new Date(sundayUtcMidday)
  d.setUTCHours(3, 0, 0, 0)
  return d.getTime()
}
