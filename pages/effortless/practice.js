import { BASE, audioUrl, mainLines, msParts, vocabItems, patternItems, checkPattern, getState, markActivity, addTime } from './store.js'
import { shell, esc, speak, matchScore, scoreColor, getSR } from './ui.js'

const ROUND = 5
const MODES = [
  ['listen', '🎧 Nghe & trả lời'],
  ['fill',   '✏️ Điền từ'],
  ['mc',     '🔤 Trắc nghiệm'],
  ['pattern','🗣 Mẫu câu'],
]

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}
const norm = s => s.toLowerCase().replace(/[^a-z']/g, '')

export default function practiceView({ app, lessons, params, onLeave }) {
  const s0 = getState()
  let slug  = params.get('lesson') || s0.last || lessons[0]?.slug
  let mode  = 'listen'
  let items = []
  let idx   = 0
  let results = []            // score 0–100 per item, null = skipped
  let cur   = {}              // per-item UI state: { heard, listening, revealed, picked, typed, checked }
  let rec   = null
  let recStart = 0
  let segLoop = null

  const lesson = () => lessons.find(l => l.slug === slug)
  const $ = id => document.getElementById(id)

  // ── Build a round ──────────────────────────────────────────────────────────
  function buildItems() {
    const l = lesson()
    if (!l) return []
    if (mode === 'listen') {
      const pairs = []
      for (const { audio, lines: ls } of msParts(l)) ls.forEach((q, i) => {
        const a = ls[i + 1]
        if (q.type === 'q' && a?.type === 'a' && a.text.split(' ').length > 2)
          pairs.push({ q, a, audio, qEnd: a.t, aEnd: ls[i + 2]?.t ?? a.t + 5 })
      })
      return shuffle(pairs).slice(0, ROUND)
    }
    if (mode === 'pattern') return shuffle(patternItems(l)).slice(0, ROUND)
    if (mode === 'fill') {
      const heads = vocabItems(l).map(v => v.word.split(' ')[0].toLowerCase().replace(/e$/, '')).filter(h => h.length > 2)
      const ls = mainLines(l).filter(x => x.t > 1)
      const out = []
      for (const line of shuffle(ls)) {
        let m = null
        for (const h of shuffle(heads)) { m = line.text.match(new RegExp(`\\b(${h}\\w*)\\b`, 'i')); if (m) break }
        // No vocab word in this sentence → blank its longest word instead
        if (!m) { const w = line.text.split(/[^A-Za-z']+/).sort((a, b) => b.length - a.length)[0]; m = w ? [w, w] : null }
        if (m) out.push({ line, answer: m[1], end: ls[ls.indexOf(line) + 1]?.t ?? line.t + 6 })
        if (out.length === ROUND) break
      }
      return out
    }
    const vocab = vocabItems(l)
    return shuffle(vocab).slice(0, ROUND).map(v => ({
      v, options: shuffle([v.vi, ...shuffle(vocab.filter(x => x.vi !== v.vi)).slice(0, 3).map(x => x.vi)]),
    }))
  }

  function restart() {
    stopListening(); stopSegment()
    items = buildItems(); idx = 0; results = []; cur = {}
    render()
  }

  // ── Audio segments ─────────────────────────────────────────────────────────
  function playSegment(path, start, end, fallbackText) {
    const audio = $('ee-paudio')
    const url = audioUrl(path)
    stopSegment()
    if (!audio || !url) return speak(fallbackText)
    if (audio.dataset.src !== url) { audio.src = url; audio.dataset.src = url }
    const go = () => {
      audio.currentTime = start
      audio.play().then(() => {
        const loop = () => {
          if (!document.contains(audio)) return audio.pause()
          if (audio.currentTime >= end - 0.05) return audio.pause()
          segLoop = requestAnimationFrame(loop)
        }
        segLoop = requestAnimationFrame(loop)
      }).catch(() => speak(fallbackText))
    }
    audio.readyState >= 1 ? go() : (audio.onloadedmetadata = go, audio.onerror = () => speak(fallbackText))
  }
  function stopSegment() {
    cancelAnimationFrame(segLoop)
    $('ee-paudio')?.pause()
  }

  // ── Speech ─────────────────────────────────────────────────────────────────
  function startListening() {
    const SR = getSR()
    if (!SR) return alert('Dùng Chrome hoặc Edge để luyện nói.')
    stopSegment()
    rec = new SR()
    rec.lang = 'en-US'; rec.interimResults = true; rec.maxAlternatives = 1
    cur.listening = true; cur.heard = ''
    recStart = Date.now()
    rec.onresult = e => {
      let text = ''
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript
      cur.heard = text
      if (e.results[e.results.length - 1].isFinal) stopListening()
      renderItem()
    }
    rec.onerror = () => stopListening()
    rec.onend = () => { if (cur.listening) stopListening() }
    try { rec.start() } catch {}
    renderItem()
  }
  function stopListening() {
    if (!rec) return
    try { rec.stop() } catch {}
    rec = null
    addTime('speak', Math.round((Date.now() - recStart) / 1000))
    cur.listening = false
    if (cur.heard && mode === 'pattern') checkOwnSentence(cur.heard)
    else if (cur.heard) results[idx] = matchScore(cur.heard, items[idx].a.text)
    renderItem()
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  function render() {
    const l = lesson()
    shell(app, '/practice', `
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:16px">
        <div class="ee-h" style="font-size:24px">Luyện tập</div>
        <select onchange="eePLesson(this.value)" style="border:1px solid var(--line);border-radius:999px;padding:8px 14px;font:inherit;font-size:13px;background:#fff">
          ${lessons.map(x => `<option value="${esc(x.slug)}" ${x.slug === slug ? 'selected' : ''}>Bài ${x.lesson_no} – ${esc(x.title)}</option>`).join('')}
        </select>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
        ${MODES.map(([k, label]) => `<button class="ee-pill ${mode === k ? 'on' : ''}" onclick="eePMode('${k}')">${label}</button>`).join('')}
      </div>
      <audio id="ee-paudio" preload="metadata"></audio>
      <div style="max-width:720px">
        <div class="ee-card" id="ee-pcard" style="padding:24px;min-height:340px">${l ? '' : 'Chưa có bài học'}</div>
        <div id="ee-pnav" style="display:flex;justify-content:space-between;margin-top:14px"></div>
      </div>`)
    renderItem()
  }

  function renderItem() {
    const card = $('ee-pcard'), nav = $('ee-pnav')
    if (!card) return
    if (!items.length) { card.innerHTML = `<div class="ee-muted">Bài này chưa đủ dữ liệu cho chế độ luyện tập này.</div>`; nav.innerHTML = ''; return }
    if (idx >= items.length) return renderSummary()
    const it = items[idx]
    const head = (tag) => `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px">
        <span style="background:var(--o-soft);color:var(--o2);font-size:12px;font-weight:600;padding:4px 12px;border-radius:999px">${tag}</span>
        <span class="ee-muted">${idx + 1}/${items.length}</span>
      </div>`
    const answered = results[idx] != null || cur.revealed || cur.checked || cur.picked != null

    if (mode === 'listen') {
      const score = results[idx]
      card.innerHTML = `
        ${head('🎧 Nghe & trả lời')}
        <div style="display:flex;align-items:center;gap:14px">
          <button onclick="eePlayQ()" title="Nghe câu hỏi" style="width:52px;height:52px;border-radius:50%;border:none;background:var(--o-soft);color:var(--o2);font-size:22px;cursor:pointer;flex-shrink:0">🔊</button>
          <div class="ee-h" style="font-size:24px">${esc(it.q.text)}</div>
        </div>
        <div class="ee-muted" style="margin:8px 0 26px 66px;font-size:13px">Nghe câu hỏi và trả lời to thành tiếng.</div>
        <div style="display:flex;flex-direction:column;align-items:center;gap:12px">
          <button onclick="eeMic()" style="width:76px;height:76px;border-radius:50%;border:none;cursor:pointer;font-size:30px;color:#fff;
            background:${cur.listening ? '#dc2626' : 'var(--o)'};box-shadow:0 0 0 ${cur.listening ? 14 : 10}px ${cur.listening ? 'rgba(220,38,38,.18)' : 'rgba(37,99,235,.18)'}">${cur.listening ? '■' : '🎤'}</button>
          <div style="font-size:14px;min-height:22px;color:${cur.heard ? 'var(--o2)' : 'var(--mute)'}">${cur.heard ? esc(cur.heard) : cur.listening ? 'Đang nghe…' : 'Bấm mic rồi nói câu trả lời'}</div>
          ${score != null && cur.heard ? `<div style="font-weight:700;color:${scoreColor(score)}">${score}% khớp với câu mẫu</div>` : ''}
        </div>
        <div style="margin-top:22px;border:1px dashed #93c5fd;background:#f8fbff;border-radius:12px;padding:14px">
          ${cur.revealed || score != null
            ? `<div style="font-size:12px;color:var(--o2);font-weight:600">💡 Câu trả lời mẫu</div>
               <div style="display:flex;align-items:center;gap:10px;margin-top:4px"><span style="font-size:15px">${esc(it.a.text)}</span>
               <span class="ee-link" onclick="eePlayA()">🔊 Nghe</span></div>`
            : `<span class="ee-link" onclick="eeHint()">💡 Xem gợi ý</span>`}
        </div>`
    } else if (mode === 'pattern') {
      card.innerHTML = `
        ${head('🗣 Tự đặt câu với mẫu câu')}
        <div style="display:inline-block;background:var(--o-soft);color:var(--o2);font-weight:700;padding:8px 16px;border-radius:10px;font-size:20px">${esc(it.structure)}</div>
        <div style="display:flex;gap:10px;align-items:center;margin-top:16px">
          <button onclick="eeSayPat()" title="Nghe câu mẫu" style="width:40px;height:40px;border-radius:50%;border:none;background:var(--o-soft);color:var(--o2);font-size:16px;cursor:pointer">🔊</button>
          <div><div style="font-size:15px"><span class="ee-muted">Ví dụ:</span> ${esc(it.example)}</div><div class="ee-muted" style="font-size:13px">${esc(it.vi)}</div></div>
        </div>
        <div style="font-size:14px;font-weight:600;margin:24px 0 10px">Nói hoặc gõ một câu <u>của riêng bạn</u> dùng “${esc(it.key)}”:</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
          ${getSR() ? `<button onclick="eeMic()" style="width:52px;height:52px;border-radius:50%;border:none;cursor:pointer;font-size:22px;color:#fff;
            background:${cur.listening ? '#dc2626' : 'var(--o)'}">${cur.listening ? '■' : '🎤'}</button>` : ''}
          <input id="ee-ptext" value="${esc(cur.typed || '')}" placeholder="Ví dụ: ${esc(it.key)} …" autocomplete="off"
            onkeydown="if(event.key==='Enter')eePatSubmit()"
            style="flex:1;min-width:200px;border:1px solid var(--line);border-radius:10px;padding:12px 14px;font:inherit;font-size:15px;outline-color:#93c5fd">
          <button class="ee-btn" onclick="eePatSubmit()">Kiểm tra</button>
        </div>
        ${cur.listening ? `<div style="margin-top:10px;font-size:14px;color:var(--o2)">${cur.heard ? esc(cur.heard) : 'Đang nghe…'}</div>` : ''}
        ${cur.result ? `<div style="margin-top:14px;font-weight:600;color:${cur.result.ok ? '#16a34a' : '#d97706'}">${cur.result.ok ? '✓' : '•'} ${esc(cur.result.msg)}</div>` : ''}`
    } else if (mode === 'fill') {
      const ok = cur.checked && norm(cur.typed || '') === norm(it.answer)
      const blanked = esc(it.line.text).replace(esc(it.answer), `<span style="display:inline-block;min-width:90px;border-bottom:2px solid var(--o);color:var(--o2);text-align:center">${cur.checked ? esc(it.answer) : '&nbsp;'}</span>`)
      card.innerHTML = `
        ${head('✏️ Điền từ còn thiếu')}
        <div style="display:flex;align-items:flex-start;gap:14px">
          <button onclick="eePlayLine()" title="Nghe câu" style="width:44px;height:44px;border-radius:50%;border:none;background:var(--o-soft);color:var(--o2);font-size:18px;cursor:pointer;flex-shrink:0">🔊</button>
          <div style="font-size:20px;line-height:1.8">${blanked}</div>
        </div>
        ${it.line.vi ? `<div class="ee-muted" style="margin:10px 0 0 58px;font-size:13px;font-style:italic">${esc(it.line.vi)}</div>` : ''}
        <div style="display:flex;gap:10px;margin-top:26px">
          <input id="ee-ftext" value="${esc(cur.typed || '')}" ${cur.checked ? 'disabled' : ''} placeholder="Nhập từ còn thiếu…" autocomplete="off"
            onkeydown="if(event.key==='Enter')eeCheck()"
            style="flex:1;border:1px solid var(--line);border-radius:10px;padding:12px 14px;font:inherit;font-size:15px;outline-color:#93c5fd">
          ${cur.checked ? '' : `<button class="ee-btn" onclick="eeCheck()">Kiểm tra</button>`}
        </div>
        ${cur.checked ? `<div style="margin-top:14px;font-weight:600;color:${ok ? '#16a34a' : '#dc2626'}">${ok ? '✓ Chính xác!' : `✗ Đáp án đúng: ${esc(it.answer)}`}</div>` : ''}`
      if (!cur.checked) setTimeout(() => $('ee-ftext')?.focus(), 0)
    } else {
      card.innerHTML = `
        ${head('🔤 Chọn nghĩa đúng')}
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:6px">
          <button onclick="eeSayMc()" style="width:44px;height:44px;border-radius:50%;border:none;background:var(--o-soft);color:var(--o2);font-size:18px;cursor:pointer">🔊</button>
          <div><div class="ee-h" style="font-size:28px">${esc(it.v.word)}</div><div class="ee-muted" style="font-size:14px">${esc(it.v.ipa)}</div></div>
        </div>
        <div class="ee-grid" style="grid-template-columns:1fr 1fr;gap:10px;margin-top:22px">
          ${it.options.map((o, i) => {
            const picked = cur.picked === i, right = o === it.v.vi
            const st = cur.picked == null ? 'background:#fff;border-color:var(--line)'
              : right ? 'background:#dcfce7;border-color:#86efac' : picked ? 'background:#fee2e2;border-color:#fca5a5' : 'background:#fff;border-color:var(--line);opacity:.6'
            return `<button onclick="eePick(${i})" ${cur.picked != null ? 'disabled' : ''} style="text-align:left;padding:14px;border-radius:12px;border:1px solid;cursor:pointer;font:inherit;font-size:14px;${st}">${esc(o)}</button>`
          }).join('')}
        </div>`
    }

    nav.innerHTML = `
      <button class="ee-btn ghost" onclick="eeSkipQ()">Bỏ qua</button>
      <button class="ee-btn" onclick="eeNext()" ${answered ? '' : 'disabled'}>${idx === items.length - 1 ? 'Xem kết quả' : 'Câu tiếp →'}</button>`
  }

  function renderSummary() {
    stopListening()
    markActivity(slug, 'practice')
    const scored = results.filter(r => r != null)
    const avg = scored.length ? Math.round(scored.reduce((a, b) => a + b, 0) / items.length) : 0
    $('ee-pcard').innerHTML = `
      <div style="text-align:center;padding:20px 0">
        <div style="font-size:44px">${avg >= 70 ? '🎉' : avg >= 40 ? '💪' : '🌱'}</div>
        <div class="ee-h" style="font-size:24px;margin:8px 0">Hoàn thành lượt luyện tập!</div>
        <div style="font-size:40px;font-weight:700;color:${scoreColor(avg)}">${avg}%</div>
        <div class="ee-muted" style="margin-top:4px">${scored.length}/${items.length} câu đã trả lời</div>
      </div>`
    $('ee-pnav').innerHTML = `
      <button class="ee-btn ghost" onclick="navigate('${BASE}/lesson/${encodeURIComponent(slug)}')">← Về bài học</button>
      <button class="ee-btn" onclick="eeRestart()">Luyện lại</button>`
  }

  // Pattern mode: retries allowed, the last attempt counts
  function checkOwnSentence(text) {
    cur.typed  = text
    cur.result = checkPattern(items[idx], text)
    results[idx] = cur.result.ok ? 100 : 0
  }

  const advance = () => { stopListening(); stopSegment(); idx++; cur = {}; renderItem() }

  Object.assign(window, {
    eePLesson: v => { slug = v; restart() },
    eePMode:   m => { mode = m; restart() },
    eeRestart: () => restart(),
    eeSkipQ:   () => { results[idx] = results[idx] ?? null; advance() },
    eeNext:    () => advance(),
    eePlayQ:   () => { const it = items[idx]; playSegment(it.audio, it.q.t, it.qEnd, it.q.text) },
    eePlayA:   () => { const it = items[idx]; playSegment(it.audio, it.a.t, it.aEnd, it.a.text) },
    eeHint:    () => { cur.revealed = true; if (results[idx] == null) results[idx] = 0; renderItem(); window.eePlayA() },
    eeMic:     () => cur.listening ? stopListening() : startListening(),
    eePlayLine:() => { const it = items[idx]; playSegment(lesson().main_audio, it.line.t, it.end, it.line.text) },
    eeCheck:   () => { const it = items[idx]; cur.typed = $('ee-ftext').value; if (!cur.typed.trim()) return
                       cur.checked = true; results[idx] = norm(cur.typed) === norm(it.answer) ? 100 : 0; renderItem(); window.eePlayLine() },
    eeSayMc:   () => speak(items[idx].v.word, 0.8),
    eeSayPat:  () => speak(items[idx].example, 0.85),
    eePatSubmit: () => { const v = $('ee-ptext')?.value.trim(); if (v) { checkOwnSentence(v); renderItem() } else $('ee-ptext')?.focus() },
    eePick:    i => { cur.picked = i; results[idx] = items[idx].options[i] === items[idx].v.vi ? 100 : 0; renderItem() },
  })
  onLeave(() => { stopListening(); stopSegment() })

  items = buildItems()
  render()
  if (mode === 'listen' && items.length) setTimeout(() => window.eePlayQ(), 300)
}
