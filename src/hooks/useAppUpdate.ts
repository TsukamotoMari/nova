import { Capacitor } from '@capacitor/core'
import { useEffect, useState } from 'react'

export interface RemoteVersion {
  version: string
  versionCode: number
  apkUrl: string
}

const LOCAL_VERSION = import.meta.env.VITE_APP_VERSION ?? '0.0.0'
const LOCAL_VERSION_CODE = Number(import.meta.env.VITE_VERSION_CODE ?? 1)
const REPO = import.meta.env.VITE_GITHUB_REPO ?? ''

export function useAppUpdate() {
  const [update, setUpdate] = useState<RemoteVersion | null>(null)

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !REPO) return
    const [owner, repo] = REPO.split('/')
    if (!owner || !repo) return

    const ctrl = new AbortController()

    void (async () => {
      const pagesUrl = `https://${owner}.github.io/${repo}/version.json`
      try {
        const res = await fetch(pagesUrl, { signal: ctrl.signal, cache: 'no-store' })
        if (!res.ok) return
        const data = (await res.json()) as RemoteVersion
        if (data.versionCode > LOCAL_VERSION_CODE && data.apkUrl) {
          setUpdate(data)
        }
      } catch {
        // Offline or GitHub Pages not published yet — keep playing the bundled build.
      }
    })()

    return () => ctrl.abort()
  }, [])

  return {
    update,
    localVersion: LOCAL_VERSION,
    install() {
      if (!update?.apkUrl) return
      window.open(update.apkUrl, '_blank', 'noopener')
    },
  }
}
