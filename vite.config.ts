import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vite'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string
}

const versionCode = process.env.VERSION_CODE ?? '1'
process.env.VITE_APP_VERSION = pkg.version
process.env.VITE_VERSION_CODE = versionCode
if (!process.env.VITE_GITHUB_REPO && process.env.GITHUB_REPOSITORY) {
  process.env.VITE_GITHUB_REPO = process.env.GITHUB_REPOSITORY
}

const githubRepo = process.env.VITE_GITHUB_REPO ?? ''
const pages = process.env.GITHUB_PAGES === '1'
const repoName = githubRepo.split('/')[1] || 'nova'

function versionPlugin(): Plugin {
  return {
    name: 'nova-version',
    generateBundle() {
      const apkName = `nova-${pkg.version}-${versionCode}.apk`
      const apkUrl = githubRepo
        ? `https://github.com/${githubRepo}/releases/download/v${pkg.version}-${versionCode}/${apkName}`
        : ''
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify(
          {
            version: pkg.version,
            versionCode: Number(versionCode),
            apkName,
            apkUrl,
          },
          null,
          2,
        ),
      })
    },
  }
}

export default defineConfig({
  base: pages ? `/${repoName}/` : './',
  plugins: [react(), versionPlugin()],
})
