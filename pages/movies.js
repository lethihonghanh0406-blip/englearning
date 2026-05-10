import { supabase } from '../supabase/client.js'

export default async function moviesPage(app) {
  let movies        = []
  let selId         = null
  let showVI        = false
  let isPro         = false
  let ytPlayer      = null
  let ytReady       = false
  let subtitleTimer = null
  let currentSubIdx = -1
  let layoutMovieId = 'INIT'

  app.innerHTML = `<div style="min-height:100vh;background:#0f172a;display:flex;align-items:center;justify-content:center"><div style="color:#64748b;font-size:14px">Đang tải...</div></div>`

  // Check pro status
  const { data: { session } } = await supabase.auth.getSession()
  if (session) {
    const { data: profile } = await supabase.from('profiles')
      .select('plan, plan_expires_at').eq('id', session.user.id).single()
    isPro = profile?.plan === 'pro' &&
      (!profile.plan_expires_at || new Date(profile.plan_expires_at) > new Date())
  }

  const { data } = await supabase.from('movie_lessons').select('id,title,youtube_id,level,subtitles').order('created_at')
  movies = data || []
  selId  = movies[0]?.id || null
  render()

  function getMovie() { return movies.find(m => m.id === selId) || null }
  function getSubs()  { return getMovie()?.subtitles || [] }
  function getVid(movie) {
    if (!movie?.youtube_id) return null
    const m = movie.youtube_id.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/)
    return m ? m[1] : movie.youtube_id
  }

  // ── Binary search for current subtitle ────────────────────────────────────
  function findSubIdx(subs, t) {
    if (!subs.length) return -1
    let lo = 0, hi = subs.length - 1
    while (lo < hi) {
      const mid = Math.floor((lo + hi + 1) / 2)
      if (subs[mid].t <= t) lo = mid
      else hi = mid - 1
    }
    return subs[lo].t <= t ? lo : -1
  }

  // ── YouTube IFrame API ─────────────────────────────────────────────────────
  function ensureYTAPI() {
    return new Promise(resolve => {
      if (window.YT?.Player) return resolve()
      const prev = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => { if (prev) prev(); resolve() }
      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const s = document.createElement('script')
        s.src = 'https://www.youtube.com/iframe_api'
        document.head.appendChild(s)
      }
    })
  }

  function initYTPlayer(videoId) {
    ytReady = false
    ensureYTAPI().then(() => {
      const try_ = () => {
        const el = document.getElementById('mv-yt-container')
        if (!el) { setTimeout(try_, 100); return }
        if (ytPlayer) { ytPlayer.destroy(); ytPlayer = null }
        ytPlayer = new YT.Player('mv-yt-container', {
          height: '100%', width: '100%', videoId,
          playerVars: { rel: 0, modestbranding: 1 },
          events: { onReady: () => { ytReady = true; startSync() } }
        })
      }
      try_()
    })
  }

  // ── Subtitle sync ──────────────────────────────────────────────────────────
  function startSync() {
    if (subtitleTimer) clearInterval(subtitleTimer)
    const subs = getSubs()
    subtitleTimer = setInterval(() => {
      if (!ytPlayer || !ytReady) return
      try {
        const state = ytPlayer.getPlayerState()
        if (state !== 1 && state !== 2) return  // only sync while playing/paused
        const t = ytPlayer.getCurrentTime()
        const idx = findSubIdx(subs, t)
        if (idx !== currentSubIdx) {
          currentSubIdx = idx
          updateSubtitleDisplay(idx, subs)
        }
      } catch(e) {}
    }, 200)
  }

  function stopSync() {
    if (subtitleTimer) { clearInterval(subtitleTimer); subtitleTimer = null }
    currentSubIdx = -1
  }

  function updateSubtitleDisplay(idx, subs) {
    const el = document.getElementById('mv-subtitle')
    if (!el) return
    if (idx < 0 || !subs[idx]) {
      el.innerHTML = `<span style="color:#64748b;font-size:14px">▶ Bấm play để bắt đầu</span>`
      return
    }
    const sub = subs[idx]
    el.innerHTML = `
      <div style="font-size:20px;font-weight:600;color:#f8fafc;line-height:1.5">${sub.en}</div>
      ${showVI
        ? sub.vi
          ? `<div style="font-size:16px;color:#93c5fd;margin-top:5px;font-style:italic">${sub.vi}</div>`
          : `<div style="font-size:13px;color:#475569;margin-top:5px;font-style:italic">...</div>`
        : ''}`
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  function render() {
    const movie = getMovie()
    const vid   = getVid(movie)
    if (selId !== layoutMovieId || !document.getElementById('mv-card')) {
      stopSync()
      renderLayout(movie, vid)
      layoutMovieId = selId
      if (vid) initYTPlayer(vid)
    } else {
      updateSidebar()
    }
  }

  function renderLayout(movie, vid) {
    const lc = { beginner:'#dcfce7', intermediate:'#fef3c7', advanced:'#fee2e2' }
    const lt = { beginner:'#166534', intermediate:'#92400e', advanced:'#dc2626' }
    const ll = { beginner:'Cơ bản',  intermediate:'Trung cấp', advanced:'Nâng cao' }

    app.innerHTML = `
      <div style="min-height:100vh;background:#0f172a;display:flex;flex-direction:column">
        <!-- Top bar -->
        <div style="background:#1e293b;border-bottom:1px solid #334155;height:56px;padding:0 24px;
          display:flex;align-items:center;flex-shrink:0;position:sticky;top:0;z-index:20">
          <button onclick="navigate('/')" style="background:none;border:none;cursor:pointer;color:#94a3b8;font-size:14px;padding:0">← Trang chủ</button>
          <span style="font-size:15px;font-weight:700;color:#f1f5f9;font-family:'Space Grotesk',sans-serif;margin-left:16px">🎬 Xem phim học tiếng Anh</span>
        </div>

        <div style="flex:1;display:flex;overflow:hidden;min-height:calc(100vh - 56px)">
          <!-- Sidebar -->
          <div id="mv-sidebar" style="width:240px;min-width:240px;background:#1e293b;border-right:1px solid #334155;overflow-y:auto">
            ${buildSidebarContent(lc, lt, ll)}
          </div>

          <!-- Main -->
          <div style="flex:1;overflow-y:auto;padding:24px">
            ${movie ? `
              <div style="max-width:900px;margin:auto;display:flex;flex-direction:column;gap:0">
                <!-- Video -->
                <div style="border-radius:14px 14px 0 0;overflow:hidden;aspect-ratio:16/9;background:black;flex-shrink:0">
                  <div id="mv-yt-container" style="width:100%;height:100%"></div>
                </div>

                <!-- Subtitle bar -->
                <div id="mv-card"
                  style="background:#1e293b;border-radius:0 0 14px 14px;border:1px solid #334155;border-top:none;
                    padding:18px 24px;display:flex;align-items:center;justify-content:space-between;min-height:80px">
                  <div id="mv-subtitle" style="flex:1;min-width:0">
                    <span style="color:#64748b;font-size:14px">▶ Bấm play để bắt đầu</span>
                  </div>
                  <div style="margin-left:20px;flex-shrink:0">
                    ${isPro ? `
                      <button id="mv-vi-btn" onclick="mvToggleVI()"
                        style="padding:8px 18px;border-radius:8px;border:none;cursor:pointer;font-size:13px;font-weight:600;
                          background:${showVI?'#2563eb':'#334155'};color:${showVI?'white':'#94a3b8'}">
                        🌐 Song ngữ
                      </button>` : `
                      <button onclick="navigate('/pricing')"
                        style="padding:8px 18px;border-radius:8px;border:1px solid #334155;cursor:pointer;font-size:13px;
                          background:transparent;color:#f59e0b;font-weight:600;display:flex;align-items:center;gap:5px">
                        👑 Pro
                      </button>`}
                  </div>
                </div>

                <!-- Movie info -->
                <div style="margin-top:16px;padding:16px 20px;background:#1e293b;border-radius:12px;border:1px solid #334155">
                  <div style="font-size:16px;font-weight:700;color:#f1f5f9;margin-bottom:4px">${movie.title}</div>
                  <div style="font-size:12px;color:#64748b">${getSubs().length} đoạn subtitle</div>
                </div>
              </div>` : `
              <div style="display:flex;align-items:center;justify-content:center;height:200px;color:#64748b;font-size:14px">
                Chọn video từ danh sách
              </div>`}
          </div>
        </div>
      </div>`
  }

  function updateSidebar() {
    const lc = { beginner:'#dcfce7', intermediate:'#fef3c7', advanced:'#fee2e2' }
    const lt = { beginner:'#166534', intermediate:'#92400e', advanced:'#dc2626' }
    const ll = { beginner:'Cơ bản',  intermediate:'Trung cấp', advanced:'Nâng cao' }
    const el = document.getElementById('mv-sidebar')
    if (el) el.innerHTML = buildSidebarContent(lc, lt, ll)
  }

  function buildSidebarContent(lc, lt, ll) {
    return `
      <div style="padding:14px 16px;border-bottom:1px solid #334155">
        <div style="font-size:13px;font-weight:700;color:#f1f5f9">Xem phim</div>
        <div style="font-size:11px;color:#64748b;margin-top:2px">Học tiếng Anh qua phim</div>
      </div>
      <div style="padding:8px">
        ${!movies.length
          ? `<div style="padding:20px;text-align:center;color:#64748b;font-size:13px">Chưa có video</div>`
          : movies.map(m => {
              const active = m.id === selId
              const lv = m.level || 'beginner'
              return `<div onclick="mvSelect('${m.id}')"
                style="padding:12px;border-radius:10px;cursor:pointer;margin-bottom:4px;
                  background:${active?'#1d3461':'transparent'};border:1px solid ${active?'#2563eb':'transparent'}">
                <div style="font-size:13px;font-weight:${active?600:400};color:${active?'#93c5fd':'#cbd5e1'};margin-bottom:5px;line-height:1.4">${m.title}</div>
                <span style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:10px;
                  background:${lc[lv]||'#334155'};color:${lt[lv]||'#94a3b8'}">${ll[lv]||lv}</span>
              </div>`
            }).join('')}
      </div>`
  }

  window.mvSelect   = id => { selId = id; render() }
  window.mvToggleVI = () => {
    showVI = !showVI
    const btn = document.getElementById('mv-vi-btn')
    if (btn) {
      btn.style.background = showVI ? '#2563eb' : '#334155'
      btn.style.color = showVI ? 'white' : '#94a3b8'
    }
    updateSubtitleDisplay(currentSubIdx, getSubs())
  }
}
