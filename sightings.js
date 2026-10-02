// Vercel serverless function — searches Reddit for recent ant sighting posts
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { species = 'all' } = req.query;

  const searches = {
    fire:      ['fire ant queen Singapore flying', 'solenopsis geminata Singapore nuptial'],
    giga:      ['camponotus gigas Singapore queen', 'giga ant Singapore spotted'],
    trapjaw:   ['trap jaw ant Singapore odontomachus', 'odontomachus Singapore queen'],
    carpenter: ['carpenter ant queen Singapore flying', 'camponotus Singapore nuptial flight'],
    all:       ['queen ant Singapore nuptial flight', 'flying ants Singapore spotted', 'ant queen Singapore caught'],
  };

  const queries = searches[species] || searches.all;

  try {
    // Run all queries in parallel
    const results = await Promise.all(
      queries.map(q =>
        fetch(`https://www.reddit.com/search.json?q=${encodeURIComponent(q)}&sort=new&limit=6&t=year`, {
          headers: { 'User-Agent': 'AntAlertSG/1.0' },
        })
        .then(r => r.json())
        .catch(() => ({ data: { children: [] } }))
      )
    );

    // Merge, deduplicate by post ID, sort by newest
    const seen = new Set();
    const posts = results
      .flatMap(r => r.data?.children || [])
      .filter(p => {
        if (seen.has(p.data.id)) return false;
        seen.add(p.data.id);
        return true;
      })
      .map(p => ({
        id:      p.data.id,
        title:   p.data.title,
        url:     `https://reddit.com${p.data.permalink}`,
        source:  `r/${p.data.subreddit}`,
        created: p.data.created_utc * 1000,
        snippet: (p.data.selftext || '').slice(0, 140).trim(),
        score:   p.data.score,
        thumb:   p.data.thumbnail?.startsWith('http') ? p.data.thumbnail : null,
      }))
      .sort((a, b) => b.created - a.created)
      .slice(0, 8);

    res.json({ posts, species });
  } catch (e) {
    res.status(500).json({ posts: [], error: e.message });
  }
}
