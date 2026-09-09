const SUFFIXES = [
  '',
  'K',
  'M',
  'B',
  'T',
  'Qa',
  'Qi',
  'Sx',
  'Sp',
  'Oc',
  'No',
  'Dc',
]

export function formatNumber(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return '∞'
  const sign = value < 0 ? '-' : ''
  const abs = Math.abs(value)
  if (abs < 1000) {
    if (abs === 0) return '0'
    if (abs < 10) return sign + abs.toFixed(Math.min(digits, 1))
    return sign + abs.toFixed(abs < 100 ? 1 : 0)
  }
  const exp = Math.floor(Math.log10(abs) / 3)
  if (exp >= SUFFIXES.length) {
    return sign + abs.toExponential(2).replace('+', '')
  }
  const scaled = abs / 10 ** (exp * 3)
  const precision = scaled >= 100 ? 0 : scaled >= 10 ? 1 : digits
  return sign + scaled.toFixed(precision) + SUFFIXES[exp]
}

export function formatRate(value: number): string {
  if (value < 0.1) return formatNumber(value, 2) + '/s'
  return formatNumber(value, 1) + '/s'
}

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  if (h > 48) return `${Math.floor(h / 24)}d ${h % 24}h`
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${r}s`
  return `${r}s`
}
