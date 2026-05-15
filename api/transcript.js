// Vercel serverless function — fetch YouTube caption tracks server-side to bypass CORS
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  if (req.method === 'OPTIONS') { res.status(200).end(); return }

  const raw = req.query.v || ''
  const match = raw.match(/[A-Za-z0-9_-]{11}/)
  const videoId = match?.[0]
  if (!videoId) return res.status(400).json({ error: 'Invalid or missing video ID' })

  try {
    const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    })
    if (!pageRes.ok) return res.status(502).json({ error: 'Cannot reach YouTube' })

    const html = await pageRes.text()

    // ── Extract captionTracks using bracket counting ────────────────────────
    const key = '"captionTracks":'
    const ki  = html.indexOf(key)
    if (ki === -1) {
      return res.status(404).json({ error: 'No captions available for this video (subtitles may be disabled)' })
    }
    const arrStart = html.indexOf('[', ki)
    let depth = 0, end = arrStart
    for (let i = arrStart; i < html.length; i++) {
      const c = html[i]
      if (c === '[' || c === '{') depth++
      else if (c === ']' || c === '}') { depth--; if (depth === 0) { end = i; break } }
    }

    let captionTracks
    try {
      captionTracks = JSON.parse(html.slice(arrStart, end + 1))
    } catch {
      return res.status(500).json({ error: 'Failed to parse caption tracks' })
    }

    // ── Pick English + Vietnamese tracks ──────────────────────────────────
    const enTrack = captionTracks.find(t => t.languageCode === 'en' && t.kind !== 'asr')
                 || captionTracks.find(t => t.languageCode === 'en')
                 || captionTracks.find(t => (t.languageCode || '').startsWith('en'))

    const viTrack = captionTracks.find(t => t.languageCode === 'vi')

    if (!enTrack?.baseUrl) {
      const langs = captionTracks.map(t => t.languageCode).join(', ')
      return res.status(404).json({ error: `No English captions found. Available: ${langs || 'none'}` })
    }

    // ── Fetch JSON3 captions ───────────────────────────────────────────────
    const toJson3 = url => url.includes('fmt=') ? url : url + '&fmt=json3'

    const [enData, viData] = await Promise.all([
      fetch(toJson3(enTrack.baseUrl)).then(r => r.json()),
      viTrack ? fetch(toJson3(viTrack.baseUrl)).then(r => r.json()) : Promise.resolve(null),
    ])

    const parseEvents = data => {
      if (!data?.events) return []
      return data.events
        .filter(e => e.segs && e.tStartMs != null)
        .map(e => ({
          t:   e.tStartMs / 1000,
          dur: (e.dDurationMs || 2000) / 1000,
          text: e.segs.map(s => s.utf8 || '').join('').replace(/\n/g, ' ').trim(),
        }))
        .filter(e => e.text.length > 0)
    }

    const enItems = parseEvents(enData)
    const viItems = parseEvents(viData)

    // ── Match VI → EN by nearest timestamp (within 2 s) ───────────────────
    const subs = enItems.map(en => {
      let vi = ''
      if (viItems.length) {
        const best = viItems.reduce((a, b) =>
          Math.abs(b.t - en.t) < Math.abs(a.t - en.t) ? b : a
        )
        if (Math.abs(best.t - en.t) < 2) vi = best.text
      }
      return { t: en.t, dur: en.dur, en: en.text, vi }
    })

    // ── Title ──────────────────────────────────────────────────────────────
    const titleMatch = html.match(/<title>([^<]+)<\/title>/)
    const title = (titleMatch?.[1] || '').replace(/ - YouTube$/, '')
      .replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'")

    res.json({ subs, title, hasVI: viItems.length > 0, trackCount: captionTracks.length })

  } catch (e) {
    console.error('transcript error:', e)
    res.status(500).json({ error: e.message })
  }
}
