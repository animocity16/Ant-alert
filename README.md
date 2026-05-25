# Queen Ant Alert — Novena

Live nuptial flight tracker for Singapore. Checks real weather conditions every 15 minutes and alerts you when queens are likely flying.

## Deploy to Vercel (5 minutes)

1. Go to [vercel.com](https://vercel.com) → New Project
2. Drag and drop this entire `ant-alert` folder
3. Click Deploy — done. You'll get a URL like `ant-alert.vercel.app`

## Install on your phone

**iPhone:**
- Open the app URL in Safari
- Tap the Share button (bottom bar)
- Tap "Add to Home Screen"
- It now lives on your home screen like a native app

**Android:**
- Open in Chrome
- Tap the 3-dot menu → "Install app" or "Add to Home Screen"

## Enable alerts

- Open the app → tap "Enable alerts"
- Allow notifications when prompted
- You'll get a push notification whenever the flight chance hits 60/100+

## How the score works

| Factor | Max points | When |
|--------|-----------|------|
| Recent rain | 35 | Rain detected in last hour |
| Humidity | 25 | Above 75% (tropical ideal) |
| Temperature | 20 | 26–33°C sweet spot |
| Low wind | 12 | Under 8 km/h |
| Evening window | 8 | Between 6–11pm |

**60+ = get outside. 70+ = drop everything.**

## Data source

[Open-Meteo](https://open-meteo.com) — free, no API key needed, updates hourly.
Coordinates: Novena, Singapore (1.3200°N, 103.8440°E)

## Files

- `index.html` — the whole app
- `sw.js` — service worker (background checks + notifications)
- `manifest.json` — PWA install config
- `vercel.json` — deployment headers
- `icon-192.png` / `icon-512.png` — app icons
