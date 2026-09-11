import { useEffect, useRef, useState } from 'react'
import { formatNumber } from '../game/numbers'
import { AsteroidArt } from './AsteroidArt'

const TAP_SLOP = 16
const AFTERSHOCKS = 5
const AFTERSHOCK_GAP = 120

interface MineButtonProps {
  onStrike: (opts?: { auto?: boolean }) => { gained: number; crit: boolean }
  strikePower: number
  combo: number
  wear: number
  hue: number
  glow: string
}

interface Chip {
  id: number
  label: string
  crit: boolean
  x: number
  y: number
}

interface PointerTrack {
  x: number
  y: number
  lastY: number
  scrolling: boolean
}

let chipSeq = 0

export function MineButton({ onStrike, strikePower, combo, wear, hue, glow }: MineButtonProps) {
  const [struck, setStruck] = useState(false)
  const [chips, setChips] = useState<Chip[]>([])
  const pointers = useRef(new Map<number, PointerTrack>())
  const aftershock = useRef<number[]>([])
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    return () => {
      for (const id of aftershock.current) window.clearTimeout(id)
    }
  }, [])

  function spawnChip(target: HTMLButtonElement, clientX: number, clientY: number, gained: number, crit: boolean) {
    const rect = target.getBoundingClientRect()
    chipSeq += 1
    const chip: Chip = {
      id: chipSeq,
      label: `+${formatChip(gained)}`,
      crit,
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100,
    }
    setChips((prev) => [...prev.slice(-12), chip])
    window.setTimeout(() => {
      setChips((prev) => prev.filter((item) => item.id !== chip.id))
    }, 800)
  }

  function strikeAt(
    target: HTMLButtonElement,
    clientX: number,
    clientY: number,
    opts?: { auto?: boolean },
  ) {
    const result = onStrike(opts)
    setStruck(false)
    requestAnimationFrame(() => setStruck(true))
    window.setTimeout(() => setStruck(false), 140)
    spawnChip(target, clientX, clientY, result.gained, result.crit)

    if (result.crit && !opts?.auto) {
      for (const id of aftershock.current) window.clearTimeout(id)
      aftershock.current = []
      for (let i = 1; i <= AFTERSHOCKS; i += 1) {
        const id = window.setTimeout(() => {
          const btn = buttonRef.current
          if (!btn) return
          const jitterX = clientX + (Math.random() - 0.5) * 28
          const jitterY = clientY + (Math.random() - 0.5) * 28
          strikeAt(btn, jitterX, jitterY, { auto: true })
        }, i * AFTERSHOCK_GAP)
        aftershock.current.push(id)
      }
    }
  }

  function handlePointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
      lastY: event.clientY,
      scrolling: false,
    })
    event.currentTarget.setPointerCapture(event.pointerId)
    strikeAt(event.currentTarget, event.clientX, event.clientY)
  }

  function handlePointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    const track = pointers.current.get(event.pointerId)
    if (!track) return
    const dx = event.clientX - track.x
    const dy = event.clientY - track.y
    if (!track.scrolling && dy * dy + dx * dx > TAP_SLOP * TAP_SLOP && Math.abs(dy) >= Math.abs(dx)) {
      track.scrolling = true
    }
    if (!track.scrolling) return
    window.scrollBy(0, track.lastY - event.clientY)
    track.lastY = event.clientY
  }

  function forgetPointer(event: React.PointerEvent<HTMLButtonElement>) {
    pointers.current.delete(event.pointerId)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    const rect = event.currentTarget.getBoundingClientRect()
    strikeAt(event.currentTarget, rect.left + rect.width / 2, rect.top + rect.height / 2)
  }

  return (
    <div className="mine-stage">
      <div className="mine-glow" style={{ background: `radial-gradient(circle, ${glow}, transparent 68%)` }} />
      <button
        ref={buttonRef}
        type="button"
        className={`asteroid ${struck ? 'is-struck' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={forgetPointer}
        onPointerCancel={forgetPointer}
        onKeyDown={handleKeyDown}
        aria-label="Mine the asteroid"
      >
        <AsteroidArt hue={hue} wear={wear} />
        <span className="asteroid-ring" />
        {combo >= 2 ? <span className="combo-pip">×{combo}</span> : null}
        {chips.map((chip) => (
          <span
            key={chip.id}
            className={`ore-chip ${chip.crit ? 'is-crit' : ''}`}
            style={{ left: `${chip.x}%`, top: `${chip.y}%` }}
          >
            {chip.label}
          </span>
        ))}
      </button>
      <p className="mine-hint">Each strike mines {formatNumber(strikePower)} ore</p>
    </div>
  )
}

function formatChip(value: number): string {
  if (value < 1000) return value % 1 === 0 ? String(value) : value.toFixed(1)
  if (value < 1_000_000) return (value / 1000).toFixed(1) + 'K'
  return (value / 1_000_000).toFixed(1) + 'M'
}
