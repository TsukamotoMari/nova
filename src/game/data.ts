export const COST_SCALE = 1.15
export const CLICK_RANK_BASE = 40
export const PRESTIGE_DIVISOR = 1_000_000
export const OFFLINE_CAP_SECONDS = 8 * 3600
export const SAVE_KEY = 'nova-cosmic-mining-v1'

export interface GeneratorDef {
  id: string
  name: string
  flavor: string
  icon: string
  baseCost: number
  baseRate: number
}

export interface UpgradeDef {
  id: string
  name: string
  flavor: string
  cost: number
  kind: 'click' | 'global' | 'generator'
  multiplier: number
  generatorId?: string
  requires?: { generatorId: string; owned: number }
}

export interface AchievementDef {
  id: string
  name: string
  flavor: string
}

export const GENERATORS: GeneratorDef[] = [
  {
    id: 'drone',
    name: 'Mining Drone',
    flavor: 'A rattling probe that chips ice off nearby rocks.',
    icon: '🛸',
    baseCost: 15,
    baseRate: 0.1,
  },
  {
    id: 'extractor',
    name: 'Ore Extractor',
    flavor: 'Bolts onto an asteroid and drinks the vein dry.',
    icon: '⛏️',
    baseCost: 100,
    baseRate: 1,
  },
  {
    id: 'tug',
    name: 'Asteroid Tug',
    flavor: 'Hauls whole boulders into the smelter bay.',
    icon: '🚀',
    baseCost: 1_100,
    baseRate: 8,
  },
  {
    id: 'belt',
    name: 'Belt Harvester',
    flavor: 'A ring of nets sweeping a whole asteroid field.',
    icon: '🛰️',
    baseCost: 12_000,
    baseRate: 47,
  },
  {
    id: 'crusher',
    name: 'Moon Crusher',
    flavor: 'Chews satellites into gravel and profit.',
    icon: '🪨',
    baseCost: 130_000,
    baseRate: 260,
  },
  {
    id: 'siphon',
    name: 'Star Siphon',
    flavor: 'Skims heavy metals from a living sun.',
    icon: '☀️',
    baseCost: 1_400_000,
    baseRate: 1_400,
  },
  {
    id: 'dyson',
    name: 'Dyson Drill',
    flavor: 'A lattice of rigs wrapping a star like a cage.',
    icon: '💠',
    baseCost: 20_000_000,
    baseRate: 7_800,
  },
  {
    id: 'quarry',
    name: 'Galaxy Quarry',
    flavor: 'Open-pit mining on a spiral arm.',
    icon: '🌌',
    baseCost: 330_000_000,
    baseRate: 44_000,
  },
  {
    id: 'bore',
    name: 'Void Bore',
    flavor: 'Punches a hole in spacetime and mines the rim.',
    icon: '🕳️',
    baseCost: 5_100_000_000,
    baseRate: 260_000,
  },
]

