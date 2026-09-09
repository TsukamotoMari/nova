import { access, chmod, cp, mkdir, readFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const androidDir = path.join(root, 'android')
const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'))
const winJdk = 'C:\\Program Files\\Eclipse Adoptium\\jdk-21.0.12.101-hotspot'
const jdkHome = process.env.JAVA_HOME || (process.platform === 'win32' ? winJdk : process.env.JAVA_HOME)
const sdkDir =
  process.env.ANDROID_HOME ||
  process.env.ANDROID_SDK_ROOT ||
  path.join(process.env.LOCALAPPDATA ?? '', 'Android', 'Sdk')

const env = {
  ...process.env,
  ...(jdkHome ? { JAVA_HOME: jdkHome } : {}),
  ANDROID_HOME: sdkDir,
  ANDROID_SDK_ROOT: sdkDir,
}

const gradlew = process.platform === 'win32' ? '.\\gradlew.bat' : './gradlew'
if (process.platform !== 'win32') {
  await chmod(path.join(androidDir, 'gradlew'), 0o755)
}

await new Promise((resolve, reject) => {
  const child = spawn(gradlew, ['assembleDebug'], {
    cwd: androidDir,
    env,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
  child.on('exit', (code) => {
    if (code === 0) resolve(undefined)
    else reject(new Error(`gradlew assembleDebug exited with ${code}`))
  })
})

const versionCode = process.env.VERSION_CODE ?? '1'
const apkName = `nova-${pkg.version}-${versionCode}.apk`
const outDir = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug')
const named = path.join(outDir, apkName)
const fallback = path.join(outDir, 'app-debug.apk')
const built = await exists(named) ? named : fallback
const releases = path.join(root, 'releases')
await mkdir(releases, { recursive: true })
const latest = path.join(releases, 'nova-debug.apk')
const versioned = path.join(releases, apkName)
await cp(built, latest)
await cp(built, versioned)
console.log(`APK copied to ${latest}`)
console.log(`APK copied to ${versioned}`)

async function exists(file) {
  try {
    await access(file)
    return true
  } catch {
    return false
  }
}
