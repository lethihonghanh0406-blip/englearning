// Fetch YouTube captions via InnerTube API (bypass CORS + bot detection)
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  if (req.method === 'OPTIONS') { res.status(200).end(); return }

  const raw     = req.query.v || ''
  const videoId = raw.match(/[A-Za-z0-9_-]{11}/)?.[0]
  if (!videoId) return res.status(400).json({ error: 'Invalid or missing video ID' })

  try {
    // ── 1. Try InnerTube API (most reliable) ──────────────────────────────
    let captionTracks = await fetchViaInnerTube(videoId)

    // ── 2. Fallback: parse HTML page ──────────────────────────────────────
    if (!captionTracks?.length) {
      captionTracks = await fetchViaHtml(videoId)
    }

    if (!captionTracks?.length) {
      return res.status(404).json({
        error: 'Video này không có phụ đề tiếng Anh. Hãy thử video khác có CC (🇬🇧 phụ đề).',
      })
    }

    // ── 3. Pick EN track (prefer manual over auto-generated) ──────────────
    const enTrack = captionTracks.find(t => t.languageCode === 'en' && t.kind !== 'asr')
                 || captionTracks.find(t => t.languageCode === 'en')
                 || captionTracks.find(t => (t.languageCode || '').startsWith('en'))

    const viTrack = captionTracks.find(t => t.languageCode === 'vi')

    if (!enTrack?.baseUrl) {
      const langs = captionTracks.map(t =>
        `${t.languageCode}${t.kind === 'asr' ? '(auto)' : ''}`
      ).join(', ')
      return res.status(404).json({ error: `Không có phụ đề tiếng Anh. Có sẵn: ${langs || 'không có'}` })
    }

    // ── 4. Fetch JSON3 caption data ───────────────────────────────────────
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
          t:    e.tStartMs / 1000,
          dur:  (e.dDurationMs || 2000) / 1000,
          text: e.segs.map(s => s.utf8 || '').join('').replace(/\n/g, ' ').trim(),
        }))
        .filter(e => e.text.length > 0)
    }

    const enItems = parseEvents(enData)
    const viItems = parseEvents(viData)

    // Match VI → EN by nearest timestamp (within 2 s)
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

    const isAsr = enTrack.kind === 'asr'
    res.json({ subs, hasVI: viItems.length > 0, isAsr })

  } catch (e) {
    console.error('transcript error:', e)
    res.status(500).json({ error: e.message })
  }
}

// ── InnerTube (YouTube internal API) ─────────────────────────────────────────
async function fetchViaInnerTube(videoId) {
  try {
    // WEB client — includes captions.playerCaptionsTracklistRenderer
    const r = await fetch(
      'https://www.youtube.com/youtubei/v1/player?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8&prettyPrint=false',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-YouTube-Client-Name': '1',
          'X-YouTube-Client-Version': '2.20240520.00.00',
          'Origin':  'https://www.youtube.com',
          'Referer': `https://www.youtube.com/watch?v=${videoId}`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        body: JSON.stringify({
          videoId,
          context: {
            client: {
              hl: 'en', gl: 'US',
              clientName:    'WEB',
              clientVersion: '2.20240520.00.00',
            },
          },
        }),
      }
    )
    if (!r.ok) return null
    const data = await r.json()
    return data?.captions?.playerCaptionsTracklistRenderer?.captionTracks || null
  } catch (e) {
    console.error('InnerTube error:', e.message)
    return null
  }
}

// ── HTML page parse fallback ──────────────────────────────────────────────────
async function fetchViaHtml(videoId) {
  try {
    const r = await fetch(`https://www.youtube.com/watch?v=${videoId}&hl=en`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml',
        'Cookie': 'CONSENT=YES+; PREF=hl=en&gl=US',
      },
    })
    if (!r.ok) return null
    const html = await r.text()

    // Bracket-count extraction of captionTracks array
    const ki = html.indexOf('"captionTracks":')
    if (ki === -1) return null
    const arrStart = html.indexOf('[', ki)
    if (arrStart === -1) return null

    let depth = 0, end = arrStart
    for (let i = arrStart; i < html.length; i++) {
      const c = html[i]
      if (c === '[' || c === '{') depth++
      else if (c === ']' || c === '}') { depth--; if (depth === 0) { end = i; break } }
    }

    return JSON.parse(html.slice(arrStart, end + 1))
  } catch (e) {
    console.error('HTML parse error:', e.message)
    return null
  }
}
