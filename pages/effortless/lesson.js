import { BASE, ACTIVITIES, audioUrl, mainLines, msLines, msParts, vocabItems, exampleFor, getState, update,
         markActivity, setCompleted, lessonProgress, addTime, getSetting, setSetting,
         phraseItems, patternItems, checkPattern, lineForPhrase, qaItems,
         ROUTINE, getRoutine, setRoutineStep, pendingSeconds,
         addPlay, plays, listenStage, LISTEN_PLAN } from './store.js'
import { shell, esc, fmt, art, levelLabel, speak, matchScore, scoreColor, getSR, playSegment, stopSegment } from './ui.js'

const WAIT_OPTIONS = [0, 5, 10, 15]
const SPEEDS = [0.75, 1, 1.25, 1.5]
const PLAYER_TEXT = {
  main:  ['Main Audio', 'Nghe trước, hiểu ý chính của câu chuyện.'],
  ms:    ['Mini-Story', 'Nghe câu hỏi và trả lời to thành tiếng.'],
  vocab: ['Vocabulary', 'Nghe giải thích các từ mới trong bài.'],
  phrases:  ['Main Audio', 'Nghe lại câu chuyện để bắt các cụm từ hay.'],
  patterns: ['Main Audio', 'Nghe mẫu câu, rồi tự đặt câu của riêng bạn.'],
  qa:       ['Main Audio', 'Nghe câu chuyện, rồi tự trả lời các câu hỏi.'],
}
const TABS = [['main', '📄 Transcript'], ['ms', '❓ Mini-Story'], ['vocab', '🔤 Từ vựng'], ['phrases', '💬 Cụm từ'], ['patterns', '🗣 Mẫu câu'], ['qa', '🙋 Hỏi đáp']]
const AUDIO_FOR = { main: 'main_audio', ms: 'ms_audio', vocab: 'vocab_audio', phrases: 'main_audio', patterns: 'main_audio', qa: 'main_audio' }
const AUDIO_ACT = { main: 'main', ms: 'ms', phrases: 'main', patterns: 'main', qa: 'main' }   // activity completed by listening to the end

