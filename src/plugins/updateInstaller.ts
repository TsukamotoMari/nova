import { registerPlugin } from '@capacitor/core'

export interface UpdateInstallerPlugin {
  install(options: { url: string }): Promise<{ needsPermission?: boolean }>
}

const UpdateInstaller = registerPlugin<UpdateInstallerPlugin>('UpdateInstaller', {
  web: {
    async install(options: { url: string }) {
      window.open(options.url, '_blank', 'noopener')
      return {}
    },
  },
})

export default UpdateInstaller
