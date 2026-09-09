import { registerPlugin } from '@capacitor/core'

export const SITE_URL = 'https://maris-indie-games.vercel.app/'

export interface SiteLinkPlugin {
  open(options: { url: string }): Promise<void>
}

const SiteLink = registerPlugin<SiteLinkPlugin>('SiteLink', {
  web: {
    async open(options: { url: string }) {
      window.open(options.url, '_blank', 'noopener')
    },
  },
})

export function openSite() {
  return SiteLink.open({ url: SITE_URL })
}

export default SiteLink
