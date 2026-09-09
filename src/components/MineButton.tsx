import { useState } from 'react'
import { formatNumber } from '../game/numbers'
import { AsteroidArt } from './AsteroidArt'

interface MineButtonProps {
  onStrike: () => { gained: number; crit: boolean }
  strikePower: number
}

interface Chip {
  id: number
  label: string
  crit: boolean
  x: number
  y: number
}

let chipSeq = 0

export function MineButton({ onStrike, strikePower }: MineButtonProps) {
  const [struck, setStruck] = useState(false)
  const [chips, setChips] = useState<Chip[]>([])

  function strikeAt(target: HTMLButtonElement, clientX: number, clientY: number) {
    const result = onStrike()
    setStruck(false)
    requestAnimationFrame(() => setStruck(true))
    window.setTimeout(() => setStruck(false), 140)

    const rect = target.getBoundingClientRect()
    chipSeq += 1
    const chip: Chip = {
      id: chipSeq,
      label: `+${formatChip(result.gained)}`,
      crit: result.crit,
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100,
    }
    setChips((prev) => [...prev.slice(-12), chip])
    window.setTimeout(() => {
      setChips((prev) => prev.filter((item) => item.id !== chip.id))
    }, 800)
  }

  function handlePointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return
    event.preventDefault()
    strikeAt(event.currentTarget, event.clientX, event.clientY)
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    const rect = event.currentTarget.getBoundingClientRect()
    strikeAt(event.currentTarget, rect.left + rect.width / 2, rect.top + rect.height / 2)
  }

  return (
    <div className="mine-stage">
      <div className="mine-glow" />
      <button
        type="button"
        className={`asteroid ${struck ? 'is-struck' : ''}`}
        onPointerDown={handlePointerDown}
        onKeyDown={handleKeyDown}
        aria-label="Mine the asteroid"
      >
        <AsteroidArt />
        <span className="asteroid-ring" />
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
