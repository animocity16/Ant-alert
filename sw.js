const CACHE_NAME = 'ant-alert-v3';
const SCORE_THRESHOLD = 60;
const COORDS_KEY = '/__last-coords';
const NOTIFIED_KEY = '/__last-notified';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(
  caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
    .then(() => clients.claim())
));

// Everything goes to the network; the cache is only used as a tiny notebook for coords.
self.addEventListener('fetch', () => {});

async function saveJSON(key, obj) {
  const cache = await caches.open(CACHE_NAME);
  await cache.put(key, new Response(JSON.stringify(obj), { headers: { 'Content-Type': 'application/json' } }));
}
async function loadJSON(key) {
  const cache = await caches.open(CACHE_NAME);
  const res = await cache.match(key);
  return res ? res.json() : null;
}

// Messages from the app
self.addEventListener('message', e => {
  const d = e.data || {};
  if (d.type === 'SAVE_COORDS') {
    e.waitUntil(saveJSON(COORDS_KEY, { lat: d.lat, lng: d.lng, locationName: d.locationName }));
  }
  if (d.type === 'CHECK_WITH_COORDS' || d.type === 'PERIODIC_CHECK') {
    e.waitUntil(
      saveJSON(COORDS_KEY, { lat: d.lat, lng: d.lng, locationName: d.locationName })
        .then(() => checkAndNotify(d.lat, d.lng, d.locationName))
    );
  }
});

// Background periodic sync (Android Chrome only; iOS does not support this)
self.addEventListener('periodicsync', e => {
  if (e.tag === 'ant-weather-check') {
    e.waitUntil(
      loadJSON(COORDS_KEY).then(c => c ? checkAndNotify(c.lat, c.lng, c.locationName) : null)
    );
  }
});

function calcScore(temp, humidity, wind, rain3, eve) {
  let s = 0;
  s += rain3 >= 5 ? 35 : rain3 >= 1 ? 25 : rain3 >= 0.1 ? 12 : 0;
  s += humidity >= 85 ? 25 : humidity >= 75 ? 18 : humidity >= 65 ? 8 : 0;
  s += (temp >= 26 && temp <= 33) ? 20 : (temp >= 24 && temp < 26) ? 10 : 0;
  s += wind <= 8 ? 12 : wind <= 15 ? 6 : 0;
  s += eve ? 8 : 0;
  return Math.min(100, s);
}

async function checkAndNotify(lat, lng, locationName) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation&hourly=precipitation&past_hours=3&forecast_hours=1&timezone=auto`;
    const res = await fetch(url);
    const data = await res.json();
    const c = data.current;
    const hourly = (data.hourly && data.hourly.precipitation) || [];
    const rain3 = Math.max(hourly.reduce((a, b) => a + (b || 0), 0), c.precipitation || 0);
    const h = parseInt((c.time || '').slice(11, 13), 10);
    const eve = h >= 18 && h <= 23;
    const score = calcScore(c.temperature_2m, c.relative_humidity_2m, c.wind_speed_10m, rain3, eve);

    // Only ping in the hunting window (4pm-11pm local) and at most once every 3 hours
    const inWindow = h >= 16 && h <= 23;
    const last = await loadJSON(NOTIFIED_KEY);
    const recentlyPinged = last && (Date.now() - last.t) < 3 * 3600 * 1000;

    if (score >= SCORE_THRESHOLD && inWindow && !recentlyPinged) {
      const label = score >= 70 ? '🔥 Get outside NOW' : '✅ Good conditions';
      await self.registration.showNotification(`Queen ant alert — ${locationName || 'Your location'}`, {
        body: `${label}! Score ${Math.round(score)}/100 · Rain (3h) ${rain3.toFixed(1)}mm · ${Math.round(c.relative_humidity_2m)}% humid. Check the Best bets list!`,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'ant-alert',
        renotify: true,
        vibrate: [200, 100, 200, 100, 200],
        data: { url: '/' }
      });
      await saveJSON(NOTIFIED_KEY, { t: Date.now() });
    }
  } catch (err) {
    console.error('[SW] weather check failed', err);
  }
}

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow('/'));
});