export const UPGRADES: UpgradeDef[] = [
  {
    id: 'pick-2',
    name: 'Carbide Pick',
    flavor: 'Manual strikes mine twice as much ore.',
    cost: 100,
    kind: 'click',
    multiplier: 2,
  },
  {
    id: 'pick-4',
    name: 'Plasma Cutter',
    flavor: 'The asteroid splits on the first tap.',
    cost: 1_000,
    kind: 'click',
    multiplier: 2,
  },
  {
    id: 'pick-8',
    name: 'Gravity Hammer',
    flavor: 'Each swing collapses a seam of ore.',
    cost: 12_000,
    kind: 'click',
    multiplier: 2,
  },
  {
    id: 'pick-16',
    name: 'Quantum Spike',
    flavor: 'You hit the rock in every timeline at once.',
    cost: 150_000,
    kind: 'click',
    multiplier: 2,
  },
  {
    id: 'pick-32',
    name: 'Magma Bit',
    flavor: 'The tip drinks heat from the core.',
    cost: 1_800_000,
    kind: 'click',
    multiplier: 2,
  },
  {
    id: 'pick-64',
    name: 'Singularity Pick',
    flavor: 'Mass collapses into a single strike.',
    cost: 25_000_000,
    kind: 'click',
    multiplier: 2,
  },
  {
    id: 'pick-128',
    name: 'Horizon Tap',
    flavor: 'You mine both faces of the rock at once.',
    cost: 400_000_000,
    kind: 'click',
    multiplier: 2,
  },
  {
    id: 'global-2',
    name: 'Refinery Overclock',
    flavor: 'Every rig yields twice the ore.',
    cost: 5_000,
    kind: 'global',
    multiplier: 2,
  },
  {
    id: 'global-4',
    name: 'Dark Matter Flux',
    flavor: 'Production doubles again across the fleet.',
    cost: 500_000,
    kind: 'global',
    multiplier: 2,
  },
  {
    id: 'global-8',
    name: 'Event Horizon Smelter',
    flavor: 'Nothing that enters the hopper is wasted.',
    cost: 50_000_000,
    kind: 'global',
    multiplier: 2,
  },
  {
    id: 'drone-10',
    name: 'Swarm Protocol',
    flavor: 'Drones share maps and stop overlapping veins.',
    cost: 250,
    kind: 'generator',
    generatorId: 'drone',
    multiplier: 2,
    requires: { generatorId: 'drone', owned: 10 },
  },
  {
    id: 'extractor-10',
    name: 'Deep Core Bits',
    flavor: 'Extractors punch past the crust.',
    cost: 2_000,
    kind: 'generator',
    generatorId: 'extractor',
    multiplier: 2,
    requires: { generatorId: 'extractor', owned: 10 },
  },
  {
    id: 'tug-10',
    name: 'Tractor Array',
    flavor: 'Tugs yank three rocks at a time.',
    cost: 22_000,
    kind: 'generator',
    generatorId: 'tug',
    multiplier: 2,
    requires: { generatorId: 'tug', owned: 10 },
  },
  {
    id: 'belt-10',
    name: 'Magnetic Nets',
    flavor: 'The harvester catches dust as well as stone.',
    cost: 240_000,
    kind: 'generator',
    generatorId: 'belt',
    multiplier: 2,
    requires: { generatorId: 'belt', owned: 10 },
  },
  {
    id: 'crusher-10',
    name: 'Tidal Jaws',
    flavor: 'The moon is unspooled into rings of ore.',
    cost: 2_600_000,
    kind: 'generator',
    generatorId: 'crusher',
    multiplier: 2,
    requires: { generatorId: 'crusher', owned: 10 },
  },
  {
    id: 'siphon-10',
    name: 'Corona Tap',
    flavor: 'Star siphons drink from the photosphere.',
    cost: 28_000_000,
    kind: 'generator',
    generatorId: 'siphon',
    multiplier: 2,
    requires: { generatorId: 'siphon', owned: 10 },
  },
]

export type CorePerkKind = 'prod' | 'click' | 'startOre' | 'crit' | 'startRanks' | 'offline' | 'startDrone'

export interface CorePerkDef {
  id: string
  name: string
  flavor: string
  kind: CorePerkKind
  baseCost: number
  costScale: number
  maxRanks: number
  perRank: number
}

