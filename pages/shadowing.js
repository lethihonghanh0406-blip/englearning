import { supabase } from '../supabase/client.js'

export default async function shadowingPage(app) {
  let lessons      = []
  let selId        = null
  let sentIdx      = 0
  let isRecording  = false
  let showPinyin   = true
  let showVI       = false
  let lastResult   = null   // { words, spoken, score, accuracy }
  let interimText  = ''
  let recognition  = null
  let audioCtx     = null
  let animFrame    = null
  let mediaStream  = null

  app.innerHTML = `<div style="min-height:100vh;background:#f8faff;display:flex;align-items:center;justify-content:center"><div style="color:#94a3b8;font-size:14px">Đang tải...</div></div>`

  const { data } = await supabase
    .from('shadowing_lessons')
    .select('*')
    .order('created_at')

  lessons = data || []
  selId   = lessons[0]?.id || null
  render()

  function getLesson()     { return lessons.find(l => l.id === selId) || null }
  function getSentences()  { return getLesson()?.sentences         || [] }
  function getPinyin()     { return getLesson()?.sentences_pinyin  || [] }
  function getVI()         { return getLesson()?.sentences_vi      || [] }

  // ── Split Chinese into characters for comparison ──────────────────────────
  function splitZH(s) {
    return (s || '').replace(/[：:""''「」【】、。！？，；\s]/g, '').split('')
  }

  function compareZH(expected, spoken) {
    const expChars = splitZH(expected)
    const spkChars = splitZH(spoken)
    return expChars.map((c, i) => ({ char: c, ok: spkChars[i] === c }))
  }

  function calcScores(words) {
    const ok = words.filter(w => w.ok).length
    return Math.round(ok / words.length * 100)
  }

  // ── Waveform ──────────────────────────────────────────────────────────────
  function startWaveform(stream) {
    audioCtx = new AudioContext()
    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 128
    audioCtx.createMediaStreamSource(stream).connect(analyser)
    const buf = new Uint8Array(analyser.frequencyBinCount)

    function draw() {
      animFrame = requestAnimationFrame(draw)
      analyser.getByteFrequencyData(buf)
      const canvas = document.getElementById('sh-waveform')
      if (!canvas) { cancelAnimationFrame(animFrame); return }
      const ctx = canvas.getContext('2d')
      const W = canvas.width, H = canvas.height
      ctx.clearRect(0, 0, W, H)
      const bw = W / buf.length
      buf.forEach((v, i) => {
        const h = (v / 255) * H
        const g = ctx.createLinearGradient(0, H - h, 0, H)
        g.addColorStop(0, '#ef4444')
        g.addColorStop(1, '#fca5a5')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.roundRect(i * bw + 1, H - h, bw - 2, h, 2)
        ctx.fill()
      })
    }
    draw()
  }

  function stopWaveform() {
    if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null }
    if (audioCtx)  { audioCtx.close(); audioCtx = null }
    const canvas = document.getElementById('sh-waveform')
    if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
  }

  // ── Speech recognition ────────────────────────────────────────────────────
  function startRecording() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { alert('Dùng Chrome để sử dụng tính năng này!'); return }
    const sentences = getSentences()
    if (!sentences[sentIdx]) return

    isRecording = true
    lastResult  = null
    interimText = ''
    render()

    recognition = new SR()
    recognition.lang           = 'zh-CN'
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    // Start waveform
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      mediaStream = stream
      startWaveform(stream)
    }).catch(() => {})

    recognition.onresult = e => {
      let interim = '', final = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript
        else interim += e.results[i][0].transcript
      }
      interimText = interim || final
      // Update interim display without full re-render
      const el = document.getElementById('sh-interim')
      if (el) el.textContent = interimText

      if (final) {
        const words    = compareZH(sentences[sentIdx], final)
        const accuracy = calcScores(words)
        const confRaw  = e.results[e.results.length - 1][0].confidence
        const score    = Math.round((confRaw || 0.5) * 50 + accuracy * 0.5)
        lastResult  = { words, spoken: final, score, accuracy }
        interimText = ''
        isRecording = false
        stopWaveform()
        if (mediaStream) { mediaStream.getTracks().forEach(t => t.stop()); mediaStream = null }
        render()
      }
    }

    recognition.onerror = () => stopRec()
    recognition.onend   = () => { if (isRecording) stopRec() }
    recognition.start()
  }

  function stopRec() {
    isRecording = false
    stopWaveform()
    if (mediaStream) { mediaStream.getTracks().forEach(t => t.stop()); mediaStream = null }
    render()
  }

  function toggleRecording() {
    if (isRecording) {
      recognition?.stop()
      stopRec()
    } else {
      startRecording()
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  function render() {
    const lesson    = getLesson()
    const sentences = getSentences()
    const pyLines   = getPinyin()
    const viLines   = getVI()
    const sentence  = sentences[sentIdx] || ''
    const pinyin    = pyLines[sentIdx]   || ''

    const levelColor = { beginner:'#dcfce7', intermediate:'#fef3c7', advanced:'#fee2e2' }
    const levelText  = { beginner:'#166534', intermediate:'#92400e', advanced:'#dc2626' }
    const levelLabel = { beginner:'Cơ bản',  intermediate:'Trung cấp', advanced:'Nâng cao' }

    const vid = (() => {
      if (!lesson?.youtube_id) return null
      const m = lesson.youtube_id.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/)
      return m ? m[1] : lesson.youtube_id
    })()

    // Sentence display with character-level result coloring
    const sentenceHTML = lastResult
      ? lastResult.words.map(w =>
          `<span style="display:inline-block;padding:2px 5px;border-radius:5px;margin:1px;font-size:28px;font-weight:500;
            background:${w.ok?'#dcfce7':'#fee2e2'};color:${w.ok?'#15803d':'#dc2626'}">${w.char}</span>`
        ).join('')
      : `<span style="font-size:28px;font-weight:500;color:#0f172a;letter-spacing:3px">${sentence}</span>`

    const sidebar = `
      <div style="width:240px;min-width:240px;background:white;border-right:1px solid #e2e8f0;overflow-y:auto">
        <div style="padding:14px 16px;border-bottom:1px solid #f1f5f9">
          <div style="font-size:13px;font-weight:700;color:#0f172a">Shadowing</div>
          <div style="font-size:11px;color:#94a3b8;margin-top:2px">Luyện phát âm tiếng Trung</div>
        </div>
        <div style="padding:8px">
          ${!lessons.length
            ? `<div style="padding:20px;text-align:center;color:#94a3b8;font-size:13px">Chưa có bài học</div>`
            : lessons.map(l => {
                const active = l.id === selId
                const lv = l.level || 'beginner'
                return `<div onclick="shSelect('${l.id}')"
                  style="padding:12px;border-radius:10px;cursor:pointer;margin-bottom:4px;
                    background:${active?'#eff6ff':'transparent'};border:1px solid ${active?'#bfdbfe':'transparent'}">
                  <div style="font-size:13px;font-weight:${active?600:500};color:${active?'#2563eb':'#374151'};margin-bottom:5px">${l.title}</div>
                  <span style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:10px;
                    background:${levelColor[lv]||'#f1f5f9'};color:${levelText[lv]||'#374151'}">
                    ${levelLabel[lv]||lv}
                  </span>
                </div>`
              }).join('')}
        </div>
      </div>`

    const main = lesson ? `
      <div style="flex:1;overflow-y:auto;padding:24px">
        <div style="max-width:680px;margin:auto;display:flex;flex-direction:column;gap:14px">

          <!-- YouTube (collapsible) -->
          ${vid ? `
            <div style="background:white;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden">
              <div style="aspect-ratio:16/9">
                <iframe src="https://www.youtube.com/embed/${vid}?rel=0&modestbranding=1"
                  style="width:100%;height:100%;border:none"
                  allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture"
                  allowfullscreen></iframe>
              </div>
            </div>` : ''}

          <!-- Sentence card -->
          <div style="background:white;border-radius:14px;border:1px solid #e2e8f0;padding:20px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
              <div style="font-size:10px;font-weight:700;letter-spacing:.8px;color:#94a3b8">CÂU HIỆN TẠI</div>
              <div style="display:flex;gap:6px">
                <button onclick="shTogglePinyin()"
                  style="padding:5px 12px;border-radius:7px;border:none;cursor:pointer;font-size:12px;font-weight:600;
                    background:${showPinyin?'#2563eb':'#f1f5f9'};color:${showPinyin?'white':'#64748b'}">
                  Phiên âm
                </button>
                ${viLines.length ? `
                  <button onclick="shToggleVI()"
                    style="padding:5px 12px;border-radius:7px;border:none;cursor:pointer;font-size:12px;font-weight:600;
                      background:${showVI?'#2563eb':'#f1f5f9'};color:${showVI?'white':'#64748b'}">
                    Ẩn
                  </button>` : ''}
              </div>
            </div>

            <!-- Pinyin -->
            ${showPinyin && pinyin
              ? `<div style="font-size:13px;color:#94a3b8;line-height:2;letter-spacing:.5px;margin-bottom:4px">${pinyin}</div>`
              : ''}

            <!-- Chinese characters -->
            <div style="min-height:52px;margin-bottom:${interimText||lastResult?12:0}px">
              ${sentenceHTML}
            </div>

            <!-- Interim real-time display -->
            ${interimText || isRecording ? `
              <div style="border-top:1px solid #f1f5f9;padding-top:10px;margin-top:4px">
                <div style="font-size:10px;font-weight:700;letter-spacing:.7px;color:#ef4444;margin-bottom:4px">● ĐANG NGHE</div>
                <div id="sh-interim" style="font-size:16px;color:#f97316;font-weight:500">${interimText}</div>
              </div>` : ''}

            <!-- VI translation -->
            ${showVI && viLines[sentIdx]
              ? `<div style="font-size:13px;color:#2563eb;font-style:italic;line-height:1.6;padding-top:10px;border-top:1px solid #f1f5f9;margin-top:8px">${viLines[sentIdx]}</div>`
              : ''}

            <!-- Result: spoken text -->
            ${lastResult && !isRecording
              ? `<div style="font-size:12px;color:#64748b;padding-top:10px;border-top:1px solid #f1f5f9;margin-top:8px">
                  Bạn nói: <em style="color:#374151">"${lastResult.spoken}"</em>
                </div>`
              : ''}
          </div>

          <!-- Waveform -->
          ${isRecording ? `
            <div style="background:#fff5f5;border-radius:12px;border:1px solid #fecaca;padding:14px;display:flex;align-items:center;justify-content:center">
              <canvas id="sh-waveform" width="600" height="60" style="width:100%;height:60px;border-radius:6px"></canvas>
            </div>` : ''}

          <!-- Record button -->
          <button onclick="shToggleRec()"
            style="width:100%;padding:14px;border-radius:12px;border:none;cursor:pointer;font-size:15px;font-weight:700;
              background:${isRecording?'#ef4444':'#2563eb'};color:white;
              box-shadow:0 4px 12px ${isRecording?'rgba(239,68,68,.3)':'rgba(37,99,235,.25)'}">
            ${isRecording ? '■ Đang ghi âm — Bấm để dừng' : '🎤 Kiểm tra phát âm'}
          </button>

          <!-- Nav buttons -->
          <div style="display:flex;gap:10px">
            <button onclick="shPrev()" ${sentIdx===0?'disabled':''}
              style="flex:1;padding:11px;border-radius:10px;border:1px solid #e2e8f0;background:white;
                cursor:${sentIdx===0?'default':'pointer'};color:#64748b;font-size:14px;opacity:${sentIdx===0?.4:1}">
              ◀ Trước
            </button>
            <button onclick="shNext()" ${sentIdx>=sentences.length-1?'disabled':''}
              style="flex:1;padding:11px;border-radius:10px;border:none;
                background:${sentIdx>=sentences.length-1?'#fef9c3':'#fef9c3'};
                color:${sentIdx>=sentences.length-1?'#94a3b8':'#d97706'};
                cursor:${sentIdx>=sentences.length-1?'default':'pointer'};font-size:14px;font-weight:600;
                opacity:${sentIdx>=sentences.length-1?.4:1}">
              Tiếp ▶
            </button>
          </div>

          <!-- Scores -->
          ${lastResult ? `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
              <div style="background:white;border-radius:12px;border:1px solid #e2e8f0;padding:16px 20px">
                <div style="font-size:10px;font-weight:700;letter-spacing:.8px;color:#94a3b8;margin-bottom:8px">ĐIỂM PHÁT ÂM</div>
                <div style="font-size:32px;font-weight:700;color:${lastResult.score>=80?'#16a34a':lastResult.score>=60?'#d97706':'#dc2626'};font-family:'Space Grotesk',sans-serif">
                  ${lastResult.score}<span style="font-size:16px;color:#94a3b8">/100</span>
                </div>
              </div>
              <div style="background:white;border-radius:12px;border:1px solid #e2e8f0;padding:16px 20px">
                <div style="font-size:10px;font-weight:700;letter-spacing:.8px;color:#94a3b8;margin-bottom:8px">ĐỘ CHÍNH XÁC</div>
                <div style="font-size:32px;font-weight:700;color:${lastResult.accuracy>=80?'#16a34a':lastResult.accuracy>=60?'#d97706':'#dc2626'};font-family:'Space Grotesk',sans-serif">
                  ${lastResult.accuracy}<span style="font-size:16px;color:#94a3b8">%</span>
                </div>
              </div>
            </div>` : ''}

          <!-- Dot pagination -->
          ${sentences.length > 1 ? `
            <div style="display:flex;gap:5px;justify-content:center;flex-wrap:wrap;padding-bottom:8px">
              ${sentences.map((_,i) => `
                <button onclick="shGo(${i})"
                  style="width:${i===sentIdx?24:8}px;height:8px;border-radius:4px;border:none;cursor:pointer;
                    background:${i===sentIdx?'#2563eb':'#e2e8f0'};padding:0;transition:all .2s">
                </button>`).join('')}
            </div>` : ''}
        </div>
      </div>` : `
      <div style="flex:1;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:14px">
        Chọn bài học từ danh sách
      </div>`

    app.innerHTML = `
      <div style="min-height:100vh;background:#f8faff;display:flex;flex-direction:column">
        <div style="background:white;border-bottom:1px solid #e2e8f0;height:56px;padding:0 24px;
          display:flex;align-items:center;flex-shrink:0;position:sticky;top:0;z-index:20">
          <button onclick="navigate('/')" style="background:none;border:none;cursor:pointer;color:#64748b;font-size:14px;padding:0">← Trang chủ</button>
          <span style="font-size:15px;font-weight:700;color:#0f172a;font-family:'Space Grotesk',sans-serif;margin-left:16px">Shadowing</span>
        </div>
        <div style="flex:1;display:flex;overflow:hidden;min-height:calc(100vh - 56px)">
          ${sidebar}
          ${main}
        </div>
      </div>`
  }

  window.shSelect      = id => { selId = id; sentIdx = 0; lastResult = null; interimText = ''; render() }
  window.shGo          = i  => { sentIdx = i; lastResult = null; interimText = ''; render() }
  window.shPrev        = () => { if (sentIdx > 0) { sentIdx--; lastResult = null; interimText = ''; render() } }
  window.shNext        = () => { const s = getSentences(); if (sentIdx < s.length-1) { sentIdx++; lastResult = null; interimText = ''; render() } }
  window.shTogglePinyin = () => { showPinyin = !showPinyin; render() }
  window.shToggleVI    = () => { showVI = !showVI; render() }
  window.shToggleRec   = () => toggleRecording()
}
