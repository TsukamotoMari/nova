import { Capacitor, registerPlugin } from '@capacitor/core'

export interface SaveVaultPlugin {
  write(options: { json: string }): Promise<void>
  read(): Promise<{ json?: string; exists?: boolean }>
  clear(): Promise<void>
  prepareRestore(): Promise<{ needsPermission?: boolean }>
}

const SaveVault = registerPlugin<SaveVaultPlugin>('SaveVault', {
  web: {
    async write() {},
    async read() {
      return {}
    },
    async clear() {},
    async prepareRestore() {
      return { needsPermission: false }
    },
  },
})

export function vaultAvailable(): boolean {
  return Capacitor.isNativePlatform()
}

export default SaveVault