export const CORE_PERKS: CorePerkDef[] = [
  {
    id: 'core-prod',
    name: 'Dense Veins',
    flavor: 'Richer rock in every sector. Permanent rig output.',
    kind: 'prod',
    baseCost: 1,
    costScale: 1.55,
    maxRanks: 20,
    perRank: 0.15,
  },
  {
    id: 'core-click',
    name: 'Hardened Strike',
    flavor: 'The pick remembers every warp. Permanent strike power.',
    kind: 'click',
    baseCost: 1,
    costScale: 1.55,
    maxRanks: 20,
    perRank: 0.15,
  },
  {
    id: 'core-cache',
    name: 'Starter Hold',
    flavor: 'Begin each warp with extra ore already in the hopper.',
    kind: 'startOre',
    baseCost: 1,
    costScale: 1.8,
    maxRanks: 12,
    perRank: 500,
  },
  {
    id: 'core-crit',
    name: 'Lucky Faults',
    flavor: 'Critical strikes crack the asteroid more often.',
    kind: 'crit',
    baseCost: 2,
    costScale: 1.6,
    maxRanks: 8,
    perRank: 0.03,
  },
  {
    id: 'core-temper',
    name: 'Residual Temper',
    flavor: 'Keep some pick tempering after you warp.',
    kind: 'startRanks',
    baseCost: 2,
    costScale: 1.7,
    maxRanks: 10,
    perRank: 3,
  },
  {
    id: 'core-offline',
    name: 'Long Haul',
    flavor: 'Rigs keep mining longer while you are away.',
    kind: 'offline',
    baseCost: 3,
    costScale: 2,
    maxRanks: 3,
    perRank: 4 * 3600,
  },
  {
    id: 'core-drone',
    name: 'Keep a Probe',
    flavor: 'Start every warp with one mining drone deployed.',
    kind: 'startDrone',
    baseCost: 5,
    costScale: 1,
    maxRanks: 1,
    perRank: 1,
  },
]

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-strike', name: 'First Strike', flavor: 'Crack your first asteroid.' },
  { id: 'hundred-swings', name: 'Calloused Gloves', flavor: 'Land 100 mining strikes.' },
  { id: 'first-drone', name: 'Automation', flavor: 'Deploy a mining drone.' },
  { id: 'ten-drones', name: 'Swarm', flavor: 'Own 10 mining drones.' },
  { id: 'ore-1k', name: 'Hold Full', flavor: 'Earn 1,000 ore in a shift.' },
  { id: 'ore-1m', name: 'Claim Jumper', flavor: 'Earn 1 million ore in a shift.' },
  { id: 'tug', name: 'Heavy Haul', flavor: 'Buy an asteroid tug.' },
  { id: 'siphon', name: 'Star Thief', flavor: 'Install a star siphon.' },
  { id: 'bore', name: 'Into the Dark', flavor: 'Fire up a void bore.' },
  { id: 'first-warp', name: 'New Sector', flavor: 'Warp to a richer claim.' },
  { id: 'first-perk', name: 'Core Foundry', flavor: 'Spend a core on a permanent upgrade.' },
  { id: 'cores-10', name: 'Core Hoarder', flavor: 'Hold 10 core fragments.' },
  { id: 'clicks-1k', name: 'Forever Shift', flavor: 'Strike 1,000 times.' },
]

export const MILESTONES = [10, 25, 50, 100, 200, 300, 400, 500]

export function generatorById(id: string): GeneratorDef {
  const found = GENERATORS.find((g) => g.id === id)
  if (!found) throw new Error(`Unknown generator: ${id}`)
  return found
}

export function upgradeById(id: string): UpgradeDef {
  const found = UPGRADES.find((u) => u.id === id)
  if (!found) throw new Error(`Unknown upgrade: ${id}`)
  return found
}

export function perkById(id: string): CorePerkDef {
  const found = CORE_PERKS.find((perk) => perk.id === id)
  if (!found) throw new Error(`Unknown core perk: ${id}`)
  return found
}

export function milestoneMultiplier(owned: number): number {
  let mult = 1
  for (const mark of MILESTONES) {
    if (owned >= mark) mult *= 2
  }
  return mult
}

export function nextMilestone(owned: number): number | null {
  return MILESTONES.find((mark) => owned < mark) ?? null
}

export function prestigeGain(runEarned: number): number {
  if (runEarned < PRESTIGE_DIVISOR) return 0
  return Math.floor(Math.sqrt(runEarned / PRESTIGE_DIVISOR))
}

export function coresNeededForGain(gain: number): number {
  return Math.ceil(gain * gain * PRESTIGE_DIVISOR)
}
