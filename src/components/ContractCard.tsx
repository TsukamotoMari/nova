import {
  contractCopy,
  contractProgress,
  type GameState,
} from '../game/engine'
import { formatNumber } from '../game/numbers'

export function ContractCard({ state }: { state: GameState }) {
  const contract = state.contract
  if (!contract) return null
  const copy = contractCopy(contract)
  const progress = Math.min(contractProgress(state), contract.target)
  const pct = contract.target > 0 ? Math.min(100, (progress / contract.target) * 100) : 0

  return (
    <div className={`contract-card ${contract.completed ? 'is-done' : ''}`}>
      <p className="kicker">{contract.completed ? 'Claim settled' : 'Claim contract'}</p>
      <strong>{copy.title}</strong>
      <p>
        {contract.kind === 'ore'
          ? `Mine ${formatNumber(contract.target)} ore this shift — the warp quota for this claim.`
          : contract.kind === 'clicks'
            ? `Land ${formatNumber(contract.target, 0)} strikes this shift.`
            : copy.detail}
      </p>
      <div className="contract-bar" aria-hidden="true">
        <i style={{ width: `${pct}%` }} />
      </div>
      <span>
        {contract.completed
          ? `+${formatNumber(contract.reward)} ore banked`
          : `${formatNumber(progress)} / ${formatNumber(contract.target)}`}
      </span>
    </div>
  )
}
