export const config = { runtime: 'edge' }

export default async function handler(req) {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  }

  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: cors })

  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') || '').trim()
  if (!q) return new Response(JSON.stringify({ error: 'Missing q' }), { status: 400, headers: cors })

  const key = process.env.PIXABAY_API_KEY
  if (!key) return new Response(JSON.stringify({ error: 'No API key configured' }), { status: 500, headers: cors })

  const url = `https://pixabay.com/api/?key=${key}&q=${encodeURIComponent(q)}&image_type=photo&per_page=5&safesearch=true`
  const res  = await fetch(url)
  const data = await res.json()

  const hits = (data.hits || []).map(h => ({
    url:   h.webformatURL,
    thumb: h.previewURL,
    tags:  h.tags,
  }))

  return new Response(JSON.stringify({ hits }), { status: 200, headers: cors })
}
