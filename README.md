# Nova

A cosmic mining incremental. Strike an asteroid for ore, buy mining rigs, install gear, and warp to a richer claim.

```bash
npm install
npm run dev
```

## Updates

Push to `main` and GitHub Actions will:

1. Deploy the web build to GitHub Pages
2. Build a versioned APK (`nova-<version>-<build>.apk`) and publish it as `v<version>-<build>`
3. Also refresh the rolling [`apk` release](../../releases/tag/apk) as `nova-debug.apk`

Each Android build has a higher `versionCode` (the GitHub run number) so the phone will accept the update. The in-app installer downloads the versioned file, not the reused latest alias.

The installed Android app checks Pages for a newer `version.json` on launch. If one is waiting, it shows **Install update** and downloads that APK. Sideload it over the current install — same package name and debug key, so the save stays.

## Android APK

```bash
npm run android:build
```

Local builds land in `releases/` as `nova-debug.apk` and `nova-<version>-1.apk`. The phone build you want day to day is the GitHub Release, not this folder.
