import { supabase } from '../supabase/client.js'
import { SUPABASE_URL } from '../config/env.js'

export default async function effortlessPage(app) {
  let lessons    = []
  let selId      = null
  let tab        = 'main'      // main | ms | vocab
  let showVI     = true
  let practice   = false       // Mini Story: hide answers until clicked
  let revealed   = new Set()
  let activeIdx  = -1
  let audioOk    = true        // false when the mp3 is missing → fall back to TTS

  const saved    = loadSettings()
  let waitSec    = saved.waitSec ?? 5   // Mini Story: pause N seconds after each question (0 = off)
  let useMic     = saved.useMic ?? true
  let handledQ   = -1          // question index we already paused after
  let wait       = null        // { q, left, total, heard, timer, rec }
  let fbTimer    = null
  let loopId     = null

  function loadSettings() {
    try { return JSON.parse(localStorage.getItem('ee_settings')) || {} } catch { return {} }
  }
  function saveSettings() {
    try { localStorage.setItem('ee_settings', JSON.stringify({ waitSec, useMic })) } catch {}
  }

  app.innerHTML = `<div style="min-height:100vh;background:#f8faff;display:flex;align-items:center;justify-content:center"><div style="color:#94a3b8;font-size:14px">Đang tải...</div></div>`

  const { data } = await supabase.from('effortless_lessons').select('*').order('course').order('lesson_no')
  lessons = data || []
  selId   = lessons[0]?.id || null
  render()

  function getLesson() { return lessons.find(l => l.id === selId) || null }
  function getLines() {
    const l = getLesson()
    if (!l) return []
    if (tab === 'main') return (l.main_story || []).map(([t, en, vi]) => ({ t, text: en, vi }))
    if (tab === 'ms')   return (l.mini_story || []).map(([t, type, text]) => ({ t, type, text }))
    return []
  }
  // Audio paths are full URLs or "bucket/path/file.mp3" in public Supabase Storage
  function audioUrl() {
    const l = getLesson()
    const path = { main: l?.main_audio, ms: l?.ms_audio, vocab: l?.vocab_audio }[tab]
    if (!path) return null
    if (/^https?:/.test(path)) return path
    return `${SUPABASE_URL}/storage/v1/object/public/${path.split('/').map(encodeURIComponent).join('/')}`
  }
  function esc(s) {
    return String(s ?? '').replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]))
  }
  function fmt(sec) {
    return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`
  }

  function speakTTS(text) {
    if (!text) return
    speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'en-US'; u.rate = 0.9
    speechSynthesis.speak(u)
  }

  // ── Audio sync ─────────────────────────────────────────────────────────────
  function bindAudio() {
    const audio = document.getElementById('ee-audio')
    if (!audio) return
    audio.onerror = () => { audioOk = false; updateAudioNote() }
    // timeupdate only fires ~4×/s — poll every frame while playing so we stop right at the question's end
    audio.onplay  = () => {
      cancelWait()               // user pressed the native play button during the pause
      cancelAnimationFrame(loopId)
      const loop = () => { tick(audio); loopId = requestAnimationFrame(loop) }
      loop()
    }
    audio.onpause = () => cancelAnimationFrame(loopId)
    audio.onseeking = () => { if (!wait) handledQ = -1 }   // re-arm the pause after rewinding
    audio.ontimeupdate = () => tick(audio)
  }

  function tick(audio) {
    const lines = getLines()
    const t = audio.currentTime
    let idx = -1
    for (let i = 0; i < lines.length; i++) { if (lines[i].t <= t) idx = i; else break }
    if (idx !== activeIdx) setActive(idx, true)
    const next = lines[idx + 1]
    if (tab === 'ms' && waitSec && !audio.paused && !wait && lines[idx]?.type === 'q'
        && next && t >= next.t - 0.25 && handledQ !== idx) {
      handledQ = idx
      startWait(idx)
    }
  }

  function setActive(idx, scroll) {
    document.querySelector(`[data-ee-line="${activeIdx}"]`)?.classList.remove('ee-active')
    activeIdx = idx
    let el = document.querySelector(`[data-ee-line="${idx}"]`)
    if (!el) return
    // Hidden-answer mode: reveal the model answer once the audio reaches it
    const line = getLines()[idx]
    if (tab === 'ms' && practice && line?.type === 'a' && !revealed.has(idx)) {
      revealed.add(idx)
      el.outerHTML = msLineHTML(line, idx)
      el = document.querySelector(`[data-ee-line="${idx}"]`)
    }
    el.classList.add('ee-active')
    if (scroll) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }

  // ── Answer time (Mini Story) ───────────────────────────────────────────────
  function startWait(q) {
    document.getElementById('ee-audio')?.pause()
    clearTimeout(fbTimer)
    wait = { q, left: waitSec, total: waitSec, heard: '' }
    wait.timer = setInterval(() => {
      if (!document.getElementById('ee-wait')) return cancelWait()
      if (--wait.left <= 0) finishWait()
      else renderWait()
    }, 1000)
    if (useMic) startListening()
    renderWait()
  }

  function startListening() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    const w   = wait
    const rec = new SR()
    rec.lang = 'en-US'; rec.interimResults = true; rec.maxAlternatives = 1
    rec.onresult = e => {
      if (wait !== w) return
      let text = ''
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript
      w.heard = text
      renderWait()
      // Finished speaking → move on without waiting for the countdown
      if (e.results[e.results.length - 1].isFinal) setTimeout(() => { if (wait === w) finishWait() }, 700)
    }
    rec.onerror = () => {}
    try { rec.start(); w.rec = rec } catch {}
  }

  function cancelWait() {
    if (!wait) return
    clearInterval(wait.timer)
    try { wait.rec?.abort() } catch {}
    wait = null
    renderWait()
  }

  function finishWait() {
    if (!wait) return
    const { q, heard } = wait
    cancelWait()
    const expected = getLines().slice(q + 1).find(l => l.type !== 'q')
    if (heard && expected) showFeedback(heard, expected.text)
    document.getElementById('ee-audio')?.play()
  }

  function replayQuestion() {
    if (!wait) return
    const q = wait.q
    cancelWait()
    handledQ = -1
    playLine(q)
  }

  function matchScore(heard, expected) {
    const words = s => s.toLowerCase().replace(/[^a-z0-9' ]/g, ' ').split(/\s+/).filter(Boolean)
    const exp = words(expected), got = new Set(words(heard))
    return exp.length ? Math.round(exp.filter(w => got.has(w)).length / exp.length * 100) : 0
  }

  function renderWait() {
    const el = document.getElementById('ee-wait')
    if (!el) return
    if (!wait) { el.style.display = 'none'; return }
    const q = getLines()[wait.q]
    el.style.display = 'block'
    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:14px">
        <div style="width:52px;height:52px;border-radius:50%;background:#2563eb;color:white;display:flex;align-items:center;
          justify-content:center;font-size:22px;font-weight:700;flex-shrink:0">${wait.left}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:10px;font-weight:700;letter-spacing:.8px;color:#2563eb">ĐẾN LƯỢT BẠN TRẢ LỜI ${useMic ? '🎤' : ''}</div>
          <div style="font-size:15px;font-weight:600;color:#0f172a;margin-top:2px">${esc(q?.text)}</div>
          ${useMic ? `<div style="font-size:13px;margin-top:4px;color:${wait.heard ? '#f97316' : '#94a3b8'}">${wait.heard ? esc(wait.heard) : 'Đang nghe… hãy nói câu trả lời của bạn'}</div>` : ''}
        </div>
      </div>
      <div style="height:4px;background:#e2e8f0;border-radius:2px;margin:12px 0;overflow:hidden">
        <div style="height:100%;width:${wait.left / wait.total * 100}%;background:#2563eb;transition:width 1s linear"></div>
      </div>
      <div style="display:flex;gap:8px">
        <button onclick="eeReplayQ()" style="flex:1;padding:8px;border-radius:8px;border:1px solid #e2e8f0;background:white;cursor:pointer;font-size:13px;color:#475569">🔁 Nghe lại câu hỏi</button>
        <button onclick="eeMoreTime()" style="padding:8px 12px;border-radius:8px;border:1px solid #e2e8f0;background:white;cursor:pointer;font-size:13px;color:#475569">+3s</button>
        <button onclick="eeContinue()" style="flex:1;padding:8px;border-radius:8px;border:none;background:#2563eb;color:white;cursor:pointer;font-size:13px;font-weight:600">Tiếp tục ▶ <span style="opacity:.7;font-weight:400">(Space)</span></button>
      </div>`
  }

  function showFeedback(heard, expected) {
    const el = document.getElementById('ee-wait')
    if (!el) return
    const score = matchScore(heard, expected)
    const color = score >= 70 ? '#16a34a' : score >= 40 ? '#d97706' : '#dc2626'
    el.style.display = 'block'
    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:14px">
        <div style="width:52px;height:52px;border-radius:50%;border:3px solid ${color};color:${color};display:flex;align-items:center;
          justify-content:center;font-size:15px;font-weight:700;flex-shrink:0">${score}%</div>
        <div style="flex:1;min-width:0;font-size:13px;line-height:1.6">
          <div><span style="color:#94a3b8">Bạn nói:</span> <span style="color:#f97316">${esc(heard)}</span></div>
          <div><span style="color:#94a3b8">Câu mẫu:</span> <span style="color:#0f172a;font-weight:600">${esc(expected)}</span></div>
        </div>
      </div>`
    clearTimeout(fbTimer)
    fbTimer = setTimeout(() => { if (!wait) el.style.display = 'none' }, 5000)
  }

  function playLine(i) {
    const line  = getLines()[i]
    const audio = document.getElementById('ee-audio')
    if (!line) return
    cancelWait()
    handledQ = -1
    setActive(i, false)
    if (audio && audioOk) {
      audio.currentTime = line.t
      audio.play().catch(() => { audioOk = false; updateAudioNote(); speakTTS(line.text) })
    } else {
      speakTTS(line.text)
    }
  }

  function updateAudioNote() {
    const el = document.getElementById('ee-audio-note')
    if (el) el.style.display = audioOk ? 'none' : 'block'
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  function render() {
    const lesson = getLesson()
    cancelWait()
    clearTimeout(fbTimer)
    activeIdx = -1
    handledQ  = -1
    audioOk   = true
    speechSynthesis.cancel()
    app.innerHTML = `
      <style>
        .ee-line{display:flex;gap:12px;padding:10px 12px;border-radius:10px;cursor:pointer;border:1px solid transparent;transition:background .15s}
        .ee-line:hover{background:#f8fafc}
        .ee-active{background:#eff6ff !important;border-color:#bfdbfe}
        .ee-tab{padding:8px 16px;border-radius:8px;border:none;cursor:pointer;font-size:13px;font-weight:600}
        .ee-hidden{filter:blur(5px);user-select:none}
      </style>
      <div style="min-height:100vh;background:#f8faff;display:flex;flex-direction:column">
        <div style="background:white;border-bottom:1px solid #e2e8f0;height:56px;padding:0 24px;
          display:flex;align-items:center;flex-shrink:0;position:sticky;top:0;z-index:20">
          <button onclick="navigate('/')" style="background:none;border:none;cursor:pointer;color:#64748b;font-size:14px;padding:0">← Trang chủ</button>
          <span style="font-size:15px;font-weight:700;color:#0f172a;font-family:'Space Grotesk',sans-serif;margin-left:16px">Effortless English</span>
        </div>
        <div style="flex:1;display:flex;overflow:hidden;min-height:calc(100vh - 56px)">
          <div style="width:240px;min-width:240px;background:white;border-right:1px solid #e2e8f0;overflow-y:auto">
            ${buildSidebar()}
          </div>
          <div style="flex:1;overflow-y:auto;padding:24px 24px 180px">
            <div style="max-width:760px;margin:auto;display:flex;flex-direction:column;gap:14px">
              ${lesson ? buildMain(lesson) : `<div style="padding:40px;text-align:center;color:#94a3b8">Chưa có bài học</div>`}
            </div>
          </div>
        </div>
      </div>
      <div id="ee-wait" style="display:none;position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:50;
        width:min(560px, calc(100% - 32px));background:white;border:1px solid #bfdbfe;border-radius:16px;padding:16px;
        box-shadow:0 12px 32px rgba(15,23,42,.18)"></div>`
    bindAudio()
  }

  function buildSidebar() {
    const courses = [...new Set(lessons.map(l => l.course))]
    return `
      <div style="padding:14px 16px;border-bottom:1px solid #f1f5f9">
        <div style="font-size:13px;font-weight:700;color:#0f172a">Effortless English</div>
        <div style="font-size:11px;color:#94a3b8;margin-top:2px">Nghe hiểu & phản xạ qua câu chuyện</div>
      </div>
      ${courses.map(c => `
        <div style="padding:12px 16px 4px;font-size:10px;font-weight:700;letter-spacing:.8px;color:#94a3b8">${esc(c).toUpperCase()}</div>
        <div style="padding:0 8px 8px">
          ${lessons.filter(l => l.course === c).map(l => {
            const active = l.id === selId
            return `<div onclick="eeSelect('${l.id}')"
              style="padding:10px 12px;border-radius:10px;cursor:pointer;margin-bottom:4px;
                background:${active?'#eff6ff':'transparent'};border:1px solid ${active?'#bfdbfe':'transparent'}">
              <div style="font-size:13px;font-weight:${active?600:500};color:${active?'#2563eb':'#374151'}">${l.lesson_no}. ${esc(l.title)}</div>
            </div>`
          }).join('')}
        </div>`).join('')}`
  }

  function buildMain(lesson) {
    const tabs = [['main', '📖 Main Story'], ['ms', '❓ Mini Story'], ['vocab', '📝 Từ vựng']]
    const url  = audioUrl()
    return `
      <div style="background:white;border-radius:14px;border:1px solid #e2e8f0;padding:20px">
        <div style="font-size:11px;font-weight:700;letter-spacing:.8px;color:#94a3b8">${esc(lesson.course).toUpperCase()} • BÀI ${lesson.lesson_no}</div>
        <div style="font-size:24px;font-weight:700;color:#0f172a;font-family:'Space Grotesk',sans-serif;margin:4px 0 14px">${esc(lesson.title)}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          ${tabs.map(([k, label]) => `
            <button class="ee-tab" onclick="eeTab('${k}')"
              style="background:${tab===k?'#2563eb':'#f1f5f9'};color:${tab===k?'white':'#64748b'}">${label}</button>`).join('')}
        </div>
      </div>

      ${tab !== 'vocab' || url ? `
        <div style="background:white;border-radius:14px;border:1px solid #e2e8f0;padding:14px 16px;position:sticky;top:8px;z-index:10">
          ${url ? `<audio id="ee-audio" src="${esc(url)}" controls preload="metadata" style="width:100%"></audio>` : ''}
          <div id="ee-audio-note" style="display:${url?'none':'block'};font-size:12px;color:#92400e;background:#fef3c7;border-radius:8px;padding:8px 12px;margin-top:${url?'8px':'0'}">
            Chưa có file audio cho phần này. Bấm vào từng câu để nghe giọng đọc máy (TTS).
          </div>
          ${tab !== 'vocab' ? `<div id="ee-tools" style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:10px">${buildTools()}</div>` : ''}
        </div>` : ''}

      <div id="ee-list" style="background:white;border-radius:14px;border:1px solid #e2e8f0;padding:10px">
        ${buildList(lesson)}
      </div>`
  }

  function buildList(lesson) {
    return tab === 'main' ? buildMainStory() : tab === 'ms' ? buildMiniStory() : buildVocab(lesson)
  }

  function buildTools() {
    const btn = (on, call, label) => `
      <button onclick="${call}" style="padding:5px 12px;border-radius:7px;border:none;cursor:pointer;font-size:12px;font-weight:600;
        background:${on?'#2563eb':'#f1f5f9'};color:${on?'white':'#64748b'}">${label}</button>`
    if (tab === 'main') return btn(showVI, 'eeToggleVI()', 'Dịch tiếng Việt')
    const hasSR = !!(window.SpeechRecognition || window.webkitSpeechRecognition)
    return `
      <span style="font-size:12px;color:#64748b;font-weight:600">⏸ Dừng sau câu hỏi:</span>
      ${[[0, 'Tắt'], [3, '3s'], [5, '5s'], [6, '6s']].map(([s, l]) => btn(waitSec === s, `eeWaitSec(${s})`, l)).join('')}
      <span style="width:1px;height:18px;background:#e2e8f0;margin:0 4px"></span>
      ${hasSR ? btn(useMic, 'eeToggleMic()', '🎤 Ghi âm câu trả lời') : ''}
      ${btn(practice, 'eeTogglePractice()', '🙈 Ẩn đáp án')}
      ${waitSec ? `<div style="width:100%;font-size:11px;color:#94a3b8;margin-top:2px">
        Audio sẽ tự dừng ${waitSec}s sau mỗi câu hỏi để bạn trả lời to, rồi mới phát câu trả lời mẫu.</div>` : ''}`
  }

  // Refresh list + toolbar only, so the <audio> keeps playing
  function updateList() {
    const list  = document.getElementById('ee-list')
    const tools = document.getElementById('ee-tools')
    if (list)  list.innerHTML  = buildList(getLesson())
    if (tools) tools.innerHTML = buildTools()
    const idx = activeIdx
    activeIdx = -1
    setActive(idx, false)
  }

  function buildMainStory() {
    return getLines().map((l, i) => `
      <div class="ee-line" data-ee-line="${i}" onclick="eePlay(${i})">
        <div style="font-size:11px;color:#94a3b8;min-width:40px;padding-top:3px;font-variant-numeric:tabular-nums">${fmt(l.t)}</div>
        <div>
          <div style="font-size:16px;color:#0f172a;line-height:1.6">${esc(l.text)}</div>
          ${showVI && l.vi ? `<div style="font-size:13px;color:#2563eb;font-style:italic;line-height:1.5;margin-top:2px">${esc(l.vi)}</div>` : ''}
        </div>
      </div>`).join('')
  }

  function buildMiniStory() {
    return getLines().map((l, i) => msLineHTML(l, i)).join('')
  }

  function msLineHTML(l, i) {
    const badge = {
      q: ['Hỏi', '#fef3c7', '#92400e'],
      a: ['Đáp', '#dcfce7', '#166534'],
      s: ['Kể',  '#f1f5f9', '#64748b'],
    }
    const [label, bg, fg] = badge[l.type] || badge.s
    const hidden = practice && l.type === 'a' && !revealed.has(i)
    return `
      <div class="ee-line" data-ee-line="${i}" onclick="${hidden ? `eeReveal(${i})` : `eePlay(${i})`}">
        <div style="font-size:11px;color:#94a3b8;min-width:40px;padding-top:4px;font-variant-numeric:tabular-nums">${fmt(l.t)}</div>
        <span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;height:fit-content;margin-top:3px;
          background:${bg};color:${fg};min-width:30px;text-align:center">${label}</span>
        <div style="font-size:15px;line-height:1.6;color:${l.type==='q'?'#0f172a':'#374151'};font-weight:${l.type==='q'?600:400}">
          <span class="${hidden?'ee-hidden':''}">${esc(l.text)}</span>
          ${hidden ? `<span style="font-size:11px;color:#2563eb;margin-left:8px">Bấm để xem đáp án</span>` : ''}
        </div>
      </div>`
  }

  function buildVocab(lesson) {
    const vocab = lesson.vocab || []
    if (!vocab.length) return `<div style="padding:20px;text-align:center;color:#94a3b8;font-size:13px">Chưa có từ vựng</div>`
    return vocab.map(([word, ipa, vi], i) => `
      <div class="ee-line" onclick="eeSpeakWord(${i})" style="align-items:center">
        <div style="min-width:28px;height:28px;border-radius:50%;background:#eff6ff;color:#2563eb;display:flex;align-items:center;justify-content:center;font-size:13px">🔊</div>
        <div style="flex:1">
          <div style="font-size:16px;font-weight:600;color:#0f172a">${esc(word)} <span style="font-size:13px;font-weight:400;color:#94a3b8;margin-left:6px">${esc(ipa)}</span></div>
          <div style="font-size:13px;color:#475569;margin-top:2px">${esc(vi)}</div>
        </div>
      </div>`).join('')
  }

  window.eeSelect         = id => { selId = id; tab = 'main'; revealed = new Set(); render() }
  window.eeTab            = k  => { tab = k; revealed = new Set(); render() }
  window.eePlay           = i  => playLine(i)
  window.eeReveal         = i  => { revealed.add(i); updateList() }
  window.eeToggleVI       = () => { showVI = !showVI; updateList() }
  window.eeTogglePractice = () => { practice = !practice; revealed = new Set(); updateList() }
  window.eeSpeakWord      = i  => speakTTS(getLesson()?.vocab?.[i]?.[0])
  window.eeWaitSec        = s  => { waitSec = s; saveSettings(); if (!s) cancelWait(); updateList() }
  window.eeToggleMic      = () => { useMic = !useMic; saveSettings(); updateList() }
  window.eeContinue       = () => finishWait()
  window.eeReplayQ        = () => replayQuestion()
  window.eeMoreTime       = () => { if (wait) { wait.left += 3; wait.total += 3; renderWait() } }

  // Space / Enter ends the answer pause early (replaces any handler from a previous visit)
  document.removeEventListener('keydown', window.__eeKeydown)
  window.__eeKeydown = e => {
    if (!wait || !document.getElementById('ee-wait')) return
    if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); finishWait() }
  }
  document.addEventListener('keydown', window.__eeKeydown)
}
