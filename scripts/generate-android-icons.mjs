import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const publicDir = path.join(root, 'public')
const resourcesDir = path.join(root, 'resources')
const background = '#07080d'

const iconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="${background}"/>
  <circle cx="512" cy="512" r="280" fill="#3a2b22"/>
  <circle cx="512" cy="512" r="250" fill="#8a6a4e"/>
  <circle cx="430" cy="430" r="70" fill="#f3d7a4" opacity="0.45"/>
  <circle cx="390" cy="470" r="48" fill="#3a2b22"/>
  <circle cx="620" cy="560" r="36" fill="#5c4334"/>
  <circle cx="560" cy="380" r="22" fill="#5c4334"/>
  <path d="M240 700 L780 340" stroke="#ffb020" stroke-width="36" stroke-linecap="round"/>
</svg>
`

await mkdir(resourcesDir, { recursive: true })

const icon1024 = await sharp(Buffer.from(iconSvg)).png().toBuffer()
await sharp(icon1024).toFile(path.join(resourcesDir, 'icon.png'))
await sharp(icon1024).resize(32, 32).toFile(path.join(publicDir, 'favicon-32.png'))
await sharp(icon1024).resize(180, 180).toFile(path.join(publicDir, 'apple-touch-icon.png'))
await sharp(icon1024).resize(192, 192).toFile(path.join(publicDir, 'icon-192.png'))
await sharp(icon1024).resize(512, 512).toFile(path.join(publicDir, 'icon-512.png'))

await sharp({
  create: { width: 2732, height: 2732, channels: 4, background },
})
  .composite([{ input: await sharp(icon1024).resize(900, 900).toBuffer(), gravity: 'centre' }])
  .png()
  .toFile(path.join(resourcesDir, 'splash.png'))

console.log('Generated launcher and web icons')
