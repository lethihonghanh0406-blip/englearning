// Vercel Edge Function — runs on edge network (non-Lambda IPs, bypasses YouTube IP blocks)
export const config = { runtime: 'edge' }

export default async function handler(req) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  }

  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders })

  const { searchParams } = new URL(req.url)
  const raw     = searchParams.get('v') || ''
  const videoId = raw.match(/[A-Za-z0-9_-]{11}/)?.[0]
  const debug   = searchParams.get('debug') === '1'

  if (!videoId) return json({ error: 'Invalid or missing video ID' }, 400, corsHeaders)

  try {
    const attempts = []

    // ── 1. ANDROID via youtubei.googleapis.com ────────────────────────────
    let captionTracks = await tryClient('ANDROID_GAPI', videoId, attempts)
    if (!captionTracks) captionTracks = await tryClient('IOS',     videoId, attempts)
    if (!captionTracks) captionTracks = await tryClient('ANDROID', videoId, attempts)
    if (!captionTracks) captionTracks = await tryClient('WEB',     videoId, attempts)
    if (!captionTracks) captionTracks = await tryClient('TVHTML5', videoId, attempts)

    // ── 2. Direct timedtext URL ───────────────────────────────────────────
    if (!captionTracks) {
      const td = await fetchViaTimedtext(videoId)
      attempts.push({ client: 'TIMEDTEXT', found: td ? 1 : 0 })
      if (td) {
        const enItems = parseEvents(td)
        const subs = enItems.map(en => ({ t: en.t, dur: en.dur, en: en.text, vi: '' }))
        if (debug) return json({ attempts, method: 'TIMEDTEXT', subs: subs.slice(0, 3) }, 200, corsHeaders)
        return json({ subs, hasVI: false, isAsr: true }, 200, corsHeaders)
      }
    }

    // ── 3. HTML parse fallback ────────────────────────────────────────────
    if (!captionTracks) {
      captionTracks = await fetchViaHtml(videoId)
      attempts.push({ client: 'HTML', found: captionTracks?.length ?? 0 })
      if (!captionTracks?.length) captionTracks = null
    }

    if (debug) return json({ attempts, captionTracks: captionTracks?.slice(0, 2) || null }, 200, corsHeaders)

    if (!captionTracks) {
      return json({
        error: 'Video này không có phụ đề tiếng Anh. Hãy thử video khác có CC (🇬🇧 phụ đề).',
        debug: attempts,
      }, 404, corsHeaders)
    }

    const enTrack = captionTracks.find(t => t.languageCode === 'en' && t.kind !== 'asr')
                 || captionTracks.find(t => t.languageCode === 'en')
                 || captionTracks.find(t => (t.languageCode || '').startsWith('en'))
    const viTrack = captionTracks.find(t => t.languageCode === 'vi')

    if (!enTrack?.baseUrl) {
      const langs = captionTracks.map(t => `${t.languageCode}${t.kind === 'asr' ? '(auto)' : ''}`).join(', ')
      return json({ error: `Không có phụ đề tiếng Anh. Có sẵn: ${langs || 'không có'}` }, 404, corsHeaders)
    }

    const toJson3 = url => url.includes('fmt=') ? url : url + '&fmt=json3'
    const [enData, viData] = await Promise.all([
      fetch(toJson3(enTrack.baseUrl)).then(r => r.json()),
      viTrack ? fetch(toJson3(viTrack.baseUrl)).then(r => r.json()) : Promise.resolve(null),
    ])

    const enItems = parseEvents(enData)
    const viItems = parseEvents(viData)

    const subs = enItems.map(en => {
      let vi = ''
      if (viItems.length) {
        const best = viItems.reduce((a, b) => Math.abs(b.t - en.t) < Math.abs(a.t - en.t) ? b : a)
        if (Math.abs(best.t - en.t) < 2) vi = best.text
      }
      return { t: en.t, dur: en.dur, en: en.text, vi }
    })

    return json({ subs, hasVI: viItems.length > 0, isAsr: enTrack.kind === 'asr' }, 200, corsHeaders)

  } catch (e) {
    return json({ error: e.message }, 500, corsHeaders)
  }
}

function json(data, status, headers) {
  return new Response(JSON.stringify(data), { status, headers })
}

