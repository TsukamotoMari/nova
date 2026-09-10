import { registerPlugin } from '@capacitor/core'

export interface UpdateInstallResult {
  needsPermission?: boolean
  ready?: boolean
  launched?: boolean
}

export interface UpdateInstallerPlugin {
  install(options: {
    url: string
    fallbackUrl?: string
    versionCode?: number
  }): Promise<UpdateInstallResult>
  openInstaller(): Promise<UpdateInstallResult>
}

const UpdateInstaller = registerPlugin<UpdateInstallerPlugin>('UpdateInstaller', {
  web: {
    async install(options: { url: string }) {
      window.open(options.url, '_blank', 'noopener')
      return { ready: true, launched: true }
    },
    async openInstaller() {
      return { launched: true, ready: true }
    },
  },
})

export default UpdateInstaller
