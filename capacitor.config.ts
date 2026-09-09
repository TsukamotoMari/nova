import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.nova.mining',
  appName: 'Nova',
  webDir: 'dist',
  android: {
    backgroundColor: '#07080d',
  },
  server: {
    androidScheme: 'https',
    allowNavigation: ['github.com', '*.github.io', '*.githubusercontent.com'],
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#07080d',
      overlaysWebView: false,
    },
  },
}

export default config