export default function lessonView({ app, lessons, params, onLeave }, slug) {
  const lesson = lessons.find(l => l.slug === slug)
  if (!lesson) {
    shell(app, '/lessons', `<div class="ee-card">Không tìm thấy bài học. <span class="ee-link" onclick="navigate('${BASE}/lessons')">Xem danh sách bài →</span></div>`)
    return
  }
  update(s => { s.last = slug })

  let tab       = AUDIO_FOR[params?.get('tab')] ? params.get('tab') : 'main'   // main | ms | vocab | phrases | patterns
  let showVI    = getSetting('showVI', true)
  let showIPA   = getSetting('showIPA', false)
  let waitSec   = getSetting('waitSec', 5)
  if (!WAIT_OPTIONS.includes(waitSec)) waitSec = 5
  let useMic    = getSetting('useMic', true)
  let speed     = getSetting('speed', 1)
  let hideAns   = false
  let hideText  = false                           // main transcript blurred (first listens: ears only)
  let passHeard = 0, lastT = 0                    // audio seconds actually played in this pass (seeks don't count)
  let revealed  = new Set()
  let activeIdx = -1
  let handledQ  = -1                              // question index we already paused after
  let wait      = null                            // { q, left, total, heard, timer, rec, started }
  let fbTimer   = null
  let loopId    = null
  let lastFrame = null
  let pendingListen = 0
  let audioOk   = true
  let pendingSeek = null
  let audioDone = false                           // current tab's audio activity already recorded
  const parts   = msParts(lesson)
  let msPart    = Math.min(parts.length - 1, Math.max(0, parts.findIndex(p => p.label === params?.get('part'))))

  const lines = () => tab === 'main' ? mainLines(lesson) : tab === 'ms' ? msLines(lesson, msPart) : []
  const srcFor = t => audioUrl(t === 'ms' ? parts[msPart].audio : lesson[AUDIO_FOR[t]])
  let patState = {}                               // per pattern index: { text, heard, listening, result }
  let patRec   = null
  let qaState  = {}                               // per Q&A index: { text, heard, listening, score, shown }
  let qaShowAll = false
  const $ = id => document.getElementById(id)

  // ── Page ───────────────────────────────────────────────────────────────────
  function render() {
    cancelWait()
    stopPatRec()
    stopSegment()
    flushListen()
    cancelAnimationFrame(loopId)
    activeIdx = -1; handledQ = -1; audioOk = true; passHeard = 0; lastT = 0
    speechSynthesis.cancel()
    const p   = lessonProgress(slug)
    const url = srcFor(tab)
    const [pTitle, pSub] = PLAYER_TEXT[tab]

    shell(app, '/lessons', `
      <div id="ee-routine">${routineBanner()}</div>
      <div style="font-size:13px;color:var(--ink2);cursor:pointer;margin-bottom:10px" onclick="navigate('${BASE}/lessons')">‹ Quay lại danh sách bài</div>
      <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap;margin-bottom:18px">
        <div>
          <div style="font-size:13px;font-weight:600;color:var(--o2)">${esc(lesson.course)} · ${levelLabel(lesson.level)}</div>
          <div class="ee-h" style="font-size:28px;margin:4px 0 6px">Bài ${lesson.lesson_no} – ${esc(lesson.title)}</div>
          <div class="ee-muted" style="font-size:13px">🔊 Main Audio + Mini-Story &nbsp;•&nbsp; 📖 ${(lesson.vocab || []).length} từ vựng &nbsp;•&nbsp; ✅ ${p.total} hoạt động</div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;min-width:220px">
          <span style="font-size:13px;font-weight:600" id="ee-prog-label">${p.done}/${p.total}</span>
          <div class="ee-bar" style="flex:1"><div id="ee-prog-bar" style="width:${p.done / p.total * 100}%"></div></div>
        </div>
      </div>

      <div class="ee-grid" style="grid-template-columns:minmax(0,2.3fr) minmax(240px,1fr);align-items:start">
        <div class="ee-grid" style="grid-template-columns:minmax(0,1fr)">
          <!-- Player -->
          <div style="position:relative;border-radius:18px;overflow:hidden;color:#fff;padding:22px 26px 18px">
            ${art(lesson, { id: 'player', w: 1400 })}
            <div style="position:absolute;inset:0;background:rgba(15,23,42,.45)"></div>
            <div style="position:relative;text-align:center">
              <div style="font-size:17px;font-weight:700">${pTitle}${tab === 'ms' && parts[msPart].label ? ` ${esc(parts[msPart].label)}` : ''}</div>
              <div style="font-size:13px;opacity:.85">${pSub}</div>
              ${url ? `<audio id="ee-audio" src="${esc(url)}" preload="metadata"></audio>` : ''}
              <div style="display:flex;align-items:center;justify-content:center;gap:28px;margin:22px 0 18px">
                <button onclick="eeSkip(-10)" title="Lùi 10 giây" style="${roundBtn(42)}">↺<span style="font-size:9px">10</span></button>
                <button id="ee-pp" onclick="eeToggle()" style="${roundBtn(68, true)}">▶</button>
                <button onclick="eeSkip(10)" title="Tới 10 giây" style="${roundBtn(42)}">↻<span style="font-size:9px">10</span></button>
              </div>
              <div style="display:flex;align-items:center;gap:12px;font-size:12px;font-variant-numeric:tabular-nums">
                <span id="ee-cur">00:00</span>
                <input id="ee-seek" type="range" min="0" max="100" step="0.1" value="0" style="flex:1;accent-color:#2563eb">
                <span id="ee-dur">--:--</span>
              </div>
              <div id="ee-speeds" style="display:flex;gap:8px;justify-content:center;margin-top:12px">${buildSpeeds()}</div>
              <div id="ee-audio-note" style="display:${url ? 'none' : 'block'};margin-top:12px;font-size:12px;background:rgba(254,243,199,.95);color:#92400e;border-radius:8px;padding:8px">
                Chưa có file audio cho phần này. Bấm vào từng câu để nghe giọng đọc máy.</div>
            </div>
          </div>

          <!-- Content panel -->
          <div class="ee-card" style="padding:14px">
            <div style="display:flex;gap:8px;flex-wrap:wrap;border-bottom:1px solid var(--line);padding-bottom:12px">
              ${TABS.map(([k, l]) =>
                `<button class="ee-pill ${tab === k ? 'on' : ''}" onclick="eeTab('${k}')">${l}</button>`).join('')}
            </div>
            <div id="ee-tools" style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;padding:12px 4px 4px">${buildTools()}</div>
            <div id="ee-list" style="margin-top:6px">${buildList()}</div>
          </div>
        </div>

        <!-- Right column -->
        <div class="ee-grid" style="grid-template-columns:minmax(0,1fr)">
          <div class="ee-card" style="padding:16px" id="ee-listens">${buildListens()}</div>
          <div class="ee-card" style="padding:16px">
            <div class="ee-h" style="font-size:15px;margin-bottom:10px">Công cụ bài học</div>
            ${toolRow('📄', '#dbeafe', 'Transcript', 'Đọc và nghe theo', `eeTab('main')`)}
            ${toolRow('🔤', '#dbeafe', 'Từ vựng', 'Học từ mới', `eeTab('vocab')`)}
            ${toolRow('💬', '#e0f2fe', 'Cụm từ hay', 'Cụm từ dùng trong bài', `eeTab('phrases')`)}
            ${toolRow('🗣', '#fce7f3', 'Mẫu câu', 'Tự đặt câu & luyện nói', `eeTab('patterns')`)}
            ${toolRow('🙋', '#fef9c3', 'Hỏi đáp', 'Tự trả lời câu hỏi về bài', `eeTab('qa')`)}
            ${toolRow('❓', '#dcfce7', 'Mini-Story', 'Luyện phản xạ nói', `eeTab('ms')`)}
            ${toolRow('🎯', '#fef3c7', 'Luyện tập', 'Nghe & trả lời, điền từ…', `navigate('${BASE}/practice?lesson=${encodeURIComponent(slug)}')`)}
            ${toolRow('📝', '#ede9fe', 'Ghi chú', 'Ghi chú của bạn', `document.getElementById('ee-note-text').focus()`)}
          </div>

          <div class="ee-card" style="padding:16px">
            <div class="ee-h" style="font-size:15px;margin-bottom:10px">Tiến độ bài</div>
            <div id="ee-acts">${buildActivities()}</div>
          </div>

          <div class="ee-card" style="padding:16px">
            <div class="ee-h" style="font-size:15px;margin-bottom:8px">Thao tác nhanh</div>
            <div id="ee-complete">${completeRow()}</div>
            <div class="ee-line" onclick="eeNoteCurrent()" style="align-items:center"><span>🔖</span><span style="font-size:13px">Lưu câu đang nghe vào ghi chú</span></div>
            ${url ? `<a class="ee-line" href="${esc(url)}" target="_blank" rel="noopener" download style="align-items:center;text-decoration:none;color:inherit"><span>⬇️</span><span style="font-size:13px">Tải audio phần này</span></a>` : ''}
          </div>

          <div class="ee-card" style="padding:16px">
            <div class="ee-h" style="font-size:15px;margin-bottom:8px">Ghi chú</div>
            <textarea id="ee-note-text" rows="3" placeholder="Viết ghi chú cho bài này…"
              style="width:100%;border:1px solid var(--line);border-radius:10px;padding:10px;font:inherit;font-size:13px;resize:vertical;outline-color:#93c5fd"></textarea>
            <button class="ee-btn" style="width:100%;margin-top:8px;padding:8px" onclick="eeAddNote()">Lưu ghi chú</button>
            <div id="ee-notes" style="margin-top:10px">${buildNotes()}</div>
          </div>
        </div>
      </div>

      <div id="ee-wait" style="display:none;position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:50;
        width:min(560px, calc(100% - 32px));background:#fff;border:1px solid #bfdbfe;border-radius:16px;padding:16px;
        box-shadow:0 12px 32px rgba(15,23,42,.18)"></div>`)

    audioDone = !AUDIO_ACT[tab] || !!getState().lessons[slug]?.done?.[AUDIO_ACT[tab]]
    if (['vocab', 'phrases', 'patterns'].includes(tab)) {
      markActivity(slug, 'vocab')
      if (tab !== 'vocab') markActivity(slug, 'patterns')     // "Review" step on the overview path; not a counted activity
      refreshProgress()
    }
    bindAudio()
  }

  // ── Today's 45-minute routine (from the "Cách học" page) ──────────────────
  function routineBanner() {
    const r = getRoutine()
    if (!r || r.slug !== slug || r.step >= ROUTINE.length) return ''
    const st = ROUTINE[r.step], goal = st.min * 60
    const spent = Math.min(goal, r.spent[r.step] + pendingSeconds()), ok = spent >= goal
    const last = r.step === ROUTINE.length - 1
    return `
      <div data-ok="${ok}" data-step="${r.step}" style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding:12px 16px;margin-bottom:14px;border-radius:14px;
        border:1px solid ${ok ? '#86efac' : '#bfdbfe'};background:${ok ? '#f0fdf4' : '#eff6ff'}">
        <span style="font-size:22px">${st.icon}</span>
        <div style="flex:1;min-width:200px">
          <div style="font-size:12px;font-weight:700;color:var(--o2)">LỘ TRÌNH HÔM NAY · BƯỚC ${r.step + 1}/${ROUTINE.length}</div>
          <div style="font-size:14px;font-weight:600">${st.title} <span style="font-weight:400;color:var(--ink2)">— ${st.desc}</span></div>
          <div style="display:flex;align-items:center;gap:10px;margin-top:6px">
            <div class="ee-bar" style="flex:1"><div id="ee-rt-bar" style="width:${spent / goal * 100}%;${ok ? 'background:#16a34a' : ''}"></div></div>
            <span id="ee-rt-time" style="font-size:12px;font-variant-numeric:tabular-nums;color:var(--ink2)">${fmt(spent)} / ${fmt(goal)}</span>
          </div>
        </div>
        <span class="ee-link" onclick="navigate('${BASE}/guide')">Lộ trình</span>
        <button class="ee-btn ${ok ? '' : 'ghost'}" style="padding:8px 16px" onclick="eeRoutineNext()">
          ${ok ? '✓ ' : ''}${last ? 'Hoàn thành' : 'Bước tiếp theo'} →</button>
      </div>`
  }

  function buildSpeeds() {
    return SPEEDS.map(s => `<button onclick="eeSpeed(${s})" style="padding:5px 14px;border-radius:8px;border:none;cursor:pointer;font-size:12px;font-weight:600;
      background:${s === speed ? '#2563eb' : 'rgba(255,255,255,.85)'};color:${s === speed ? '#fff' : '#1e293b'}">${s}×</button>`).join('')
  }

  function roundBtn(size, primary) {
    return `width:${size}px;height:${size}px;border-radius:50%;border:${primary ? 'none' : '2px solid rgba(255,255,255,.8)'};cursor:pointer;
      background:${primary ? '#2563eb' : 'transparent'};color:#fff;font-size:${primary ? 26 : 16}px;display:inline-flex;align-items:center;justify-content:center;
      ${primary ? 'box-shadow:0 0 0 8px rgba(37,99,235,.25)' : ''}`
  }

  function toolRow(icon, bg, title, sub, onclick) {
    return `<div class="ee-line" onclick="${onclick}" style="align-items:center">
      <div style="width:36px;height:36px;border-radius:10px;background:${bg};display:flex;align-items:center;justify-content:center">${icon}</div>
      <div><div style="font-size:14px;font-weight:600">${title}</div><div class="ee-muted">${sub}</div></div></div>`
  }

  // ── Listen counter + suggested schedule ───────────────────────────────────
  function buildListens() {
    const n = plays(slug, 'main'), ms = plays(slug, 'ms'), st = listenStage(n)
    const dots = Array.from({ length: 10 }, (_, i) => `<span style="flex:1;height:8px;border-radius:4px;background:${i < n ? 'var(--o)' : '#e2e8f0'}"></span>`).join('')
    return `
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div class="ee-h" style="font-size:15px">🎧 Số lần nghe</div>
        <span class="ee-link" style="font-size:12px" onclick="navigate('${BASE}/guide#listen-plan')">Lịch nghe gợi ý</span>
      </div>
      <div style="display:flex;align-items:baseline;gap:8px;margin:10px 0 8px">
        <span class="ee-h" style="font-size:30px;color:var(--o2)">${n}</span><span class="ee-muted">lần Main Audio</span>
        <span class="ee-muted" style="margin-left:auto">Mini-Story: <b style="color:var(--ink)">${ms}</b> lần</span>
      </div>
      <div style="display:flex;gap:3px" title="Mục tiêu 10 lần">${dots}</div>
      <div style="margin-top:12px;padding:10px 12px;border-radius:10px;background:var(--o-soft);font-size:13px;line-height:1.5">
        <div style="font-weight:700;color:var(--o2)">${st.icon} Lần nghe tiếp theo: ${n + 1} · ${st.label}</div>
        <div style="color:var(--ink2);margin-top:2px">${st.text}</div>
        ${st === LISTEN_PLAN[0] && tab === 'main' ? `<span class="ee-link" style="font-size:12px" onclick="eeToggleText()">${hideText ? '👁 Hiện transcript' : '🙈 Ẩn transcript khi nghe'}</span>` : ''}
        ${st === LISTEN_PLAN[3] && tab !== 'ms' ? `<span class="ee-link" style="font-size:12px" onclick="eeTab('ms')">❓ Luyện Mini-Story →</span>` : ''}
      </div>`
  }

  function buildActivities() {
    const done = getState().lessons[slug]?.done || {}
    return ACTIVITIES.map(([a, label]) => `
      <div style="display:flex;align-items:center;gap:10px;padding:6px 4px;font-size:13px">
        <span style="width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;
          background:${done[a] ? '#16a34a' : '#f1f5f9'};color:${done[a] ? '#fff' : 'var(--mute)'}">${done[a] ? '✓' : ''}</span>
        <span style="color:${done[a] ? 'var(--ink)' : 'var(--ink2)'}">${label}</span>
      </div>`).join('')
  }

  function completeRow() {
    const { completed } = lessonProgress(slug)
    return `<div class="ee-line" onclick="eeComplete()" style="align-items:center">
      <span style="color:${completed ? '#16a34a' : 'var(--mute)'}">${completed ? '✅' : '⬜'}</span>
      <span style="font-size:13px">${completed ? 'Đã hoàn thành (bấm để bỏ)' : 'Đánh dấu hoàn thành'}</span></div>`
  }

  function refreshProgress() {
    const p = lessonProgress(slug)
    if ($('ee-prog-label')) $('ee-prog-label').textContent = `${p.done}/${p.total}`
    if ($('ee-prog-bar'))   $('ee-prog-bar').style.width = `${p.done / p.total * 100}%`
    if ($('ee-acts'))       $('ee-acts').innerHTML = buildActivities()
    if ($('ee-complete'))   $('ee-complete').innerHTML = completeRow()
  }

  // ── Panel ──────────────────────────────────────────────────────────────────
  function buildTools() {
    const btn = (on, call, label) => `<button class="ee-pill ${on ? 'on' : ''}" style="padding:5px 12px;font-size:12px" onclick="${call}">${label}</button>`
    if (tab === 'main')  return btn(showVI, 'eeToggleVI()', 'Dịch tiếng Việt') + (lesson.main_story?.[0]?.[3] ? btn(showIPA, 'eeToggleIPA()', '/ə/ IPA') : '') + btn(hideText, 'eeToggleText()', '🙈 Ẩn transcript')
    if (tab === 'vocab') return `<span class="ee-muted">Bấm vào từ để nghe phát âm • ☆ để lưu vào danh sách của bạn</span>`
    if (tab === 'phrases') return `<span class="ee-muted">Bấm vào cụm từ để nghe • “Nghe trong bài” phát đúng câu có cụm từ đó</span>`
    if (tab === 'qa') return `<span class="ee-muted">Nghe câu hỏi, tự trả lời (nói hoặc gõ) rồi so với đáp án mẫu</span>
      <span style="flex:1"></span>${btn(qaShowAll, 'eeQAAll()', '👁 Hiện tất cả đáp án')}`
    if (tab === 'patterns') return `<span class="ee-muted">Nghe câu mẫu, rồi nói hoặc gõ một câu <b>của riêng bạn</b> dùng cấu trúc đó</span>`
    return `
      ${parts.length > 1 ? `
        <span style="font-size:12px;color:var(--ink2);font-weight:600">Phần:</span>
        ${parts.map((p, i) => btn(msPart === i, `eeMsPart(${i})`, `Mini-Story ${esc(p.label)}`)).join('')}
        <span style="width:100%"></span>` : ''}
      <span style="font-size:12px;color:var(--ink2);font-weight:600">⏸ Dừng sau câu hỏi:</span>
      ${WAIT_OPTIONS.map(s => btn(waitSec === s, `eeWaitSec(${s})`, s ? `${s}s` : 'Tắt')).join('')}
      <span style="width:1px;height:18px;background:var(--line);margin:0 4px"></span>
      ${getSR() ? btn(useMic, 'eeToggleMic()', '🎤 Ghi âm câu trả lời') : ''}
      ${btn(hideAns, 'eeToggleHide()', '🙈 Ẩn đáp án')}
      ${waitSec ? `<div class="ee-muted" style="width:100%;margin-top:2px">Audio tự dừng ${waitSec}s sau mỗi câu hỏi để bạn trả lời to, rồi mới phát câu trả lời mẫu.</div>` : ''}`
  }

  function buildList() {
    if (tab === 'qa') {
      const items = qaItems(lesson)
      if (!items.length) return `<div class="ee-muted" style="padding:16px">Bài này chưa có câu hỏi đáp.</div>`
      const own = !!lesson.qa?.length
      return (own ? '' : `<div class="ee-muted" style="padding:6px 4px 2px">Các câu hỏi được lấy từ Mini-Story của bài.</div>`) + items.map((it, i) => {
        const st = qaState[i] || {}
        const show = qaShowAll || st.shown
        return `
          <div style="border:1px solid var(--line);border-radius:14px;padding:14px 16px;margin:10px 4px">
            <div style="display:flex;gap:10px;align-items:flex-start">
              <span style="font-size:11px;font-weight:700;color:var(--o2);background:var(--o-soft);border-radius:6px;padding:3px 8px;margin-top:2px">Q${i + 1}</span>
              <div style="flex:1;font-size:15px;font-weight:600;line-height:1.5">${esc(it.q)}</div>
              <button onclick="eeQASay(${i})" title="${it.qSeg ? 'Nghe câu hỏi (giọng thật trong Mini-Story)' : 'Nghe câu hỏi (giọng đọc máy)'}" class="ee-play-dot" style="border:none;cursor:pointer;width:30px;height:30px;font-size:13px">${it.qSeg ? '🎧' : '🔊'}</button>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
              ${getSR() ? `<button onclick="eeQAMic(${i})" title="Trả lời bằng giọng nói" style="width:38px;height:38px;border-radius:50%;border:none;cursor:pointer;color:#fff;font-size:15px;
                background:${st.listening ? '#dc2626' : 'var(--o)'}">${st.listening ? '■' : '🎤'}</button>` : ''}
              <input id="ee-qa-${i}" value="${esc(st.text || '')}" placeholder="${getSR() ? '…hoặc gõ câu trả lời' : 'Gõ câu trả lời'}" autocomplete="off"
                onkeydown="if(event.key==='Enter')eeQACheck(${i})"
                style="flex:1;min-width:160px;border:1px solid var(--line);border-radius:10px;padding:8px 12px;font:inherit;font-size:14px;outline-color:#93c5fd">
              <button class="ee-btn" style="padding:8px 14px" onclick="eeQACheck(${i})">Kiểm tra</button>
            </div>
            ${st.listening ? `<div style="font-size:13px;margin-top:8px;color:var(--o2)">${st.heard ? esc(st.heard) : 'Đang nghe…'}</div>` : ''}
            <div style="display:flex;align-items:center;gap:10px;margin-top:10px;font-size:14px">
              ${st.score != null ? `<span style="font-weight:700;color:${scoreColor(st.score)}">${st.score}%</span>` : ''}
              ${show ? `<span><span class="ee-muted">Đáp án:</span> <b>${esc(it.a)}</b></span>
                <span class="ee-link" style="font-size:12px" title="${it.aSeg ? 'Giọng thật trong Mini-Story' : 'Giọng đọc máy'}" onclick="eeQASayA(${i})">${it.aSeg ? '🎧' : '🔊'}</span>`
                : `<span class="ee-link" style="font-size:13px" onclick="eeQAShow(${i})">Xem đáp án</span>`}
            </div>
          </div>`
      }).join('')
    }
    if (tab === 'phrases') {
      const saved = new Set(getState().saved)
      const items = phraseItems(lesson)
      if (!items.length) return `<div class="ee-muted" style="padding:16px">Bài này chưa có cụm từ.</div>`
      return items.map((p, i) => {
        const line = lineForPhrase(lesson, p.en)
        return `
          <div class="ee-line" style="align-items:center" onclick="eeSayPhrase(${i})">
            <span class="ee-play-dot">🔊</span>
            <div style="flex:1;min-width:0">
              <div style="font-size:15px;font-weight:600">${esc(p.en)}</div>
              ${p.ipa ? `<div style="font-size:13px;color:var(--mute);font-family:'Lucida Sans Unicode','Segoe UI',sans-serif">${esc(p.ipa)}</div>` : ''}
              <div style="font-size:13px;color:var(--ink2)">${esc(p.vi)}</div>
              ${line ? `<div style="font-size:12px;color:var(--mute);margin-top:2px"><i>“${esc(line.text)}”</i>
                <span class="ee-link" style="font-size:12px;margin-left:6px" onclick="event.stopPropagation();eePhraseCtx(${i})">▶ Nghe trong bài (${fmt(line.t)})</span></div>` : ''}
            </div>
            <button onclick="event.stopPropagation();eeSavePhrase(${i})" title="Lưu cụm từ" style="border:none;background:none;cursor:pointer;font-size:18px;color:${saved.has(p.en) ? 'var(--o)' : 'var(--mute)'}">${saved.has(p.en) ? '★' : '☆'}</button>
          </div>`
      }).join('')
    }
    if (tab === 'patterns') {
      const items = patternItems(lesson)
      if (!items.length) return `<div class="ee-muted" style="padding:16px">Bài này chưa có mẫu câu.</div>`
      return items.map((p, i) => {
        const st = patState[i] || {}
        return `
          <div style="border:1px solid var(--line);border-radius:14px;padding:16px;margin:10px 4px">
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
              <span class="ee-muted" style="font-weight:700">${i + 1}</span>
              <span style="background:var(--o-soft);color:var(--o2);font-weight:700;padding:6px 12px;border-radius:8px;font-size:15px">${esc(p.structure)}</span>
            </div>
            <div style="display:flex;gap:10px;align-items:center;margin-top:12px">
              <button onclick="eeSayPattern(${i})" title="Nghe câu mẫu" class="ee-play-dot" style="border:none;cursor:pointer;width:30px;height:30px;font-size:13px">🔊</button>
              <div><div style="font-size:15px">${esc(p.example)}</div>${p.ipa ? `<div style="font-size:13px;color:var(--mute);font-family:'Lucida Sans Unicode','Segoe UI',sans-serif">${esc(p.ipa)}</div>` : ''}<div class="ee-muted" style="font-size:13px">${esc(p.vi)}</div></div>
            </div>
            <div style="margin-top:14px;border-top:1px dashed var(--line);padding-top:12px">
              <div style="font-size:12px;font-weight:600;color:var(--ink2);margin-bottom:8px">Đến lượt bạn: đặt một câu khác với “${esc(p.key)}”</div>
              <div style="display:flex;gap:8px;flex-wrap:wrap">
                ${getSR() ? `<button onclick="eePatMic(${i})" title="Nói câu của bạn" style="width:40px;height:40px;border-radius:50%;border:none;cursor:pointer;color:#fff;font-size:16px;
                  background:${st.listening ? '#dc2626' : 'var(--o)'}">${st.listening ? '■' : '🎤'}</button>` : ''}
                <input id="ee-pat-${i}" value="${esc(st.text || '')}" placeholder="${getSR() ? '…hoặc gõ câu của bạn' : 'Gõ câu của bạn'}" autocomplete="off"
                  onkeydown="if(event.key==='Enter')eePatCheck(${i})"
                  style="flex:1;min-width:180px;border:1px solid var(--line);border-radius:10px;padding:9px 12px;font:inherit;font-size:14px;outline-color:#93c5fd">
                <button class="ee-btn" style="padding:8px 16px" onclick="eePatCheck(${i})">Kiểm tra</button>
              </div>
              ${st.listening ? `<div style="font-size:13px;margin-top:8px;color:var(--o2)">${st.heard ? esc(st.heard) : 'Đang nghe…'}</div>` : ''}
              ${st.result ? `<div style="font-size:13px;margin-top:8px;font-weight:600;color:${st.result.ok ? '#16a34a' : '#d97706'}">${st.result.ok ? '✓' : '•'} ${esc(st.result.msg)}</div>` : ''}
            </div>
          </div>`
      }).join('')
    }
    if (tab === 'vocab') {
      const saved = new Set(getState().saved)
      return vocabItems(lesson).map((v, i) => `
        <div class="ee-line" style="align-items:center" onclick="eeSayWord(${i})">
          <span class="ee-play-dot">🔊</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:15px;font-weight:600">${esc(v.word)} <span style="font-weight:400;color:var(--mute);font-size:13px;margin-left:6px">${esc(v.ipa)}</span></div>
            <div style="font-size:13px;color:var(--ink2)">${esc(v.vi)}</div>
            ${exampleFor(lesson, v.word) ? `<div style="font-size:12px;color:var(--mute);font-style:italic;margin-top:2px">“${esc(exampleFor(lesson, v.word))}”</div>` : ''}
          </div>
          <button onclick="event.stopPropagation();eeSave(${i})" title="Lưu từ" style="border:none;background:none;cursor:pointer;font-size:18px;color:${saved.has(v.word) ? 'var(--o)' : 'var(--mute)'}">${saved.has(v.word) ? '★' : '☆'}</button>
        </div>`).join('')
    }
    if (tab === 'main') {
      return lines().map((l, i) => `
        <div class="ee-line" data-ee-line="${i}" onclick="eePlay(${i})">
          <span class="ee-play-dot">▶</span>
          <span style="font-size:12px;color:var(--mute);min-width:40px;padding-top:2px;font-variant-numeric:tabular-nums">${fmt(l.t)}</span>
          <div>
            <div class="${hideText ? 'ee-hidden' : ''}" style="font-size:15px;line-height:1.6">${esc(l.text)}</div>
            ${showIPA && l.ipa ? `<div class="${hideText ? 'ee-hidden' : ''}" style="font-size:13px;color:var(--mute);font-family:'Lucida Sans Unicode','Segoe UI',sans-serif;line-height:1.5">${esc(l.ipa)}</div>` : ''}
            ${showVI && l.vi ? `<div class="${hideText ? 'ee-hidden' : ''}" style="font-size:13px;color:var(--o2);font-style:italic;line-height:1.5">${esc(l.vi)}</div>` : ''}
          </div>
        </div>`).join('')
    }
    if (!lines().length) return `<div class="ee-muted" style="padding:16px">Phần này chưa có transcript — bạn vẫn nghe audio và trả lời các câu hỏi bình thường.</div>`
    return lines().map((l, i) => msLineHTML(l, i)).join('')
  }

  function msLineHTML(l, i) {
    const [label, bg, fg] = { q: ['Hỏi', '#fef3c7', '#92400e'], a: ['Đáp', '#dcfce7', '#166534'], s: ['Kể', '#f1f5f9', '#64748b'] }[l.type] || ['Kể', '#f1f5f9', '#64748b']
    const hidden = hideAns && l.type === 'a' && !revealed.has(i)
    return `
      <div class="ee-line" data-ee-line="${i}" onclick="${hidden ? `eeReveal(${i})` : `eePlay(${i})`}">
        <span style="font-size:12px;color:var(--mute);min-width:40px;padding-top:3px;font-variant-numeric:tabular-nums">${fmt(l.t)}</span>
        <span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;margin-top:3px;background:${bg};color:${fg};min-width:34px;text-align:center">${label}</span>
        <div style="font-size:15px;line-height:1.6;font-weight:${l.type === 'q' ? 600 : 400}">
          <span class="${hidden ? 'ee-hidden' : ''}">${esc(l.text)}</span>
          ${hidden ? `<span style="font-size:11px;color:var(--o2);margin-left:8px">Bấm để xem đáp án</span>` : ''}
        </div>
      </div>`
  }

  // Refresh list + toolbar only, so the <audio> keeps playing
  function updatePanel() {
    if ($('ee-list'))  $('ee-list').innerHTML  = buildList()
    if ($('ee-tools')) $('ee-tools').innerHTML = buildTools()
    const idx = activeIdx
    activeIdx = -1
    setActive(idx, false)
  }

  function buildNotes() {
    const notes = getState().notes.filter(n => n.slug === slug).sort((a, b) => b.at - a.at)
    if (!notes.length) return `<div class="ee-muted">Chưa có ghi chú.</div>`
    return notes.map(n => `
      <div style="border-top:1px solid #f1f5f9;padding:8px 0;font-size:13px;display:flex;gap:8px">
        <div style="flex:1;min-width:0">
          ${n.t != null ? `<span class="ee-link" style="font-size:12px" onclick="eeGoNote('${n.id}')">${n.tab === 'ms' ? `Mini-Story${parts[n.part || 0]?.label ? ' ' + esc(parts[n.part || 0].label) : ''}` : 'Main'} ${fmt(n.t)}</span> ` : ''}
          <span style="white-space:pre-wrap">${esc(n.text)}</span>
        </div>
        <span onclick="eeDelNote('${n.id}')" style="cursor:pointer;color:var(--mute)" title="Xóa">✕</span>
      </div>`).join('')
  }

  // ── Audio ──────────────────────────────────────────────────────────────────
  function bindAudio() {
    const audio = $('ee-audio')
    const seek  = $('ee-seek')
    if (!audio) return
    audio.playbackRate = speed
    audio.onerror = () => { audioOk = false; if ($('ee-audio-note')) $('ee-audio-note').style.display = 'block' }
    audio.onloadedmetadata = () => {
      $('ee-dur').textContent = fmt(audio.duration)
      if (pendingSeek != null) { audio.currentTime = pendingSeek; pendingSeek = null }
    }
    audio.onplay  = () => {
      cancelWait()               // native play during the pause ends it
      $('ee-pp').textContent = '❚❚'
      lastFrame = performance.now()
      cancelAnimationFrame(loopId)
      const loop = now => {
        if (!document.contains(audio)) { audio.pause(); return }   // navigated away
        pendingListen += Math.min(1, (now - lastFrame) / 1000)
        lastFrame = now
        if (pendingListen >= 5) flushListen()
        tick(audio)
        loopId = requestAnimationFrame(loop)
      }
      loopId = requestAnimationFrame(loop)
    }
    audio.onpause = () => { cancelAnimationFrame(loopId); flushListen(); if ($('ee-pp')) $('ee-pp').textContent = '▶' }
    audio.onended = () => finishAudio()
    audio.onseeking = () => { if (!wait) handledQ = -1 }   // re-arm the pause after rewinding
    audio.ontimeupdate = () => tick(audio)
    seek.oninput = () => { if (audio.duration) audio.currentTime = seek.value / 100 * audio.duration }
  }

  function flushListen() {
    const sec = Math.floor(pendingListen)
    if (sec > 0) { addTime('listen', sec); pendingListen -= sec }
  }

  function countListen() {
    const kind = tab === 'ms' ? 'ms' : AUDIO_FOR[tab] === 'main_audio' ? 'main' : null
    if (!kind) return
    addPlay(slug, kind)
    if ($('ee-listens')) $('ee-listens').innerHTML = buildListens()
  }

  function finishAudio() {
    if (audioDone) return
    audioDone = true
    markActivity(slug, AUDIO_ACT[tab])
    refreshProgress()
  }

  function tick(audio) {
    const t = audio.currentTime
    if (audio.duration) {
      $('ee-cur').textContent = fmt(t)
      if (document.activeElement !== $('ee-seek')) $('ee-seek').value = t / audio.duration * 100
      if (!audioDone && t / audio.duration >= 0.9) finishAudio()
      // One listen = reached 90% after really playing ≥70% of the audio in this pass
      const step = t - lastT
      if (!audio.paused && step > 0 && step < 2) passHeard += step
      lastT = t
      if (t / audio.duration >= 0.9 && passHeard >= audio.duration * 0.7) { passHeard = 0; countListen() }
    }
    const ls = lines()
    let idx = -1
    for (let i = 0; i < ls.length; i++) { if (ls[i].t <= t) idx = i; else break }
    if (idx !== activeIdx) setActive(idx, true)
    const next = ls[idx + 1]
    if (tab === 'ms' && waitSec && !audio.paused && !wait && ls[idx]?.type === 'q'
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
    const line = lines()[idx]
    // Hidden-answer mode: reveal the model answer once the audio reaches it
    if (tab === 'ms' && hideAns && line?.type === 'a' && !revealed.has(idx)) {
      revealed.add(idx)
      el.outerHTML = msLineHTML(line, idx)
      el = document.querySelector(`[data-ee-line="${idx}"]`)
    }
    el.classList.add('ee-active')
    if (scroll) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }

  function playLine(i) {
    const line  = lines()[i]
    const audio = $('ee-audio')
    if (!line) return
    cancelWait()
    handledQ = -1
    setActive(i, false)
    if (audio && audioOk) {
      audio.currentTime = line.t
      audio.play().catch(() => speak(line.text))
    } else speak(line.text)
  }

  // ── Answer time (Mini-Story) ───────────────────────────────────────────────
  function startWait(q) {
    $('ee-audio')?.pause()
    clearTimeout(fbTimer)
    wait = { q, left: waitSec, total: waitSec, heard: '', started: Date.now() }
    wait.timer = setInterval(() => {
      if (!$('ee-wait')) return cancelWait()
      if (--wait.left <= 0) finishWait()
      else renderWait()
    }, 1000)
    if (useMic) startListening()
    renderWait()
  }

  function startListening() {
    const SR = getSR()
    if (!SR) return
    const w = wait
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
    addTime('speak', Math.round((Date.now() - wait.started) / 1000))
    wait = null
    renderWait()
  }

  function finishWait() {
    if (!wait) return
    const { q, heard } = wait
    cancelWait()
    const expected = lines().slice(q + 1).find(l => l.type !== 'q')
    if (heard && expected) showFeedback(heard, expected.text)
    $('ee-audio')?.play()
  }

  function renderWait() {
    const el = $('ee-wait')
    if (!el) return
    if (!wait) { el.style.display = 'none'; return }
    const q = lines()[wait.q]
    el.style.display = 'block'
    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:14px">
        <div style="width:54px;height:54px;border-radius:50%;background:var(--o);color:#fff;display:flex;align-items:center;justify-content:center;
          font-size:22px;font-weight:700;flex-shrink:0;box-shadow:0 0 0 6px #dbeafe">${wait.left}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:10px;font-weight:700;letter-spacing:.8px;color:var(--o2)">ĐẾN LƯỢT BẠN TRẢ LỜI ${useMic ? '🎤' : ''}</div>
          <div style="font-size:16px;font-weight:600;margin-top:2px">${esc(q?.text)}</div>
          ${useMic ? `<div style="font-size:13px;margin-top:4px;color:${wait.heard ? 'var(--o2)' : 'var(--mute)'}">${wait.heard ? esc(wait.heard) : 'Đang nghe… hãy nói câu trả lời của bạn'}</div>` : ''}
        </div>
      </div>
      <div class="ee-bar" style="margin:12px 0"><div style="width:${wait.left / wait.total * 100}%;transition:width 1s linear"></div></div>
      <div style="display:flex;gap:8px">
        <button class="ee-btn ghost" style="flex:1;padding:8px" onclick="eeReplayQ()">🔁 Nghe lại câu hỏi</button>
        <button class="ee-btn ghost" style="padding:8px 12px" onclick="eeMoreTime()">+5s</button>
        <button class="ee-btn" style="flex:1;padding:8px" onclick="eeContinue()">Tiếp tục ▶ <span style="opacity:.75;font-weight:400">(Space)</span></button>
      </div>`
  }

  function showFeedback(heard, expected) {
    const el = $('ee-wait')
    if (!el) return
    const score = matchScore(heard, expected)
    el.style.display = 'block'
    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:14px">
        <div style="width:54px;height:54px;border-radius:50%;border:3px solid ${scoreColor(score)};color:${scoreColor(score)};display:flex;align-items:center;
          justify-content:center;font-size:15px;font-weight:700;flex-shrink:0">${score}%</div>
        <div style="flex:1;min-width:0;font-size:13px;line-height:1.6">
          <div><span class="ee-muted">Bạn nói:</span> <span style="color:var(--o2)">${esc(heard)}</span></div>
          <div><span class="ee-muted">Câu mẫu:</span> <b>${esc(expected)}</b></div>
        </div>
      </div>`
    clearTimeout(fbTimer)
    fbTimer = setTimeout(() => { if (!wait && $('ee-wait')) $('ee-wait').style.display = 'none' }, 5000)
  }

  // ── Speaking patterns / Q&A: answer by voice ───────────────────────────────
  // states = patState or qaState; finish(text) returns the item's new state once speech is final
  function micListen(states, i, finish) {
    if (patRec) { const was = patRec; stopPatRec(); if (was.i === i && was.states === states) return }
    const SR = getSR()
    if (!SR) return
    $('ee-audio')?.pause()
    const rec = new SR()
    rec.lang = 'en-US'; rec.interimResults = true; rec.maxAlternatives = 1
    patRec = { i, rec, states, started: Date.now() }
    states[i] = { ...states[i], listening: true, heard: '' }
    rec.onresult = e => {
      let text = ''
      for (let k = 0; k < e.results.length; k++) text += e.results[k][0].transcript
      states[i].heard = text
      if (e.results[e.results.length - 1].isFinal) {
        states[i] = finish(text)
        stopPatRec()
      }
      updatePanel()
    }
    rec.onerror = () => { stopPatRec(); updatePanel() }
    rec.onend = () => { if (patRec?.rec === rec) { stopPatRec(); updatePanel() } }
    try { rec.start() } catch {}
    updatePanel()
  }

  // Q&A audio: the Mini-Story clip when the question/answer was matched to it, else speech synthesis
  function playQA(i, which) {
    const it = qaItems(lesson)[i], seg = which === 'q' ? it?.qSeg : it?.aSeg, text = which === 'q' ? it?.q : it?.a
    if (!it) return
    $('ee-audio')?.pause()
    if (seg) playSegment(seg.audio, seg.start, seg.end, text)
    else { stopSegment(); speak(text, 0.9) }
  }

  const patListen = i => micListen(patState, i, text => ({ text, result: checkPattern(patternItems(lesson)[i], text) }))
  const qaListen  = i => micListen(qaState, i, text => ({ text, score: matchScore(text, qaItems(lesson)[i].a), shown: true }))

  function stopPatRec() {
    if (!patRec) return
    try { patRec.rec.abort() } catch {}
    addTime('speak', Math.round((Date.now() - patRec.started) / 1000))
    if (patRec.states[patRec.i]?.listening) patRec.states[patRec.i].listening = false
    patRec = null
  }

  // ── Notes ──────────────────────────────────────────────────────────────────
  function addNote(text, withTime = true) {
    const audio = $('ee-audio')
    const t = withTime && audio && tab !== 'vocab' ? Math.floor(audio.currentTime) : null
    update(s => s.notes.push({ id: Date.now().toString(36), slug, tab, part: tab === 'ms' ? msPart : undefined, t, text, at: Date.now() }))
    if ($('ee-notes')) $('ee-notes').innerHTML = buildNotes()
  }

  // ── Handlers ───────────────────────────────────────────────────────────────
  Object.assign(window, {
    eeTab:       k  => { tab = k; revealed = new Set(); render() },
    eeRoutineNext: () => { const r = getRoutine(); if (!r) return
                         setRoutineStep(r.step + 1)
                         const st = ROUTINE[r.step + 1]
                         if (!st) return navigate(`${BASE}/guide`)
                         if (st.vi != null) { showVI = st.vi; setSetting('showVI', showVI) }
                         tab = st.tab; revealed = new Set(); render(); window.scrollTo(0, 0) },
    eeMsPart:    i  => { msPart = i; revealed = new Set(); render() },
    eePlay:      i  => playLine(i),
    eeToggle:    () => { const a = $('ee-audio'); if (!a || !audioOk) return speak(lines()[Math.max(0, activeIdx)]?.text); a.paused ? a.play() : a.pause() },
    eeSkip:      d  => { const a = $('ee-audio'); if (a) a.currentTime = Math.max(0, a.currentTime + d) },
    eeSpeed:     s  => { speed = s; setSetting('speed', s); if ($('ee-audio')) $('ee-audio').playbackRate = s; $('ee-speeds').innerHTML = buildSpeeds() },
    eeReveal:    i  => { revealed.add(i); updatePanel() },
    eeToggleVI:  () => { showVI = !showVI; setSetting('showVI', showVI); updatePanel() },
    eeToggleIPA: () => { showIPA = !showIPA; setSetting('showIPA', showIPA); updatePanel() },
    eeToggleText:() => { hideText = !hideText; updatePanel(); if ($('ee-listens')) $('ee-listens').innerHTML = buildListens() },
    eeToggleHide:() => { hideAns = !hideAns; revealed = new Set(); updatePanel() },
    eeWaitSec:   s  => { waitSec = s; setSetting('waitSec', s); if (!s) cancelWait(); updatePanel() },
    eeToggleMic: () => { useMic = !useMic; setSetting('useMic', useMic); updatePanel() },
    eeContinue:  () => finishWait(),
    eeReplayQ:   () => { if (!wait) return; const q = wait.q; cancelWait(); playLine(q) },
    eeMoreTime:  () => { if (wait) { wait.left += 5; wait.total += 5; renderWait() } },
    eeSayWord:   i  => speak(vocabItems(lesson)[i]?.word, 0.8),
    eeSayPhrase: i  => speak(phraseItems(lesson)[i]?.en, 0.85),
    eeSavePhrase:i  => { const w = phraseItems(lesson)[i].en
                         update(s => { s.saved = s.saved.includes(w) ? s.saved.filter(x => x !== w) : [...s.saved, w] }); updatePanel() },
    eePhraseCtx: i  => { const line = lineForPhrase(lesson, phraseItems(lesson)[i].en); const a = $('ee-audio')
                         if (!line) return
                         if (a && audioOk) { a.currentTime = line.t; a.play().catch(() => speak(line.text)) } else speak(line.text) },
    eeQASay:     i  => playQA(i, 'q'),
    eeQASayA:    i  => playQA(i, 'a'),
    eeQAShow:    i  => { qaState[i] = { ...qaState[i], shown: true }; updatePanel() },
    eeQAAll:     () => { qaShowAll = !qaShowAll; updatePanel() },
    eeQAMic:     i  => qaListen(i),
    eeQACheck:   i  => { const v = $(`ee-qa-${i}`)?.value.trim(); if (!v) return $(`ee-qa-${i}`)?.focus()
                         qaState[i] = { text: v, score: matchScore(v, qaItems(lesson)[i].a), shown: true }; updatePanel() },
    eeSayPattern:i  => speak(patternItems(lesson)[i]?.example, 0.85),
    eePatCheck:  i  => { const v = $(`ee-pat-${i}`)?.value.trim(); if (!v) return $(`ee-pat-${i}`)?.focus()
                         patState[i] = { text: v, result: checkPattern(patternItems(lesson)[i], v) }; updatePanel() },
    eePatMic:    i  => patListen(i),
    eeSave:      i  => { const w = vocabItems(lesson)[i].word
                         update(s => { s.saved = s.saved.includes(w) ? s.saved.filter(x => x !== w) : [...s.saved, w] }); updatePanel() },
    eeComplete:  () => { setCompleted(slug, !lessonProgress(slug).completed); refreshProgress() },
    eeAddNote:   () => { const ta = $('ee-note-text'); const v = ta.value.trim(); if (!v) return ta.focus(); addNote(v); ta.value = '' },
    eeNoteCurrent: () => { const l = lines()[activeIdx]; if (l) addNote(l.text); else $('ee-note-text').focus() },
    eeDelNote:   id => { update(s => { s.notes = s.notes.filter(n => n.id !== id) }); $('ee-notes').innerHTML = buildNotes() },
    eeGoNote:    id => { const n = getState().notes.find(x => x.id === id); if (!n) return
                         if (n.tab !== tab || (n.tab === 'ms' && (n.part || 0) !== msPart)) { tab = n.tab; msPart = n.part || 0; render() }
                         const a = $('ee-audio'); if (!a || n.t == null) return
                         if (a.readyState >= 1) { a.currentTime = n.t } else pendingSeek = n.t
                         a.play() },
  })

  // Space: end the answer pause, otherwise play/pause (ignored while typing)
  function onKey(e) {
    if (e.code !== 'Space' && e.code !== 'Enter') return
    if (['INPUT', 'TEXTAREA', 'BUTTON'].includes(document.activeElement?.tagName)) return
    if (wait) { e.preventDefault(); finishWait() }
    else if (e.code === 'Space') { e.preventDefault(); window.eeToggle() }
  }
  document.addEventListener('keydown', onKey)
  // Live routine counter: patch time + bar in place; rebuild only when the step or "done" state changes
  const routineTimer = setInterval(() => {
    const el = $('ee-routine'), r = getRoutine()
    if (!el || !r || r.slug !== slug || r.step >= ROUTINE.length) return
    const goal = ROUTINE[r.step].min * 60, spent = Math.min(goal, r.spent[r.step] + pendingSeconds())
    const box = el.firstElementChild
    if (!box || box.dataset.ok !== String(spent >= goal) || box.dataset.step !== String(r.step)) { el.innerHTML = routineBanner(); return }
    $('ee-rt-bar').style.width = `${spent / goal * 100}%`
    $('ee-rt-time').textContent = `${fmt(spent)} / ${fmt(goal)}`
  }, 1000)
  onLeave(() => {
    clearInterval(routineTimer)
    document.removeEventListener('keydown', onKey)
    cancelWait(); stopPatRec(); stopSegment(); flushListen(); cancelAnimationFrame(loopId); clearTimeout(fbTimer)
    $('ee-audio')?.pause(); speechSynthesis.cancel()
  })

  render()
}
