const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter'
];

module.exports = async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  if (!isFinite(lat) || !isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    res.status(400).json({ error: 'bad coordinates' });
    return;
  }
  const R = 2200;
  const query = `
    [out:json][timeout:20];
    (
      nwr["leisure"~"^(park|nature_reserve|garden|recreation_ground|pitch|stadium)$"](around:${R},${lat},${lng});
      nwr["leisure"~"^(swimming_pool|sports_centre)$"]["name"](around:${R},${lat},${lng});
      nwr["amenity"~"^(fuel|fast_food)$"]["name"](around:${R},${lat},${lng});
    );
    out center 200;
  `;

  try {
    const data = await Promise.any(ENDPOINTS.map(async url => {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 22000);
      try {
        const r = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'ant-alert/1.0 (hobby ant-keeping app)' },
          body: 'data=' + encodeURIComponent(query),
          signal: ctl.signal
        });
        if (!r.ok) throw new Error(new URL(url).host + ' HTTP ' + r.status);
        const j = await r.json();
        if (!j || !Array.isArray(j.elements)) throw new Error(new URL(url).host + ' bad data');
        return j;
      } finally { clearTimeout(timer); }
    }));
    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600');
    res.status(200).json({ elements: data.elements });
  } catch (e) {
    const why = e && e.errors ? e.errors.map(x => x.message).join(' · ') : String(e && e.message || e);
    res.status(502).json({ error: 'map servers unavailable', why });
  }
};
