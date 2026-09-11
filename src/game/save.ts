import { SAVE_KEY } from './data'
import {
  createNewGame,
  isValidContract,
  rollContract,
  type GameState,
} from './engine'
import SaveVault, { vaultAvailable } from '../plugins/saveVault'

export function parseSave(raw: string): GameState | null {
  try {
    const parsed = JSON.parse(raw) as Partial<GameState>
    const fresh = createNewGame()
    return {
      ...fresh,
      ...parsed,
      generators: { ...fresh.generators, ...parsed.generators },
      upgrades: { ...fresh.upgrades, ...parsed.upgrades },
      corePerks: { ...fresh.corePerks, ...parsed.corePerks },
      achievements: parsed.achievements ?? [],
      combo: typeof parsed.combo === 'number' ? parsed.combo : 0,
      lastComboAt: typeof parsed.lastComboAt === 'number' ? parsed.lastComboAt : 0,
      contractsDone: typeof parsed.contractsDone === 'number' ? parsed.contractsDone : 0,
      contract: isValidContract(parsed.contract)
        ? parsed.contract
        : rollContract(parsed.warps ?? 0, parsed.lifetimeEarned ?? 0),
    }
  } catch {
    return null
  }
}

export function loadSave(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    return parseSave(raw)
  } catch {
    return null
  }
}

export function writeSave(state: GameState): void {
  try {
    const raw = JSON.stringify(state)
    localStorage.setItem(SAVE_KEY, raw)
    if (vaultAvailable()) {
      void SaveVault.write({ json: raw })
    }
  } catch {
    // Private browsing or quota — keep playing in memory.
  }
}

export async function loadDurableSave(): Promise<{ state: GameState | null; exists: boolean }> {
  if (!vaultAvailable()) return { state: null, exists: false }
  try {
    const stored = await SaveVault.read()
    if (!stored.json) return { state: null, exists: Boolean(stored.exists) }
    return { state: parseSave(stored.json), exists: true }
  } catch {
    return { state: null, exists: false }
  }
}

export async function prepareDurableRestore(): Promise<boolean> {
  if (!vaultAvailable()) return false
  try {
    const result = await SaveVault.prepareRestore()
    return Boolean(result.needsPermission)
  } catch {
    return false
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY)
  } catch {
    // ignore
  }
  if (vaultAvailable()) {
    void SaveVault.clear()
  }
}
