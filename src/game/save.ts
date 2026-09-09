import { SAVE_KEY } from './data'
import { createNewGame, type GameState } from './engine'

export function loadSave(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<GameState>
    const fresh = createNewGame()
    return {
      ...fresh,
      ...parsed,
      generators: { ...fresh.generators, ...parsed.generators },
      upgrades: { ...fresh.upgrades, ...parsed.upgrades },
      corePerks: { ...fresh.corePerks, ...parsed.corePerks },
      achievements: parsed.achievements ?? [],
    }
  } catch {
    return null
  }
}

export function writeSave(state: GameState): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state))
  } catch {
    // Private browsing or quota — keep playing in memory.
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY)
  } catch {
    // ignore
  }
}
