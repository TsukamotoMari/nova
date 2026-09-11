import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { useCallback, useEffect, useRef, useState } from 'react'
import { play } from '../game/audio'
import { ACHIEVEMENTS } from '../game/data'
import {
  applyContract,
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
import { formatNumber } from '../game/numbers'
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

const TICK_MS = 250
const UI_MS = 100
const SAVE_SEC = 2
const CATCHUP_SEC = 30

export function useGame() {
  const stateRef = useRef<GameState>(createNewGame())
  const [state, setState] = useState<GameState>(() => createNewGame())
  const [buyMode, setBuyMode] = useState<BuyMode>(1)
  const buyModeRef = useRef<BuyMode>(1)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [offline, setOffline] = useState<OfflineReport | null>(null)
  const toastId = useRef(0)

  const publish = useCallback((next: GameState) => {
    const applied = applyContract(next)
    const collected = collectAchievements(applied.state)
    stateRef.current = collected.state
    setState(collected.state)

    const extra: Toast[] = []
    if (applied.justCompleted && applied.state.contract) {
      toastId.current += 1
      extra.push({
        id: toastId.current,
        title: 'Contract paid',
        flavor: `+${formatNumber(applied.state.contract.reward)} ore hits the hold.`,
      })
      play('contract')
    }
    if (collected.unlocked.length > 0) {
      extra.push(
        ...collected.unlocked.map((id) => {
          const def = ACHIEVEMENTS.find((a) => a.id === id)
          toastId.current += 1
          return {
            id: toastId.current,
            title: def?.name ?? 'Claim logged',
            flavor: def?.flavor ?? '',
          }
        }),
      )
    }
    if (extra.length === 0) return
    setToasts((prev) => [...prev, ...extra].slice(-4))
    for (const toast of extra) {
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== toast.id))
      }, 4200)
    }
  }, [])

  useEffect(() => {
    buyModeRef.current = buyMode
  }, [buyMode])

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setInterval> | null = null
    let saveAcc = 0
    let uiAcc = 0
    let started = false
    let paused = false

    const persist = () => {
      if (!started) return
      writeSave(stateRef.current)
    }

    const creditAway = () => {
      const offlineResult = applyOffline(stateRef.current)
      publish(offlineResult.state)
      if (offlineResult.elapsed >= 60 && offlineResult.earned > 0) {
        setOffline({ elapsed: offlineResult.elapsed, earned: offlineResult.earned })
      }
      writeSave(offlineResult.state)
    }

    const step = () => {
      if (cancelled || paused) return
      const now = Date.now()
      const elapsed = (now - stateRef.current.lastTick) / 1000
      if (elapsed <= 0) return
      const dt = Math.min(elapsed, CATCHUP_SEC)
      stateRef.current = tick(stateRef.current, dt, now)
      saveAcc += dt
      uiAcc += dt
      if (uiAcc >= UI_MS / 1000) {
        uiAcc = 0
        publish(stateRef.current)
      }
      if (saveAcc >= SAVE_SEC) {
        saveAcc = 0
        writeSave(stateRef.current)
      }
    }

    const stopLoop = () => {
      if (timer) clearInterval(timer)
      timer = null
    }

    const startLoop = () => {
      stopLoop()
      timer = setInterval(step, TICK_MS)
      step()
    }

    const pause = () => {
      if (paused) return
      paused = true
      stopLoop()
      persist()
    }

    const resume = () => {
      if (cancelled || !started) return
      if (document.visibilityState === 'hidden') return
      paused = false
      creditAway()
      startLoop()
    }

    const begin = (base: GameState) => {
      if (cancelled || started) return
      started = true
      stateRef.current = base
      creditAway()
      startLoop()
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
        pause()
        return
      }
      if (!started) {
        void loadDurableSave().then((vault) => {
          if (cancelled || started) return
          begin(vault.state ?? createNewGame())
        })
        return
      }
      resume()
    }

    const onFocus = () => {
      if (cancelled || !started) return
      resume()
    }

    window.addEventListener('beforeunload', persist)
    window.addEventListener('pagehide', persist)
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisible)

    const appListeners: Array<{ remove: () => void }> = []
    if (Capacitor.isNativePlatform()) {
      void App.addListener('pause', () => pause()).then((handle) => appListeners.push(handle))
      void App.addListener('resume', () => resume()).then((handle) => appListeners.push(handle))
    }

    return () => {
      cancelled = true
      stopLoop()
      persist()
      for (const handle of appListeners) handle.remove()
      window.removeEventListener('beforeunload', persist)
      window.removeEventListener('pagehide', persist)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [publish])

  const strike = useCallback(
    (opts?: { auto?: boolean }) => {
      const result = mine(stateRef.current, opts)
      if (!opts?.auto) play(result.crit ? 'crit' : 'strike')
      publish(result.state)
      return result
    },
    [publish],
  )

  const buyGenerator = useCallback(
    (id: string) => {
      const before = stateRef.current
      const next = purchaseGenerator(before, id, buyModeRef.current)
      if (next !== before) play('buy')
      publish(next)
    },
    [publish],
  )

  const buyUpgrade = useCallback(
    (id: string) => {
      const before = stateRef.current
      const next = purchaseUpgrade(before, id)
      if (next !== before) play('buy')
      publish(next)
    },
    [publish],
  )

  const buyClickRanks = useCallback(() => {
    const before = stateRef.current
    const next = purchaseClickRanks(before, buyModeRef.current)
    if (next !== before) play('buy')
    publish(next)
  }, [publish])

  const buyCorePerk = useCallback((id: string) => {
    const before = stateRef.current
    const next = purchaseCorePerk(before, id)
    if (next !== before) play('buy')
    publish(next)
  }, [publish])

  const doWarp = useCallback(() => {
    const before = stateRef.current
    const next = warp(before)
    if (next !== before) play('warp')
    publish(next)
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
