import {
  ACHIEVEMENTS,
  CLICK_RANK_BASE,
  CORE_PERKS,
  COST_SCALE,
  GENERATORS,
  OFFLINE_CAP_SECONDS,
  UPGRADES,
  generatorById,
  milestoneMultiplier,
  perkById,
  prestigeGain,
  upgradeById,
} from './data'

export interface GameState {
  ore: number
  runEarned: number
  lifetimeEarned: number
  clicks: number
  lifetimeClicks: number
  generators: Record<string, number>
  upgrades: Record<string, boolean>
  clickRanks: number
  cores: number
  corePerks: Record<string, number>
  lifetimeCores: number
  warps: number
  achievements: string[]
  startedAt: number
  lastTick: number
}

export function emptyGenerators(): Record<string, number> {
  return Object.fromEntries(GENERATORS.map((g) => [g.id, 0]))
}

export function createNewGame(now = Date.now()): GameState {
  return {
    ore: 0,
    runEarned: 0,
    lifetimeEarned: 0,
    clicks: 0,
    lifetimeClicks: 0,
    generators: emptyGenerators(),
    upgrades: {},
    clickRanks: 0,
    cores: 0,
    corePerks: {},
    lifetimeCores: 0,
    warps: 0,
    achievements: [],
    startedAt: now,
    lastTick: now,
  }
}

export function buyCost(baseCost: number, owned: number, count: number): number {
  if (count <= 0) return 0
  const first = baseCost * COST_SCALE ** owned
  if (count === 1) return first
  return (first * (COST_SCALE ** count - 1)) / (COST_SCALE - 1)
}

export function maxBuyCount(baseCost: number, owned: number, ore: number): number {
  const first = baseCost * COST_SCALE ** owned
  if (ore < first || first <= 0) return 0
  return Math.max(
    0,
    Math.floor(Math.log((ore * (COST_SCALE - 1)) / first + 1) / Math.log(COST_SCALE)),
  )
}

export function perkRank(state: GameState, id: string): number {
  return state.corePerks?.[id] ?? 0
}

export function perkCost(id: string, owned: number): number {
  const def = perkById(id)
  return Math.max(1, Math.ceil(def.baseCost * def.costScale ** owned))
}

export function prodPerkMultiplier(state: GameState): number {
  return 1 + perkRank(state, 'core-prod') * 0.15
}

export function clickPerkMultiplier(state: GameState): number {
  return 1 + perkRank(state, 'core-click') * 0.15
}

export function critChance(state: GameState): number {
  return Math.min(0.35, 0.03 + perkRank(state, 'core-crit') * 0.03)
}

export function startingOre(state: GameState): number {
  return perkRank(state, 'core-cache') * 500
}

export function startingClickRanks(state: GameState): number {
  return perkRank(state, 'core-temper') * 3
}

export function offlineCap(state: GameState): number {
  return OFFLINE_CAP_SECONDS + perkRank(state, 'core-offline') * 4 * 3600
}

export function clickPower(state: GameState): number {
  let power = 1 + (state.clickRanks ?? 0)
  for (const upgrade of UPGRADES) {
    if (upgrade.kind === 'click' && state.upgrades[upgrade.id]) {
      power *= upgrade.multiplier
    }
  }
  return power * coreMultiplier(state) * clickPerkMultiplier(state)
}

export function coreMultiplier(state: GameState): number {
  return 1 + state.cores * 0.1
}

export function generatorRate(state: GameState, id: string): number {
  const def = generatorById(id)
  const owned = state.generators[id] ?? 0
  if (owned <= 0) return 0
  let mult = milestoneMultiplier(owned) * coreMultiplier(state) * prodPerkMultiplier(state)
  for (const upgrade of UPGRADES) {
    if (!state.upgrades[upgrade.id]) continue
    if (upgrade.kind === 'global') mult *= upgrade.multiplier
    if (upgrade.kind === 'generator' && upgrade.generatorId === id) {
      mult *= upgrade.multiplier
    }
  }
  return owned * def.baseRate * mult
}

export function productionRate(state: GameState): number {
  return GENERATORS.reduce((sum, gen) => sum + generatorRate(state, gen.id), 0)
}

export function addOre(state: GameState, amount: number): GameState {
  if (amount <= 0) return state
  return {
    ...state,
    ore: state.ore + amount,
    runEarned: state.runEarned + amount,
    lifetimeEarned: state.lifetimeEarned + amount,
  }
}

export function tick(state: GameState, dt: number, now = Date.now()): GameState {
  const earned = productionRate(state) * Math.max(0, dt)
  return { ...addOre(state, earned), lastTick: now }
}

export function applyOffline(
  state: GameState,
  now = Date.now(),
): { state: GameState; elapsed: number; earned: number } {
  const elapsed = Math.min(Math.max(0, (now - state.lastTick) / 1000), offlineCap(state))
  const earned = productionRate(state) * elapsed
  return {
    state: { ...addOre(state, earned), lastTick: now },
    elapsed,
    earned,
  }
}

export interface ClickResult {
  state: GameState
  gained: number
  crit: boolean
}

export function mine(state: GameState): ClickResult {
  const crit = Math.random() < critChance(state)
  const gained = clickPower(state) * (crit ? 7 : 1)
  return {
    state: {
      ...addOre(state, gained),
      clicks: state.clicks + 1,
      lifetimeClicks: state.lifetimeClicks + 1,
    },
    gained,
    crit,
  }
}

export type BuyMode = 1 | 10 | 100 | 'max'

export function purchaseCount(mode: BuyMode, defBase: number, owned: number, ore: number): number {
  if (mode === 'max') return maxBuyCount(defBase, owned, ore)
  return mode
}

