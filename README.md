# Nova

A cosmic mining incremental. Strike an asteroid for ore, buy mining rigs, install gear, and warp to a richer claim.

```bash
npm install
npm run dev
```

## Updates

Push to `main` and GitHub Actions will:

1. Deploy the web build to GitHub Pages
2. Build a debug APK and attach it to the rolling [`apk` release](../../releases/tag/apk)

The installed Android app checks Pages for a newer `version.json` on launch. If one is waiting, it shows **Install update** and downloads that APK. Sideload it over the current install — same package name and debug key, so the save stays.

## Android APK

```bash
npm run android:build
```

Local builds land in `releases/nova-debug.apk`. The phone build you want day to day is the GitHub Release, not this folder.
