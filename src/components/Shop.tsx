import { useState } from 'react'
import {
  ACHIEVEMENTS,
  CLICK_RANK_BASE,
  CORE_PERKS,
  GENERATORS,
  UPGRADES,
  nextMilestone,
  prestigeGain,
  type CorePerkDef,
  type UpgradeDef,
} from '../game/data'
import {
  buyCost,
  canAffordClickRanks,
  canAffordGenerator,
  clickPower,
  clickUpgradeReady,
  coreMultiplier,
  corePerkReady,
  gearUpgradeReady,
  generatorRate,
  generatorVisible,
  maxBuyCount,
  perkCost,
  perkRank,
  upgradeAvailable,
  type BuyMode,
  type GameState,
} from '../game/engine'
import { formatDuration, formatNumber, formatRate } from '../game/numbers'

type Tab = 'rigs' | 'clicks' | 'upgrades' | 'warp' | 'log'

interface ShopProps {
  state: GameState
  buyMode: BuyMode
  onBuyMode: (mode: BuyMode) => void
  onBuyGenerator: (id: string) => void
  onBuyUpgrade: (id: string) => void
  onBuyClickRanks: () => void
  onBuyCorePerk: (id: string) => void
  onWarp: () => void
  onHardReset: () => void
}

export function Shop({
  state,
  buyMode,
  onBuyMode,
  onBuyGenerator,
  onBuyUpgrade,
  onBuyClickRanks,
  onBuyCorePerk,
  onWarp,
  onHardReset,
}: ShopProps) {
  const [tab, setTab] = useState<Tab>('rigs')
  const gain = prestigeGain(state.runEarned)
  const ranks = state.clickRanks ?? 0
  const rankCount = buyMode === 'max' ? maxBuyCount(CLICK_RANK_BASE, ranks, state.ore) : buyMode
  const rankCost = buyCost(CLICK_RANK_BASE, ranks, Math.max(rankCount, 1))
  const canRank = canAffordClickRanks(state, buyMode)

  return (
    <section className="shop">
      <div className="shop-tabs">
        {(['rigs', 'clicks', 'upgrades', 'warp', 'log'] as const).map((id) => (
          <button
            key={id}
            type="button"
            className={`shop-tab ${tab === id ? 'is-active' : ''}`}
            onClick={() => setTab(id)}
          >
            {labelFor(id)}
            {id === 'warp' && (gain > 0 || corePerkReady(state)) ? <span className="tab-pip" /> : null}
            {id === 'clicks' && clickUpgradeReady(state) ? <span className="tab-pip" /> : null}
            {id === 'upgrades' && gearUpgradeReady(state) ? <span className="tab-pip" /> : null}
          </button>
        ))}
      </div>

      {tab === 'rigs' && (
        <>
          <BuyModes buyMode={buyMode} onBuyMode={onBuyMode} />
          <ul className="rig-list">
            {GENERATORS.map((gen, index) => {
              const visible = generatorVisible(state, index)
              const showLocked =
                !visible && (index === 0 || generatorVisible(state, index - 1))
              if (!visible && !showLocked) return null
              if (!visible) {
                return (
                  <li key={gen.id} className="rig is-locked">
                    <span className="rig-icon">░</span>
                    <div>
                      <strong>Uncharted claim</strong>
                      <p>Keep mining to scan this rig.</p>
                    </div>
                  </li>
                )
              }

              const owned = state.generators[gen.id] ?? 0
              const affordable = canAffordGenerator(state, gen.id, buyMode)
              const max = maxBuyCount(gen.baseCost, owned, state.ore)
              const displayCount = buyMode === 'max' ? max : buyMode
              const displayCost = buyCost(gen.baseCost, owned, Math.max(displayCount, 1))
              const rate = generatorRate(state, gen.id)
              const next = nextMilestone(owned)

              return (
                <li key={gen.id} className={`rig ${affordable ? 'is-ready' : ''}`}>
                  <span className="rig-icon" aria-hidden="true">
                    {gen.icon}
                  </span>
                  <div className="rig-body">
                    <div className="rig-head">
                      <strong>{gen.name}</strong>
                      <span className="rig-owned">{owned}</span>
                    </div>
                    <p>{gen.flavor}</p>
                    <div className="rig-meta">
                      <span>{formatRate(rate)}</span>
                      {next ? <span>next boost at {next}</span> : <span>max boost</span>}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="buy-btn"
                    disabled={!affordable}
                    onClick={() => onBuyGenerator(gen.id)}
                  >
                    <span>{buyMode === 'max' ? (max > 0 ? `Buy ${max}` : 'Buy') : `Buy ${displayCount}`}</span>
                    <span>{formatNumber(displayCost)} ore</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}

      {tab === 'clicks' && (
        <>
          <div className="click-panel">
            <p className="warp-kicker">Manual mining</p>
            <h2>Strike power {formatNumber(clickPower(state))}</h2>
            <p>Temper the pick for more ore per hit, then install tools that multiply every strike.</p>
          </div>
          <BuyModes buyMode={buyMode} onBuyMode={onBuyMode} />
          <ul className="upgrade-list">
            <li className={`upgrade ${canRank ? 'is-ready' : ''}`}>
              <div>
                <strong>Pick Tempering</strong>
                <p>+1 base strike before multipliers. Rank {formatNumber(ranks, 0)} · base hit {formatNumber(1 + ranks, 0)}</p>
              </div>
              <button type="button" className="buy-btn" disabled={!canRank} onClick={onBuyClickRanks}>
                <span>
                  {buyMode === 'max'
                    ? rankCount > 0
                      ? `Buy ${rankCount}`
                      : 'Buy'
                    : `Buy ${rankCount}`}
                </span>
                <span>{formatNumber(rankCost)} ore</span>
              </button>
            </li>
          </ul>
          <UpgradeList
            state={state}
            upgrades={UPGRADES.filter((upgrade) => upgrade.kind === 'click')}
            onBuyUpgrade={onBuyUpgrade}
          />
        </>
      )}

      {tab === 'upgrades' && (
        <UpgradeList
          state={state}
          upgrades={UPGRADES.filter((upgrade) => upgrade.kind !== 'click')}
          onBuyUpgrade={onBuyUpgrade}
        />
      )}

      {tab === 'warp' && (
        <div className="warp-panel">
          <p className="warp-kicker">Sector jump</p>
          <h2>Warp to a richer claim</h2>
          <p>
            Collapse this operation and keep your <strong>core fragments</strong>. Unspent cores
            still boost all mining by 10% each. Spend them below on upgrades that survive every warp.
          </p>
          <dl className="warp-stats">
            <div>
              <dt>Unspent cores</dt>
              <dd>{formatNumber(state.cores, 0)}</dd>
            </div>
            <div>
              <dt>Unspent bonus</dt>
              <dd>×{coreMultiplier(state).toFixed(1)}</dd>
            </div>
            <div>
              <dt>This warp</dt>
              <dd>+{formatNumber(gain, 0)} cores</dd>
            </div>
          </dl>
          <button type="button" className="btn warp-btn" disabled={gain <= 0} onClick={onWarp}>
            {gain > 0 ? `Warp  ·  +${formatNumber(gain, 0)} cores` : 'Earn 1M ore this shift to warp'}
          </button>
          <p className="warp-note">
            Rigs, gear, and pick tempering reset. Cores, foundry upgrades, and logged claims stay.
          </p>

          <h3 className="core-heading">Core foundry</h3>
          <p className="warp-note">Permanent. Costs unspent cores.</p>
          <ul className="upgrade-list core-list">
            {CORE_PERKS.map((perk) => {
              const owned = perkRank(state, perk.id)
              const maxed = owned >= perk.maxRanks
              const cost = perkCost(perk.id, owned)
              const affordable = !maxed && state.cores >= cost
              return (
                <li
                  key={perk.id}
                  className={`upgrade ${maxed ? 'is-owned' : ''} ${affordable ? 'is-ready' : ''}`}
                >
                  <div>
                    <strong>{perk.name}</strong>
                    <p>{perk.flavor}</p>
                    <div className="rig-meta">
                      <span>
                        {owned}/{perk.maxRanks}
                      </span>
                      <span>{perkBonusLabel(perk, owned)}</span>
                    </div>
                  </div>
                  {maxed ? (
                    <span className="owned-tag">Maxed</span>
                  ) : (
                    <button
                      type="button"
                      className="buy-btn is-cores"
                      disabled={!affordable}
                      onClick={() => onBuyCorePerk(perk.id)}
                    >
                      <span>Spend</span>
                      <span>
                        {formatNumber(cost, 0)} core{cost === 1 ? '' : 's'}
                      </span>
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {tab === 'log' && (
        <div className="log-panel">
          <dl className="stat-grid">
            <div>
              <dt>Shift ore</dt>
              <dd>{formatNumber(state.runEarned)}</dd>
            </div>
            <div>
              <dt>Lifetime ore</dt>
              <dd>{formatNumber(state.lifetimeEarned)}</dd>
            </div>
            <div>
              <dt>Strikes</dt>
              <dd>{formatNumber(state.lifetimeClicks, 0)}</dd>
            </div>
            <div>
              <dt>Warps</dt>
              <dd>{formatNumber(state.warps, 0)}</dd>
            </div>
            <div>
              <dt>Cores found</dt>
              <dd>{formatNumber(state.lifetimeCores, 0)}</dd>
            </div>
            <div>
              <dt>Time in belt</dt>
              <dd>{formatDuration((state.lastTick - state.startedAt) / 1000)}</dd>
            </div>
          </dl>
          <h3>Claims logged</h3>
          <ul className="achieve-list">
            {ACHIEVEMENTS.map((achievement) => {
              const got = state.achievements.includes(achievement.id)
              return (
                <li key={achievement.id} className={got ? 'is-got' : ''}>
                  <strong>{got ? achievement.name : '????'}</strong>
                  <span>{got ? achievement.flavor : 'Keep mining.'}</span>
                </li>
              )
            })}
          </ul>
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              if (window.confirm('Abandon this claim forever? This wipes all progress.')) {
                onHardReset()
              }
            }}
          >
            Abandon claim
          </button>
        </div>
      )}
    </section>
  )
}

function BuyModes({
  buyMode,
  onBuyMode,
}: {
  buyMode: BuyMode
  onBuyMode: (mode: BuyMode) => void
}) {
  return (
    <div className="buy-modes" role="group" aria-label="Buy amount">
      {([1, 10, 100, 'max'] as const).map((mode) => (
        <button
          key={mode}
          type="button"
          className={`buy-mode ${buyMode === mode ? 'is-active' : ''}`}
          onClick={() => onBuyMode(mode)}
        >
          {mode === 'max' ? 'Max' : `×${mode}`}
        </button>
      ))}
    </div>
  )
}

function UpgradeList({
  state,
  upgrades,
  onBuyUpgrade,
}: {
  state: GameState
  upgrades: UpgradeDef[]
  onBuyUpgrade: (id: string) => void
}) {
  return (
    <ul className="upgrade-list">
      {upgrades.map((upgrade) => {
        const owned = Boolean(state.upgrades[upgrade.id])
        if (!owned && upgrade.requires) {
          const have = state.generators[upgrade.requires.generatorId] ?? 0
          if (have < 1) return null
        }
        const available = upgradeAvailable(state, upgrade.id)
        const locked = !owned && !available
        const affordable = !owned && available && state.ore >= upgrade.cost

        return (
          <li
            key={upgrade.id}
            className={`upgrade ${owned ? 'is-owned' : ''} ${locked ? 'is-locked' : ''} ${affordable ? 'is-ready' : ''}`}
          >
            <div>
              <strong>{upgrade.name}</strong>
              <p>{locked ? 'Requirements not met yet.' : upgrade.flavor}</p>
            </div>
            {owned ? (
              <span className="owned-tag">Installed</span>
            ) : (
              <button
                type="button"
                className="buy-btn"
                disabled={!affordable}
                onClick={() => onBuyUpgrade(upgrade.id)}
              >
                <span>Install</span>
                <span>{formatNumber(upgrade.cost)} ore</span>
              </button>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function perkBonusLabel(perk: CorePerkDef, ranks: number): string {
  if (ranks <= 0) return 'Not bought'
  switch (perk.kind) {
    case 'prod':
    case 'click':
      return `+${Math.round(perk.perRank * ranks * 100)}% now`
    case 'startOre':
      return `${formatNumber(perk.perRank * ranks, 0)} ore on warp`
    case 'crit':
      return `+${Math.round(perk.perRank * ranks * 100)}% crit chance`
    case 'startRanks':
      return `+${perk.perRank * ranks} temper on warp`
    case 'offline':
      return `+${perk.perRank * ranks / 3600}h offline`
    case 'startDrone':
      return 'Start with 1 drone'
  }
}

function labelFor(tab: Tab): string {
  switch (tab) {
    case 'rigs':
      return 'Rigs'
    case 'clicks':
      return 'Clicks'
    case 'upgrades':
      return 'Gear'
    case 'warp':
      return 'Warp'
    case 'log':
      return 'Log'
  }
}
