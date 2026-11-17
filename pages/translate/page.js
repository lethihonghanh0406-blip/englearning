import { SUPABASE_URL, SUPABASE_KEY } from '../../config/env.js'
import { supabase } from '../../supabase/client.js'

// Noi dat cac file Chu_de_NN.mp3 (da upload). De trong thi trang se bao chua cau hinh.
const AUDIO_BASE = 'https://audio.learnlang.top/Luyen%20dich%20tieng%20Anh'

const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

let audio = null
let stopAt = 0
let activeBtn = null
let currentTopic = 0
let currentMode = 'prod' // 'prod' = dich tu tieng Viet, 'dict' = nghe chep chinh ta
let TOPICS = []

// Doc cau luyen dich tu bang translate_sentences tren Supabase (qua REST API)
async function loadTopics() {
  const url = `${SUPABASE_URL}/rest/v1/translate_sentences?select=topic_no,topic_title,idx,vi,en,en_ipa,start_sec,vi_sec,en_sec&order=topic_no.asc,idx.asc`
  // Dung token cua nguoi dung dang nhap de RLS chi cho tai khoan Pro doc
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token || SUPABASE_KEY
  const res = await fetch(url, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const rows = await res.json()
  const byTopic = new Map()
  for (const r of rows) {
    if (!byTopic.has(r.topic_no)) byTopic.set(r.topic_no, { n: r.topic_no, title: r.topic_title, items: [] })
    byTopic.get(r.topic_no).items.push({ vi: r.vi, en: r.en, ipa: r.en_ipa || '', s: Number(r.start_sec), v: Number(r.vi_sec), e: Number(r.en_sec) })
  }
  TOPICS = [...byTopic.values()]
}

function ensureAudio() {
  if (audio) return audio
  audio = new Audio()
  audio.preload = 'none'
  audio.addEventListener('timeupdate', () => {
    if (audio.currentTime >= stopAt) stopPlayback()
  })
  audio.addEventListener('ended', stopPlayback)
  return audio
}

function stopPlayback() {
  if (audio) audio.pause()
  if (activeBtn) {
    activeBtn.textContent = '▶ Nghe'
    activeBtn.classList.remove('playing')
    activeBtn = null
  }
}

// part = 'full': tieng Viet, nghi 3s, tieng Anh. part = 'en': chi tieng Anh.
function playItem(topic, item, btn, part = 'full') {
  if (!AUDIO_BASE) {
    alert('Chưa cấu hình nơi lưu audio (AUDIO_BASE trong pages/translate/page.js).')
    return
  }
  stopPlayback()
  const a = ensureAudio()
  const file = `${AUDIO_BASE}/Chu_de_${String(topic.n).padStart(2, '0')}.mp3`
  if (a.src !== file) a.src = file
  const enStart = item.s + item.v + 3.0
  const from = part === 'en' ? enStart : item.s
  stopAt = enStart + item.e
  a.currentTime = from
  a.play().catch(() => alert('Không phát được audio. Kiểm tra lại đường dẫn AUDIO_BASE.'))
  activeBtn = btn
  btn.textContent = '■ Dừng'
  btn.classList.add('playing')
}

// So sanh khong phan biet hoa/thuong, dau cau, khoang trang
function normalize(s) {
  return String(s).toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/[^a-z0-9' ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function topicChips() {
  return TOPICS.map((t, i) =>
    `<button class="tr-chip ${i === currentTopic ? 'active' : ''}" data-i="${i}">${String(t.n).padStart(2, '0')}. ${esc(t.title)}</button>`
  ).join('')
}

function ipaBlock(it) {
  return it.ipa ? `<div class="tr-ipa">/${esc(it.ipa)}/</div>` : ''
}

function prodRows(topic) {
  return topic.items.map((it, idx) => `
    <div class="tr-row">
      <div class="tr-left">
        <div class="tr-num">${idx + 1}</div>
        <div class="tr-vi">${esc(it.vi)}</div>
        <button class="tr-reveal" data-idx="${idx}">Hiện tiếng Anh</button>
        <div class="tr-en" data-en="${idx}" hidden>${esc(it.en)}${ipaBlock(it)}</div>
      </div>
      <div class="tr-right">
        <button class="tr-play" data-idx="${idx}" data-part="full">▶ Nghe</button>
      </div>
    </div>`).join('')
}

function dictRows(topic) {
  return topic.items.map((it, idx) => `
    <div class="tr-row">
      <div class="tr-left">
        <div class="tr-num">${idx + 1}</div>
        <div class="tr-vi">${esc(it.vi)}</div>
        ${ipaBlock(it)}
        <div class="tr-hint">Nghe câu tiếng Anh rồi gõ lại</div>
        <input class="tr-input" data-idx="${idx}" placeholder="Gõ câu tiếng Anh..." autocomplete="off" spellcheck="false">
        <div class="tr-result" data-res="${idx}" hidden></div>
      </div>
      <div class="tr-right tr-btns">
        <button class="tr-play" data-idx="${idx}" data-part="en">▶ Nghe</button>
        <button class="tr-check" data-idx="${idx}">Kiểm tra</button>
        <button class="tr-show" data-idx="${idx}">Xem đáp án</button>
      </div>
    </div>`).join('')
}

function rows(topic) {
  return currentMode === 'dict' ? dictRows(topic) : prodRows(topic)
}

function showResult(list, topic, idx, ok) {
  const it = topic.items[idx]
  const box = list.querySelector(`[data-res="${idx}"]`)
  box.hidden = false
  box.className = 'tr-result ' + (ok === null ? 'tr-show-box' : ok ? 'tr-ok' : 'tr-bad')
  const head = ok === null ? 'Đáp án' : ok ? '✓ Chính xác' : '✗ Chưa đúng'
  box.innerHTML = `<strong>${head}</strong><div class="tr-en2">${esc(it.en)}</div>${ipaBlock(it)}`
}

const STYLE = `
.tr-wrap{max-width:1040px;margin:0 auto;padding:20px 16px;font-family:inherit;color:#0f172a;background:#f8faff;border-radius:16px}
.tr-title{font-size:22px;font-weight:700;margin:8px 0 4px}
.tr-sub{color:#64748b;font-size:14px;margin-bottom:12px}
.tr-modes{display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap}
.tr-mode{border:1px solid #cbd5e1;background:#fff;color:#0f172a;border-radius:999px;padding:7px 14px;font-size:14px;cursor:pointer}
.tr-mode.active{background:#0f172a;border-color:#0f172a;color:#fff}
.tr-layout{display:grid;grid-template-columns:260px 1fr;gap:20px;align-items:start}
.tr-chips{display:flex;flex-direction:column;gap:4px;position:sticky;top:12px;max-height:85vh;overflow-y:auto;background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:10px}
.tr-chip{border:1px solid transparent;background:transparent;border-radius:8px;padding:8px 10px;font-size:14px;cursor:pointer;color:#0f172a;text-align:left;width:100%}
.tr-chip:hover{background:#f1f5f9}
.tr-chip.active{background:#2563eb;color:#fff}
@media (max-width:760px){
  .tr-layout{grid-template-columns:1fr}
  .tr-chips{flex-direction:row;overflow-x:auto;overflow-y:hidden;position:static;max-height:none;padding-bottom:6px}
  .tr-chip{width:auto;white-space:nowrap;border:1px solid #e2e8f0;border-radius:999px;background:#fff}
}
.tr-row{display:flex;gap:12px;align-items:stretch;border:1px solid #e2e8f0;border-radius:12px;padding:12px;margin-bottom:10px;background:#fff}
.tr-left{flex:1;min-width:0;display:flex;flex-direction:column;gap:6px}
.tr-num{font-size:12px;color:#94a3b8}
.tr-vi{font-size:16px;color:#0f172a;line-height:1.4}
.tr-hint{font-size:14px;color:#64748b}
.tr-en{font-size:15px;color:#2563eb;font-style:italic;line-height:1.4}
.tr-ipa{font-family:'Segoe UI','Doulos SIL','Charis SIL',serif;font-style:normal;font-size:14px;color:#64748b;margin-top:2px}
.tr-reveal{align-self:flex-start;border:none;background:#f1f5f9;color:#334155;border-radius:8px;padding:6px 10px;font-size:13px;cursor:pointer}
.tr-input{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:8px;padding:9px 12px;font-size:15px;color:#0f172a;background:#fff;font-family:inherit}
.tr-input:focus{outline:2px solid #bfdbfe;border-color:#2563eb}
.tr-result{border-radius:8px;padding:8px 10px;font-size:14px;line-height:1.4}
.tr-result[hidden]{display:none}
.tr-result strong{display:block;margin-bottom:2px}
.tr-en2{font-style:italic}
.tr-ok{background:#dcfce7;color:#166534}
.tr-bad{background:#fee2e2;color:#991b1b}
.tr-show-box{background:#eff6ff;color:#1e3a8a}
.tr-right{display:flex;align-items:center}
.tr-btns{flex-direction:column;justify-content:center;gap:6px}
.tr-play,.tr-check,.tr-show{border:none;border-radius:10px;padding:10px 14px;font-size:14px;font-weight:600;cursor:pointer;white-space:nowrap}
.tr-play{background:#2563eb;color:#fff;box-shadow:0 2px 8px rgba(37,99,235,.25)}
.tr-play:hover{background:#1d4ed8}
.tr-play.playing{background:#f97316;box-shadow:0 2px 8px rgba(249,115,22,.3)}
.tr-check{background:#16a34a;color:#fff}
.tr-show{background:#f1f5f9;color:#334155}
@media (max-width:560px){
  .tr-row{flex-direction:column}
  .tr-right{justify-content:flex-end}
  .tr-btns{flex-direction:row;justify-content:flex-start;flex-wrap:wrap}
  .tr-vi{font-size:15px}
}
`

export default function translatePage(app) {
  app.innerHTML = `
    <style>${STYLE}</style>
    <div class="tr-wrap">
      <div class="tr-title">Luyện dịch tiếng Anh – 20 chủ đề</div>
      <div class="tr-sub" id="tr-sub">Đọc câu tiếng Việt, tự nghĩ câu tiếng Anh, rồi bấm “Hiện tiếng Anh” để kiểm tra. Nút “Nghe” phát tiếng Việt, nghỉ 3 giây, rồi phát tiếng Anh.</div>
      <div class="tr-modes" id="tr-modes">
        <button class="tr-mode active" data-mode="prod">Dịch từ tiếng Việt</button>
        <button class="tr-mode" data-mode="dict">Nghe chép chính tả</button>
      </div>
      <div class="tr-layout">
        <div class="tr-chips" id="tr-chips">${topicChips()}</div>
        <div id="tr-list"></div>
      </div>
    </div>`

  const list = app.querySelector('#tr-list')
  list.innerHTML = '<div class="tr-sub">Đang tải câu...</div>'
  loadTopics()
    .then(() => init(app, list))
    .catch(err => {
      list.innerHTML = `<div class="tr-sub">Không tải được câu luyện dịch (${esc(err.message)}).</div>`
    })
}

function init(app, list) {
  app.querySelector('#tr-chips').innerHTML = topicChips()

  const renderList = () => {
    list.innerHTML = rows(TOPICS[currentTopic])
    stopPlayback()
  }
  renderList()

  app.querySelector('#tr-chips').addEventListener('click', (e) => {
    const chip = e.target.closest('.tr-chip')
    if (!chip) return
    currentTopic = Number(chip.dataset.i)
    app.querySelectorAll('.tr-chip').forEach((c, i) => c.classList.toggle('active', i === currentTopic))
    renderList()
  })

  app.querySelector('#tr-modes').addEventListener('click', (e) => {
    const btn = e.target.closest('.tr-mode')
    if (!btn || btn.dataset.mode === currentMode) return
    currentMode = btn.dataset.mode
    app.querySelectorAll('.tr-mode').forEach(b => b.classList.toggle('active', b === btn))
    app.querySelector('#tr-sub').textContent = currentMode === 'dict'
      ? 'Bấm “Nghe” để nghe câu tiếng Anh, gõ lại câu đó rồi bấm “Kiểm tra”. Có thể nghe lại nhiều lần.'
      : 'Đọc câu tiếng Việt, tự nghĩ câu tiếng Anh, rồi bấm “Hiện tiếng Anh” để kiểm tra. Nút “Nghe” phát tiếng Việt, nghỉ 3 giây, rồi phát tiếng Anh.'
    renderList()
  })

  const check = (idx) => {
    const topic = TOPICS[currentTopic]
    const input = list.querySelector(`.tr-input[data-idx="${idx}"]`)
    const ok = normalize(input.value) === normalize(topic.items[idx].en)
    showResult(list, topic, idx, ok)
  }

  list.addEventListener('click', (e) => {
    const topic = TOPICS[currentTopic]

    const reveal = e.target.closest('.tr-reveal')
    if (reveal) {
      const en = list.querySelector(`[data-en="${reveal.dataset.idx}"]`)
      en.hidden = !en.hidden
      reveal.textContent = en.hidden ? 'Hiện tiếng Anh' : 'Ẩn tiếng Anh'
      return
    }

    const play = e.target.closest('.tr-play')
    if (play) {
      if (play.classList.contains('playing')) { stopPlayback(); return }
      playItem(topic, topic.items[Number(play.dataset.idx)], play, play.dataset.part || 'full')
      return
    }

    const checkBtn = e.target.closest('.tr-check')
    if (checkBtn) { check(Number(checkBtn.dataset.idx)); return }

    const showBtn = e.target.closest('.tr-show')
    if (showBtn) { showResult(list, topic, Number(showBtn.dataset.idx), null); return }
  })

  list.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.classList.contains('tr-input')) {
      check(Number(e.target.dataset.idx))
    }
  })
}
