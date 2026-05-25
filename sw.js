const CACHE_NAME = 'ant-alert-v2';
const SCORE_THRESHOLD = 60;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));

self.addEventListener('fetch', e => {
  if (e.request.url.includes('open-meteo.com') || e.request.url.includes('nominatim')) return;
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});

// Called by the main app with coords from GPS
self.addEventListener('message', e => {
  if (e.data?.type === 'CHECK_WITH_COORDS') {
    checkAndNotify(e.data.lat, e.data.lng, e.data.locationName);
  }
  if (e.data?.type === 'PERIODIC_CHECK') {
    checkAndNotify(e.data.lat, e.data.lng, e.data.locationName);
  }
});

// Background periodic sync (Android Chrome + some browsers)
self.addEventListener('periodicsync', e => {
  if (e.tag === 'ant-weather-check') {
    // Retrieve last known coords from cache
    e.waitUntil(
      caches.open(CACHE_NAME).then(async cache => {
        const res = await cache.match('last-coords');
        if (res) {
          const { lat, lng, locationName } = await res.json();
          await checkAndNotify(lat, lng, locationName);
        }
      })
    );
  }
});

function calcScore(temp, humidity, windspeed, precip, isEvening) {
  let s = 0;
  s += precip >= 5 ? 35 : precip >= 1 ? 25 : precip >= 0.1 ? 12 : 0;
  s += humidity >= 85 ? 25 : humidity >= 75 ? 18 : humidity >= 65 ? 8 : 0;
  s += (temp >= 26 && temp <= 33) ? 20 : (temp >= 24 && temp < 26) ? 10 : 0;
  s += windspeed <= 8 ? 12 : windspeed <= 15 ? 6 : 0;
  s += isEvening ? 8 : 0;
  return Math.min(100, s);
}

async function checkAndNotify(lat, lng, locationName) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation&timezone=auto`;
    const res = await fetch(url);
    const data = await res.json();
    const c = data.current;
    const h = new Date().getHours();
    const score = calcScore(c.temperature_2m, c.relative_humidity_2m, c.wind_speed_10m, c.precipitation, h >= 18 && h <= 23);

    if (score >= SCORE_THRESHOLD) {
      const label = score >= 70 ? '🔥 Get outside NOW' : '✅ Good conditions';
      await self.registration.showNotification(`Queen ant alert — ${locationName || 'Your location'}`, {
        body: `${label}! Score ${Math.round(score)}/100 · Rain ${c.precipitation.toFixed(1)}mm · ${Math.round(c.relative_humidity_2m)}% humid. Grab your containers!`,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'ant-alert',
        renotify: true,
        vibrate: [200, 100, 200, 100, 200],
        data: { url: '/' }
      });
    }
  } catch(e) {
    console.error('[SW] weather check failed', e);
  }
}

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow('/'));
});
