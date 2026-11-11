// Vercel serverless function: finds recent ant sighting posts/news for Singapore.
// Sources: Reddit search + Google News RSS. If one source is blocked, the other still works.
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1800');

  const species = (req.query && req.query.species) || 'all';

  const searches = {
    fire:      ['fire ant queen Singapore flying', 'solenopsis geminata Singapore'],
    giga:      ['camponotus gigas Singapore', 'giga ant Singapore'],
    trapjaw:   ['trap jaw ant Singapore', 'odontomachus Singapore'],
    carpenter: ['carpenter ant queen Singapore', 'camponotus Singapore nuptial flight'],
    all:       ['queen ant Singapore nuptial flight', 'flying ants Singapore', 'ant queen Singapore'],
  };
  const queries = searches[species] || searches.all;
  const UA = 'Mozilla/5.0 (compatible; AntAlertSG/1.0; +https://ant-alert.vercel.app)';

  async function timedFetch(url, opts = {}) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    try { return await fetch(url, { ...opts, signal: ctrl.signal }); }
    finally { clearTimeout(t); }
  }

  async function reddit(q) {
    try {
      const r = await timedFetch(
        `https://www.reddit.com/search.json?q=${encodeURIComponent(q)}&sort=new&limit=6&t=year`,
        { headers: { 'User-Agent': UA, 'Accept': 'application/json' } }
      );
      if (!r.ok) return [];
      const j = await r.json();
      return (j.data?.children || []).map(c => ({
        id: 'r' + c.data.id,
        title: c.data.title,
        url: 'https://reddit.com' + c.data.permalink,
        source: 'r/' + c.data.subreddit,
        created: c.data.created_utc * 1000,
        snippet: (c.data.selftext || '').slice(0, 140).trim(),
      }));
    } catch (e) { return []; }
  }

  function decode(s) {
    return s.replace(/<!\[CDATA\[|\]\]>/g, '')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/<[^>]+>/g, '').trim();
  }

  async function news(q) {
    try {
      const r = await timedFetch(
        `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-SG&gl=SG&ceid=SG:en`,
        { headers: { 'User-Agent': UA } }
      );
      if (!r.ok) return [];
      const xml = await r.text();
      const items = xml.split('<item>').slice(1, 7);
      return items.map((it, i) => {
        const get = tag => {
          const m = it.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
          return m ? decode(m[1]) : '';
        };
        return {
          id: 'n' + q.length + '-' + i + '-' + get('link').slice(-12),
          title: get('title'),
          url: get('link'),
          source: get('source') || 'News',
          created: new Date(get('pubDate')).getTime() || 0,
          snippet: '',
        };
      });
    } catch (e) { return []; }
  }

  try {
    const results = await Promise.all([...queries.map(reddit), ...queries.map(news)]);
    const seen = new Set();
    const posts = results.flat()
      .filter(p => p.title && p.url && !seen.has(p.url) && seen.add(p.url))
      .sort((a, b) => b.created - a.created)
      .slice(0, 8);
    res.status(200).json({ posts, species });
  } catch (e) {
    res.status(200).json({ posts: [], error: String(e.message || e) });
  }
};