export function purchaseGenerator(state: GameState, id: string, mode: BuyMode): GameState {
  const def = generatorById(id)
  const owned = state.generators[id] ?? 0
  const count = purchaseCount(mode, def.baseCost, owned, state.ore)
  if (count <= 0) return state
  const cost = buyCost(def.baseCost, owned, count)
  if (state.ore < cost) return state
  return {
    ...state,
    ore: state.ore - cost,
    generators: { ...state.generators, [id]: owned + count },
  }
}

export function canAffordGenerator(state: GameState, id: string, mode: BuyMode): boolean {
  const def = generatorById(id)
  const owned = state.generators[id] ?? 0
  const count = purchaseCount(mode, def.baseCost, owned, state.ore)
  if (count <= 0) return false
  return state.ore >= buyCost(def.baseCost, owned, count)
}

export function upgradeAvailable(state: GameState, id: string): boolean {
  if (state.upgrades[id]) return false
  const upgrade = upgradeById(id)
  if (upgrade.requires) {
    const owned = state.generators[upgrade.requires.generatorId] ?? 0
    if (owned < upgrade.requires.owned) return false
  }
  return true
}

export function purchaseUpgrade(state: GameState, id: string): GameState {
  if (!upgradeAvailable(state, id)) return state
  const upgrade = upgradeById(id)
  if (state.ore < upgrade.cost) return state
  return {
    ...state,
    ore: state.ore - upgrade.cost,
    upgrades: { ...state.upgrades, [id]: true },
  }
}

export function purchaseClickRanks(state: GameState, mode: BuyMode): GameState {
  const owned = state.clickRanks ?? 0
  const count = purchaseCount(mode, CLICK_RANK_BASE, owned, state.ore)
  if (count <= 0) return state
  const cost = buyCost(CLICK_RANK_BASE, owned, count)
  if (state.ore < cost) return state
  return {
    ...state,
    ore: state.ore - cost,
    clickRanks: owned + count,
  }
}

export function canAffordClickRanks(state: GameState, mode: BuyMode): boolean {
  const owned = state.clickRanks ?? 0
  const count = purchaseCount(mode, CLICK_RANK_BASE, owned, state.ore)
  if (count <= 0) return false
  return state.ore >= buyCost(CLICK_RANK_BASE, owned, count)
}

export function clickUpgradeReady(state: GameState): boolean {
  return UPGRADES.some(
    (upgrade) =>
      upgrade.kind === 'click' &&
      !state.upgrades[upgrade.id] &&
      upgradeAvailable(state, upgrade.id) &&
      state.ore >= upgrade.cost,
  )
}

export function purchaseCorePerk(state: GameState, id: string): GameState {
  const def = perkById(id)
  const owned = perkRank(state, id)
  if (owned >= def.maxRanks) return state
  const cost = perkCost(id, owned)
  if (state.cores < cost) return state
  return {
    ...state,
    cores: state.cores - cost,
    corePerks: { ...state.corePerks, [id]: owned + 1 },
  }
}

export function corePerkReady(state: GameState): boolean {
  return CORE_PERKS.some((perk) => {
    const owned = perkRank(state, perk.id)
    if (owned >= perk.maxRanks) return false
    return state.cores >= perkCost(perk.id, owned)
  })
}

export function warp(state: GameState, now = Date.now()): GameState {
  const gain = prestigeGain(state.runEarned)
  if (gain <= 0) return state
  const generators = emptyGenerators()
  if (perkRank(state, 'core-drone') >= 1) generators.drone = 1
  return {
    ...state,
    ore: startingOre(state),
    runEarned: 0,
    clicks: 0,
    generators,
    upgrades: {},
    clickRanks: startingClickRanks(state),
    cores: state.cores + gain,
    lifetimeCores: state.lifetimeCores + gain,
    warps: state.warps + 1,
    lastTick: now,
  }
}

export function achievementUnlocked(state: GameState, id: string): boolean {
  switch (id) {
    case 'first-strike':
      return state.lifetimeClicks >= 1
    case 'hundred-swings':
      return state.lifetimeClicks >= 100
    case 'first-drone':
      return (state.generators.drone ?? 0) >= 1
    case 'ten-drones':
      return (state.generators.drone ?? 0) >= 10
    case 'ore-1k':
      return state.runEarned >= 1_000 || state.lifetimeEarned >= 1_000
    case 'ore-1m':
      return state.lifetimeEarned >= 1_000_000
    case 'tug':
      return (state.generators.tug ?? 0) >= 1
    case 'siphon':
      return (state.generators.siphon ?? 0) >= 1
    case 'bore':
      return (state.generators.bore ?? 0) >= 1
    case 'first-warp':
      return state.warps >= 1
    case 'first-perk':
      return Object.values(state.corePerks ?? {}).some((rank) => rank > 0)
    case 'cores-10':
      return state.cores >= 10 || state.lifetimeCores >= 10
    case 'clicks-1k':
      return state.lifetimeClicks >= 1_000
    default:
      return false
  }
}

export function collectAchievements(state: GameState): { state: GameState; unlocked: string[] } {
  const unlocked: string[] = []
  for (const achievement of ACHIEVEMENTS) {
    if (state.achievements.includes(achievement.id)) continue
    if (achievementUnlocked(state, achievement.id)) unlocked.push(achievement.id)
  }
  if (unlocked.length === 0) return { state, unlocked }
  return {
    state: { ...state, achievements: [...state.achievements, ...unlocked] },
    unlocked,
  }
}

export function generatorVisible(state: GameState, index: number): boolean {
  if (index === 0) return true
  const previous = GENERATORS[index - 1]
  const ownedPrev = state.generators[previous.id] ?? 0
  const thisCost = GENERATORS[index].baseCost
  return ownedPrev > 0 || state.ore >= thisCost * 0.5 || state.runEarned >= thisCost * 0.4
}