async function tryClient(name, videoId, attempts) {
  let tracks = null
  try {
    if (name === 'ANDROID_GAPI') tracks = await fetchAndroidGapi(videoId)
    else if (name === 'IOS')     tracks = await fetchIos(videoId)
    else if (name === 'ANDROID') tracks = await fetchAndroid(videoId)
    else if (name === 'WEB')     tracks = await fetchWeb(videoId)
    else if (name === 'TVHTML5') tracks = await fetchTv(videoId)
  } catch {}
  attempts.push({ client: name, found: tracks?.length ?? 0 })
  return tracks?.length ? tracks : null
}

async function fetchAndroidGapi(videoId) {
  const r = await fetch(
    'https://youtubei.googleapis.com/youtubei/v1/player?key=AIzaSyA8eiZmM1fanX9Xa_va6EMfan4EpLCJ7Yk',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-YouTube-Client-Name': '3',
        'X-YouTube-Client-Version': '19.09.37',
        'User-Agent': 'com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip',
      },
      body: JSON.stringify({
        videoId,
        context: { client: { hl: 'en', gl: 'US', clientName: 'ANDROID', clientVersion: '19.09.37', androidSdkVersion: 30 } },
      }),
    }
  )
  if (!r.ok) return null
  const data = await r.json()
  return data?.captions?.playerCaptionsTracklistRenderer?.captionTracks || null
}

async function fetchIos(videoId) {
  const r = await fetch(
    'https://youtubei.googleapis.com/youtubei/v1/player?key=AIzaSyB-63vPrdThhKuerbB2N_l7Kwwcxj6yUAc',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-YouTube-Client-Name': '5',
        'X-YouTube-Client-Version': '19.09.3',
        'User-Agent': 'com.google.ios.youtube/19.09.3 (iPhone16,2; U; CPU iOS 17_5_1 like Mac OS X;)',
      },
      body: JSON.stringify({
        videoId,
        context: { client: { hl: 'en', gl: 'US', clientName: 'IOS', clientVersion: '19.09.3', deviceModel: 'iPhone16,2' } },
      }),
    }
  )
  if (!r.ok) return null
  const data = await r.json()
  return data?.captions?.playerCaptionsTracklistRenderer?.captionTracks || null
}

async function fetchAndroid(videoId) {
  const r = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-YouTube-Client-Name': '3',
      'X-YouTube-Client-Version': '19.09.37',
      'User-Agent': 'com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip',
    },
    body: JSON.stringify({
      videoId,
      context: { client: { hl: 'en', gl: 'US', clientName: 'ANDROID', clientVersion: '19.09.37', androidSdkVersion: 30 } },
    }),
  })
  if (!r.ok) return null
  const data = await r.json()
  return data?.captions?.playerCaptionsTracklistRenderer?.captionTracks || null
}

async function fetchWeb(videoId) {
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
        context: { client: { hl: 'en', gl: 'US', clientName: 'WEB', clientVersion: '2.20240520.00.00' } },
      }),
    }
  )
  if (!r.ok) return null
  const data = await r.json()
  return data?.captions?.playerCaptionsTracklistRenderer?.captionTracks || null
}

async function fetchTv(videoId) {
  const r = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-YouTube-Client-Name': '7',
      'X-YouTube-Client-Version': '7.20230405.08.01',
      'User-Agent': 'Mozilla/5.0 (SMART-TV; Linux; Tizen 5.0) AppleWebKit/537.36',
    },
    body: JSON.stringify({
      videoId,
      context: { client: { hl: 'en', gl: 'US', clientName: 'TVHTML5', clientVersion: '7.20230405.08.01' } },
    }),
  })
  if (!r.ok) return null
  const data = await r.json()
  return data?.captions?.playerCaptionsTracklistRenderer?.captionTracks || null
}

async function fetchViaTimedtext(videoId) {
  const candidates = [
    `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=json3`,
    `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en-US&fmt=json3`,
    `https://www.youtube.com/api/timedtext?v=${videoId}&kind=asr&lang=en&fmt=json3`,
  ]
  for (const url of candidates) {
    try {
      const r = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      })
      if (!r.ok) continue
      const text = await r.text()
      if (!text || text.trim() === '' || text === '{"events":[]}') continue
      const data = JSON.parse(text)
      if (data?.events?.length > 0) return data
    } catch {}
  }
  return null
}

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
  } catch { return null }
}

function parseEvents(data) {
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
