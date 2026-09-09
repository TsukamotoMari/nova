import { useCallback, useEffect, useRef, useState } from 'react'
import { ACHIEVEMENTS } from '../game/data'
import {
  applyOffline,
  collectAchievements,
  createNewGame,
  mine,
  productionRate,
  purchaseGenerator,
  purchaseUpgrade,
  purchaseClickRanks,
  purchaseCorePerk,
  tick,
  warp,
  type BuyMode,
  type GameState,
} from '../game/engine'
import { clearSave, loadDurableSave, loadSave, prepareDurableRestore, writeSave } from '../game/save'

export interface Toast {
  id: number
  title: string
  flavor: string
}

export interface OfflineReport {
  elapsed: number
  earned: number
}

export function useGame() {
  const stateRef = useRef<GameState>(createNewGame())
  const [state, setState] = useState<GameState>(() => createNewGame())
  const [buyMode, setBuyMode] = useState<BuyMode>(1)
  const buyModeRef = useRef<BuyMode>(1)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [offline, setOffline] = useState<OfflineReport | null>(null)
  const toastId = useRef(0)

  const publish = useCallback((next: GameState) => {
    const collected = collectAchievements(next)
    stateRef.current = collected.state
    setState(collected.state)
    if (collected.unlocked.length > 0) {
      const extra = collected.unlocked.map((id) => {
        const def = ACHIEVEMENTS.find((a) => a.id === id)
        toastId.current += 1
        return {
          id: toastId.current,
          title: def?.name ?? 'Claim logged',
          flavor: def?.flavor ?? '',
        }
      })
      setToasts((prev) => [...prev, ...extra].slice(-4))
      for (const toast of extra) {
        window.setTimeout(() => {
          setToasts((prev) => prev.filter((item) => item.id !== toast.id))
        }, 4200)
      }
    }
  }, [])

  useEffect(() => {
    buyModeRef.current = buyMode
  }, [buyMode])

  useEffect(() => {
    let cancelled = false
    let frame = 0
    let last = performance.now()
    let uiAcc = 0
    let saveAcc = 0
    let started = false

    const creditAway = () => {
      const offlineResult = applyOffline(stateRef.current)
      publish(offlineResult.state)
      if (offlineResult.elapsed >= 60 && offlineResult.earned > 0) {
        setOffline({ elapsed: offlineResult.elapsed, earned: offlineResult.earned })
      }
      writeSave(offlineResult.state)
    }

    const loop = (now: number) => {
      if (cancelled || document.visibilityState === 'hidden') return
      const dt = Math.min((now - last) / 1000, 1)
      last = now
      stateRef.current = tick(stateRef.current, dt)
      uiAcc += dt
      saveAcc += dt
      if (uiAcc >= 0.1) {
        uiAcc = 0
        publish(stateRef.current)
      }
      if (saveAcc >= 2) {
        saveAcc = 0
        writeSave(stateRef.current)
      }
      frame = requestAnimationFrame(loop)
    }

    const startLoop = () => {
      last = performance.now()
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(loop)
    }

    const begin = (base: GameState) => {
      if (cancelled || started) return
      started = true
      stateRef.current = base
      creditAway()
      startLoop()
    }

    const persist = () => {
      if (!started) return
      writeSave(stateRef.current)
    }

    const boot = async () => {
      const local = loadSave()
      if (local) {
        begin(local)
        return
      }

      let vault = await loadDurableSave()
      if (!vault.state && vault.exists) {
        const needsPermission = await prepareDurableRestore()
        if (needsPermission) return
        vault = await loadDurableSave()
      }
      if (cancelled) return
      if (!vault.state && vault.exists) return
      begin(vault.state ?? createNewGame())
    }

    void boot()

    const onVisible = () => {
      if (cancelled) return
      if (document.visibilityState === 'hidden') {
        persist()
        return
      }
      if (!started) {
        void loadDurableSave().then((vault) => {
          if (cancelled || started) return
          begin(vault.state ?? createNewGame())
        })
        return
      }
      creditAway()
      startLoop()
    }

    window.addEventListener('beforeunload', persist)
    window.addEventListener('pagehide', persist)
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
      persist()
      window.removeEventListener('beforeunload', persist)
      window.removeEventListener('pagehide', persist)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [publish])

  const strike = useCallback(() => {
    const result = mine(stateRef.current)
    publish(result.state)
    return result
  }, [publish])

  const buyGenerator = useCallback(
    (id: string) => {
      publish(purchaseGenerator(stateRef.current, id, buyModeRef.current))
    },
    [publish],
  )

  const buyUpgrade = useCallback(
    (id: string) => {
      publish(purchaseUpgrade(stateRef.current, id))
    },
    [publish],
  )

  const buyClickRanks = useCallback(() => {
    publish(purchaseClickRanks(stateRef.current, buyModeRef.current))
  }, [publish])

  const buyCorePerk = useCallback((id: string) => {
    publish(purchaseCorePerk(stateRef.current, id))
  }, [publish])

  const doWarp = useCallback(() => {
    publish(warp(stateRef.current))
  }, [publish])

  const hardReset = useCallback(() => {
    clearSave()
    publish(createNewGame())
    setOffline(null)
  }, [publish])

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  return {
    state,
    rate: productionRate(state),
    buyMode,
    setBuyMode,
    toasts,
    offline,
    dismissOffline: () => setOffline(null),
    dismissToast,
    strike,
    buyGenerator,
    buyUpgrade,
    buyClickRanks,
    buyCorePerk,
    doWarp,
    hardReset,
  }
}
