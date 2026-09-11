import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const publicDir = path.join(root, 'public')
const resourcesDir = path.join(root, 'resources')
const asteroidPath = path.join(publicDir, 'asteroid.png')
const background = { r: 7, g: 8, b: 13, alpha: 1 }

await mkdir(resourcesDir, { recursive: true })

const asteroid = await sharp(asteroidPath)
  .resize(860, 860, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer()

const icon1024 = await sharp({
  create: { width: 1024, height: 1024, channels: 4, background },
})
  .composite([{ input: asteroid, gravity: 'centre' }])
  .png()
  .toBuffer()

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

console.log('Generated launcher and web icons from public/asteroid.png')
