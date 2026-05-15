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
  let loopMode      = false
  let loopIdx       = -1
  let speed         = 1.0
  let isRecording   = false
  let lastResult    = null
  let interimText   = ''
  let recognition   = null
  let audioCtx      = null
  let animFrame     = null
  let mediaStream   = null

  // Custom YouTube URL mode
  let customMovie   = null
  const ipaCache    = new Map()   // word → /ipa/

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

  function getMovie() { return customMovie?.id === selId ? customMovie : (movies.find(m => m.id === selId) || null) }
  function getSubs()  { return getMovie()?.subtitles || [] }
  function getVid(movie) {
    if (!movie?.youtube_id) return null
    const m = movie.youtube_id.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/)
    return m ? m[1] : movie.youtube_id
  }

  // ── English word comparison ────────────────────────────────────────────────
  function compareEN(expected, spoken) {
    const norm = s => s.toLowerCase().replace(/[^a-z\s']/g, '').trim()
    const exp  = norm(expected).split(/\s+/).filter(Boolean)
    const spk  = norm(spoken).split(/\s+/).filter(Boolean)
    return exp.map((w, i) => ({ word: w, ok: spk[i] === w }))
  }
  function calcAccuracy(words) {
    return words.length ? Math.round(words.filter(w => w.ok).length / words.length * 100) : 0
  }

  // ── Waveform ───────────────────────────────────────────────────────────────
  function startWaveform(stream) {
    audioCtx = new AudioContext()
    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 128
    audioCtx.createMediaStreamSource(stream).connect(analyser)
    const buf = new Uint8Array(analyser.frequencyBinCount)
    function draw() {
      animFrame = requestAnimationFrame(draw)
      analyser.getByteFrequencyData(buf)
      const canvas = document.getElementById('mv-waveform')
      if (!canvas) { cancelAnimationFrame(animFrame); return }
      const ctx = canvas.getContext('2d'), W = canvas.width, H = canvas.height
      ctx.clearRect(0, 0, W, H)
      const bw = W / buf.length
      buf.forEach((v, i) => {
        const h = (v / 255) * H
        const g = ctx.createLinearGradient(0, H - h, 0, H)
        g.addColorStop(0, '#3b82f6'); g.addColorStop(1, '#93c5fd')
        ctx.fillStyle = g
        ctx.beginPath(); ctx.roundRect(i * bw + 1, H - h, bw - 2, h, 2); ctx.fill()
      })
    }
    draw()
  }
  function stopWaveform() {
    if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null }
    if (audioCtx)  { audioCtx.close(); audioCtx = null }
    const c = document.getElementById('mv-waveform')
    if (c) c.getContext('2d').clearRect(0, 0, c.width, c.height)
  }

  // ── Speech recognition (English) ──────────────────────────────────────────
  function startRecording() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { alert('Dùng Chrome để sử dụng tính năng này!'); return }
    const subs = getSubs()
    if (!subs[currentSubIdx]) return
    isRecording = true; lastResult = null; interimText = ''
    if (ytPlayer && ytReady) ytPlayer.pauseVideo()
    updateShadowPanel(currentSubIdx, subs)
    recognition = new SR()
    recognition.lang = 'en-US'; recognition.interimResults = true; recognition.maxAlternatives = 1
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      mediaStream = stream; startWaveform(stream)
    }).catch(() => {})
    recognition.onresult = e => {
      let interim = '', final = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript
        else interim += e.results[i][0].transcript
      }
      interimText = interim || final
      const el = document.getElementById('mv-interim')
      if (el) el.textContent = interimText
      if (final) {
        const words    = compareEN(subs[currentSubIdx].en, final)
        const accuracy = calcAccuracy(words)
        const score    = Math.round(((e.results[e.results.length-1][0].confidence || 0.5) * 50) + accuracy * 0.5)
        lastResult = { words, spoken: final, score, accuracy }
        interimText = ''; isRecording = false
        stopWaveform()
        if (mediaStream) { mediaStream.getTracks().forEach(t => t.stop()); mediaStream = null }
        updateShadowPanel(currentSubIdx, subs)
      }
    }
    recognition.onerror = () => stopRec()
    recognition.onend   = () => { if (isRecording) stopRec() }
    recognition.start()
  }
  function stopRec() {
    isRecording = false; stopWaveform()
    if (mediaStream) { mediaStream.getTracks().forEach(t => t.stop()); mediaStream = null }
    updateShadowPanel(currentSubIdx, getSubs())
  }
  function mvToggleRecording() {
    if (isRecording) { recognition?.stop(); stopRec() } else startRecording()
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
        if (state !== 1 && state !== 2) return
        const t = ytPlayer.getCurrentTime()
        const idx = findSubIdx(subs, t)

        // Loop: if moved past the loop segment, seek back
        if (loopMode && loopIdx >= 0 && idx !== loopIdx) {
          ytPlayer.seekTo(subs[loopIdx].t, true)
          ytPlayer.playVideo()
          return
        }

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
    // Unhighlight previous
    const prev = document.querySelector('.mv-sub-item.active')
    if (prev) prev.classList.remove('active')

    // Highlight in list
    if (idx >= 0 && subs[idx]) {
      const el = document.getElementById('mvsub-' + idx)
      if (el) {
        el.classList.add('active')
        el.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }
    }

    // Update shadowing panel
    updateShadowPanel(idx, subs)

    // Async: load IPA for current sentence words
    if (idx >= 0 && subs[idx]?.en && !lastResult) {
      loadSentenceIpa(subs[idx].en, idx)
    }
  }

  function updateShadowPanel(idx, subs) {
    const el = document.getElementById('mv-shadow-panel')
    if (!el) return
    const sub = subs[idx]
    if (!sub) {
      el.innerHTML = `<span style="color:#475569;font-size:14px">▶ Bấm play để bắt đầu</span>`
      return
    }

    // EN words — highlight correct/wrong after result
    const enHTML = lastResult
      ? lastResult.words.map(w =>
          `<span style="display:inline-block;padding:1px 6px;border-radius:5px;margin:2px 1px;font-size:16px;font-weight:600;
            background:${w.ok?'#166534':'#7f1d1d'};color:${w.ok?'#bbf7d0':'#fca5a5'}">${w.word}</span>`
        ).join(' ')
      : buildIpaWordDisplay(sub.en, idx)

    el.innerHTML = `
      <div style="text-align:center;margin-bottom:6px">${enHTML}</div>
      ${showVI && sub.vi ? `<div style="font-size:13px;color:#93c5fd;font-style:italic;text-align:center;margin-bottom:6px">${sub.vi}</div>` : ''}

      ${isRecording ? `
        <canvas id="mv-waveform" width="500" height="40"
          style="width:100%;max-width:500px;height:40px;display:block;margin:6px auto;border-radius:6px;background:#0f172a"></canvas>
        <div id="mv-interim" style="text-align:center;font-size:13px;color:#f97316;min-height:18px">${interimText}</div>` : ''}

      ${lastResult ? `
        <div style="display:flex;gap:10px;justify-content:center;margin-top:8px">
          <div style="text-align:center;background:#0f172a;border-radius:8px;padding:8px 16px">
            <div style="font-size:10px;color:#475569;font-weight:700;letter-spacing:.7px">ĐIỂM</div>
            <div style="font-size:24px;font-weight:700;color:${lastResult.score>=80?'#4ade80':lastResult.score>=60?'#fbbf24':'#f87171'}">${lastResult.score}</div>
          </div>
          <div style="text-align:center;background:#0f172a;border-radius:8px;padding:8px 16px">
            <div style="font-size:10px;color:#475569;font-weight:700;letter-spacing:.7px">CHÍNH XÁC</div>
            <div style="font-size:24px;font-weight:700;color:${lastResult.accuracy>=80?'#4ade80':lastResult.accuracy>=60?'#fbbf24':'#f87171'}">${lastResult.accuracy}%</div>
          </div>
        </div>` : ''}
    `
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

  function buildSubList(subs) {
    if (!subs.length) return `<div style="padding:20px;color:#64748b;font-size:13px;text-align:center">Không có subtitle</div>`
    return subs.map((s, i) => `
      <div id="mvsub-${i}" class="mv-sub-item" onclick="if(!window.getSelection()?.toString()?.trim())mvSeek(${s.t})"
        style="padding:10px 14px;border-radius:8px;cursor:pointer;margin-bottom:2px;border:1px solid transparent;transition:.15s">
        <div class="mv-sub-en" style="font-size:15px;color:#cbd5e1;line-height:1.5;user-select:text;cursor:text">${s.en}</div>
        ${showVI && s.vi ? `<div class="mv-sub-vi" style="font-size:13px;color:#93c5fd;font-style:italic;margin-top:2px;line-height:1.4;user-select:text;cursor:text">${s.vi}</div>` : ''}
      </div>`).join('')
  }

  function renderLayout(movie, vid) {
    const lc = { beginner:'#dcfce7', intermediate:'#fef3c7', advanced:'#fee2e2' }
    const lt = { beginner:'#166534', intermediate:'#92400e', advanced:'#dc2626' }
    const ll = { beginner:'Cơ bản',  intermediate:'Trung cấp', advanced:'Nâng cao' }
    const subs = getSubs()

    app.innerHTML = `
      <style>
        .mv-sub-item:hover { background:#1e293b !important; }
        .mv-sub-item.active { background:#1d3461 !important; border-color:#2563eb !important; }
        .mv-sub-item.active .mv-sub-en { color:#f1f5f9 !important; font-weight:600; }
        #mv-url-input:focus { border-color:#2563eb !important; outline:none; }
        #mv-url-input::placeholder { color:#475569; }
      </style>
      <div style="min-height:100vh;background:#0f172a;display:flex;flex-direction:column">
        <!-- Top bar -->
        <div style="background:#1e293b;border-bottom:1px solid #334155;height:56px;padding:0 24px;
          display:flex;align-items:center;justify-content:space-between;flex-shrink:0;position:sticky;top:0;z-index:20">
          <div style="display:flex;align-items:center;gap:16px">
            <button onclick="navigate('/')" style="background:none;border:none;cursor:pointer;color:#94a3b8;font-size:14px;padding:0">← Trang chủ</button>
            <span style="font-size:15px;font-weight:700;color:#f1f5f9;font-family:'Space Grotesk',sans-serif">🎬 Xem phim học tiếng Anh</span>
          </div>
          <div>
            ${isPro ? `
              <button id="mv-vi-btn" onclick="mvToggleVI()"
                style="padding:7px 16px;border-radius:8px;border:none;cursor:pointer;font-size:13px;font-weight:600;
                  background:${showVI?'#2563eb':'#334155'};color:${showVI?'white':'#94a3b8'}">
                🌐 Song ngữ
              </button>` : `
              <button onclick="navigate('/pricing')"
                style="padding:7px 16px;border-radius:8px;border:1px solid #334155;cursor:pointer;font-size:13px;
                  background:transparent;color:#f59e0b;font-weight:600">
                👑 Pro
              </button>`}
          </div>
        </div>

        <!-- YouTube URL input bar -->
        <div style="background:#0f172a;border-bottom:1px solid #1e293b;padding:10px 16px;display:flex;gap:10px;align-items:center;flex-shrink:0">
          <div style="flex:1;position:relative">
            <input id="mv-url-input" type="url"
              placeholder="🔗  Dán link YouTube vào đây (youtube.com/watch?v=... hoặc youtu.be/...)"
              value="${customMovie ? 'https://www.youtube.com/watch?v=' + (customMovie.youtube_id || '') : ''}"
              onkeydown="if(event.key==='Enter')mvLoadURL()"
              style="width:100%;box-sizing:border-box;background:#1e293b;border:1px solid #334155;border-radius:10px;
                padding:10px 14px;color:#f1f5f9;font-size:14px;transition:border-color .15s"/>
          </div>
          <button id="mv-load-btn" onclick="mvLoadURL()"
            style="padding:10px 22px;border-radius:10px;border:none;cursor:pointer;background:#2563eb;
              color:white;font-size:14px;font-weight:700;white-space:nowrap;flex-shrink:0;
              box-shadow:0 2px 10px rgba(37,99,235,.4);transition:opacity .15s">
            ▶ Tải video
          </button>
        </div>

        <div style="display:flex;overflow:hidden;height:calc(100vh - 56px - 58px)">
          <!-- Movie list sidebar -->
          <div id="mv-sidebar" style="width:200px;min-width:200px;background:#1e293b;border-right:1px solid #334155;overflow-y:auto;height:100%">
            ${buildSidebarContent(lc, lt, ll)}
          </div>

          ${movie ? `
          <!-- Subtitle panel (left) -->
          <div id="mv-sub-panel" style="width:340px;min-width:340px;background:#0f172a;border-right:1px solid #1e293b;overflow-y:auto;padding:8px;height:100%">
            <div style="padding:8px 6px 6px;font-size:10px;font-weight:700;color:#475569;letter-spacing:.8px;margin-bottom:4px">
              SUBTITLES — ${subs.length} đoạn
            </div>
            ${buildSubList(subs)}
          </div>

          <!-- Video panel (right): fixed, no scroll -->
          <div style="flex:1;display:flex;flex-direction:column;background:#0f172a;overflow:hidden;height:100%">
            <!-- Video -->
            <div id="mv-card" style="position:relative;width:100%;max-height:220px;height:220px;flex-shrink:0;background:#000">
              <div id="mv-yt-container" style="position:absolute;top:0;left:0;width:100%;height:100%"></div>
            </div>

            <!-- Current subtitle display -->
            <div id="mv-shadow-panel"
              style="padding:14px 20px;min-height:64px;display:flex;align-items:center;justify-content:center;
                border-bottom:1px solid #1e293b;flex-shrink:0">
              <span style="color:#475569;font-size:14px">▶ Bấm play để bắt đầu</span>
            </div>

            <!-- Shadowing controls -->
            <div style="padding:10px 16px;display:flex;align-items:center;gap:10px;flex-shrink:0;
              background:#1e293b;border-top:1px solid #334155;flex-wrap:wrap">
              <span style="font-size:11px;font-weight:700;color:#475569;letter-spacing:.8px">SHADOWING</span>

              <!-- Loop -->
              <button id="mv-loop-btn" onclick="mvToggleLoop()"
                style="padding:6px 14px;border-radius:8px;border:none;cursor:pointer;font-size:12px;font-weight:600;
                  background:${loopMode?'#dc2626':'#334155'};color:${loopMode?'white':'#94a3b8'}">
                🔄 Lặp câu
              </button>

              <!-- Speed -->
              <div style="display:flex;gap:4px">
                ${[0.5, 0.75, 1.0].map(s => `
                  <button onclick="mvSetSpeed(${s})"
                    style="padding:6px 12px;border-radius:8px;border:none;cursor:pointer;font-size:12px;font-weight:600;
                      background:${speed===s?'#2563eb':'#334155'};color:${speed===s?'white':'#94a3b8'}">
                    ${s === 1 ? '1x' : s + 'x'}
                  </button>`).join('')}
              </div>

              <!-- Record button -->
              <button id="mv-rec-btn" onclick="mvToggleRec()"
                style="padding:6px 18px;border-radius:8px;border:none;cursor:pointer;font-size:12px;font-weight:700;
                  background:${isRecording?'#ef4444':'#2563eb'};color:white;
                  box-shadow:0 2px 8px ${isRecording?'rgba(239,68,68,.4)':'rgba(37,99,235,.3)'}">
                ${isRecording ? '■ Dừng' : '🎤 Kiểm tra'}
              </button>

              <!-- Prev / Next segment -->
              <div style="display:flex;gap:4px;margin-left:auto">
                <button onclick="mvPrevSub()" title="Câu trước"
                  style="padding:6px 12px;border-radius:8px;border:none;cursor:pointer;font-size:12px;background:#334155;color:#94a3b8">⏮ Trước</button>
                <button onclick="mvNextSub()" title="Câu sau"
                  style="padding:6px 12px;border-radius:8px;border:none;cursor:pointer;font-size:12px;background:#334155;color:#94a3b8">Sau ⏭</button>
              </div>
            </div>
          </div>` : `
          <div style="flex:1;display:flex;align-items:center;justify-content:center;color:#64748b;font-size:14px">
            Chọn video từ danh sách
          </div>`}
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

  window.mvSelect  = id => { selId = id; render() }
  window.mvSeek    = t  => { if (ytPlayer && ytReady) { ytPlayer.seekTo(t, true); ytPlayer.playVideo() } }

  window.mvToggleLoop = () => {
    loopMode = !loopMode
    loopIdx  = loopMode ? currentSubIdx : -1
    const btn = document.getElementById('mv-loop-btn')
    if (btn) {
      btn.style.background = loopMode ? '#dc2626' : '#334155'
      btn.style.color      = loopMode ? 'white'   : '#94a3b8'
    }
  }

  window.mvSetSpeed = s => {
    speed = s
    if (ytPlayer && ytReady) ytPlayer.setPlaybackRate(s)
    // Update speed buttons
    document.querySelectorAll('[onclick^="mvSetSpeed"]').forEach(btn => {
      const bs = parseFloat(btn.getAttribute('onclick').match(/[\d.]+/)[0])
      btn.style.background = bs === s ? '#2563eb' : '#334155'
      btn.style.color      = bs === s ? 'white'   : '#94a3b8'
    })
  }

  window.mvToggleRec = () => mvToggleRecording()

  window.mvPrevSub = () => {
    const subs = getSubs()
    const idx  = Math.max(0, currentSubIdx - 1)
    if (subs[idx]) { lastResult = null; loopIdx = loopMode ? idx : -1; window.mvSeek(subs[idx].t) }
  }

  window.mvNextSub = () => {
    const subs = getSubs()
    const idx  = Math.min(subs.length - 1, currentSubIdx + 1)
    if (subs[idx]) { lastResult = null; loopIdx = loopMode ? idx : -1; window.mvSeek(subs[idx].t) }
  }
  // ── IPA helpers ───────────────────────────────────────────────────────────
  async function fetchWordIpa(word) {
    const key = word.toLowerCase().replace(/[^a-z']/g, '')
    if (!key || key.length < 2) return ''
    if (ipaCache.has(key)) return ipaCache.get(key)
    try {
      const r = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${key}`)
      if (!r.ok) { ipaCache.set(key, ''); return '' }
      const d = await r.json()
      const ipa = d[0]?.phonetics?.find(p => p.text)?.text || d[0]?.phonetic || ''
      ipaCache.set(key, ipa)
      return ipa
    } catch { ipaCache.set(key, ''); return '' }
  }

  const STOP = new Set(['a','an','the','of','in','on','at','for','to','and','or','is','it','i','be','as','up','by'])

  function buildIpaWordDisplay(sentence, subIdx) {
    const words = sentence.split(/\s+/).filter(Boolean)
    return `<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:6px 10px;padding:4px 0" id="ipa-row-${subIdx}">
      ${words.map(w => {
        const clean = w.replace(/[^a-zA-Z'-]/g, '').toLowerCase()
        const cached = (!STOP.has(clean) && clean.length > 1) ? ipaCache.get(clean) : ''
        return `<div style="text-align:center">
          <div style="font-size:20px;font-weight:500;color:#f1f5f9">${w}</div>
          <div style="font-size:12px;color:#60a5fa;font-style:italic;min-height:15px">${cached || ''}</div>
        </div>`
      }).join('')}
    </div>`
  }

  async function loadSentenceIpa(sentence, subIdx) {
    const words = sentence.split(/\s+/).filter(Boolean)
    const fetches = words.map(async w => {
      const clean = w.replace(/[^a-zA-Z'-]/g, '').toLowerCase()
      if (STOP.has(clean) || clean.length < 2) return { w, ipa: '' }
      const ipa = await fetchWordIpa(clean)
      return { w, ipa }
    })
    const results = await Promise.all(fetches)

    const row = document.getElementById(`ipa-row-${subIdx}`)
    if (!row) return
    row.innerHTML = results.map(({ w, ipa }) => `
      <div style="text-align:center">
        <div style="font-size:20px;font-weight:500;color:#f1f5f9">${w}</div>
        <div style="font-size:12px;color:#60a5fa;font-style:italic;min-height:15px">${ipa}</div>
      </div>`).join('')
  }

  // ── Load YouTube URL ───────────────────────────────────────────────────────
  window.mvLoadURL = async () => {
    const urlEl = document.getElementById('mv-url-input')
    const url   = (urlEl?.value || '').trim()
    if (!url) return

    const m = url.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/)
    const videoId = m?.[1] || (url.match(/[A-Za-z0-9_-]{11}/)?.[0])
    if (!videoId || videoId.length !== 11) {
      urlEl.style.borderColor = '#ef4444'
      setTimeout(() => { if (urlEl) urlEl.style.borderColor = '#334155' }, 2000)
      return
    }

    const btn = document.getElementById('mv-load-btn')
    if (btn) { btn.textContent = '⏳ Đang tải...'; btn.disabled = true }

    try {
      const res  = await fetch(`/api/transcript?v=${videoId}`)
      const data = await res.json()

      if (!res.ok || data.error) {
        alert('⚠️ ' + (data.error || 'Không thể tải phụ đề'))
        return
      }

      customMovie = { id: `yt-${videoId}`, youtube_id: videoId, title: data.title || url, level: null, subtitles: data.subs }
      selId         = customMovie.id
      currentSubIdx = -1
      lastResult    = null

      stopSync()
      renderLayout(customMovie, videoId)
      layoutMovieId = selId
      initYTPlayer(videoId)

      setTimeout(() => {
        const el = document.getElementById('mv-url-input')
        if (el) el.value = `https://www.youtube.com/watch?v=${videoId}`
      }, 80)

    } catch (e) {
      alert('Lỗi kết nối: ' + e.message)
    } finally {
      if (btn) { btn.textContent = '▶ Tải video'; btn.disabled = false }
    }
  }

  window.mvToggleVI = () => {
    showVI = !showVI
    const btn = document.getElementById('mv-vi-btn')
    if (btn) {
      btn.style.background = showVI ? '#2563eb' : '#334155'
      btn.style.color = showVI ? 'white' : '#94a3b8'
    }
    // Rebuild subtitle list with/without VI
    const panel = document.getElementById('mv-sub-panel')
    if (panel) {
      const subs = getSubs()
      panel.innerHTML = `
        <div style="padding:8px 6px 6px;font-size:10px;font-weight:700;color:#475569;letter-spacing:.8px;margin-bottom:4px">
          SUBTITLES — ${subs.length} đoạn
        </div>
        ${buildSubList(subs)}`
      // Re-highlight current
      if (currentSubIdx >= 0) {
        const el = document.getElementById('mvsub-' + currentSubIdx)
        if (el) { el.classList.add('active'); el.scrollIntoView({ block: 'center' }) }
      }
      updateShadowPanel(currentSubIdx, getSubs())
    }
  }
}
