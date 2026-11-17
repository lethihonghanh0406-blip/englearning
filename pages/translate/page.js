import { SUPABASE_URL, SUPABASE_KEY } from '../../config/env.js'

// Noi dat cac file Chu_de_NN.mp3 (da upload). De trong thi trang se bao chua cau hinh.
const AUDIO_BASE = 'https://audio.learnlang.top/Luyen%20dich%20tieng%20Anh'

const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

let audio = null
let stopAt = 0
let activeBtn = null
let currentTopic = 0
let TOPICS = []

// Doc cau luyen dich tu bang translate_sentences tren Supabase (qua REST API)
async function loadTopics() {
  const url = `${SUPABASE_URL}/rest/v1/translate_sentences?select=topic_no,topic_title,idx,vi,en,start_sec,vi_sec,en_sec&order=topic_no.asc,idx.asc`
  const res = await fetch(url, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const rows = await res.json()
  const byTopic = new Map()
  for (const r of rows) {
    if (!byTopic.has(r.topic_no)) byTopic.set(r.topic_no, { n: r.topic_no, title: r.topic_title, items: [] })
    byTopic.get(r.topic_no).items.push({ vi: r.vi, en: r.en, s: Number(r.start_sec), v: Number(r.vi_sec), e: Number(r.en_sec) })
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

function playItem(topic, item, btn) {
  if (!AUDIO_BASE) {
    alert('Chưa cấu hình nơi lưu audio (AUDIO_BASE trong pages/translate/page.js).')
    return
  }
  stopPlayback()
  const a = ensureAudio()
  const file = `${AUDIO_BASE}/Chu_de_${String(topic.n).padStart(2, '0')}.mp3`
  if (a.src !== file) a.src = file
  // Phat tieng Viet, nghi 3s, phat tieng Anh (khop voi file ghep)
  stopAt = item.s + item.v + 3.0 + item.e
  a.currentTime = item.s
  a.play().catch(() => alert('Không phát được audio. Kiểm tra lại đường dẫn AUDIO_BASE.'))
  activeBtn = btn
  btn.textContent = '■ Dừng'
  btn.classList.add('playing')
}

function topicChips() {
  return TOPICS.map((t, i) =>
    `<button class="tr-chip ${i === currentTopic ? 'active' : ''}" data-i="${i}">${String(t.n).padStart(2, '0')}. ${esc(t.title)}</button>`
  ).join('')
}

function rows(topic) {
  return topic.items.map((it, idx) => `
    <div class="tr-row">
      <div class="tr-left">
        <div class="tr-num">${idx + 1}</div>
        <div class="tr-vi">${esc(it.vi)}</div>
        <button class="tr-reveal" data-idx="${idx}">Hiện tiếng Anh</button>
        <div class="tr-en" data-en="${idx}" hidden>${esc(it.en)}</div>
      </div>
      <div class="tr-right">
        <button class="tr-play" data-idx="${idx}">▶ Nghe</button>
      </div>
    </div>`).join('')
}

const STYLE = `
.tr-wrap{max-width:960px;margin:0 auto;padding:16px;font-family:inherit}
.tr-title{font-size:22px;font-weight:700;margin:8px 0 4px}
.tr-sub{color:#64748b;font-size:14px;margin-bottom:12px}
.tr-layout{display:grid;grid-template-columns:260px 1fr;gap:20px;align-items:start}
.tr-chips{display:flex;flex-direction:column;gap:4px;position:sticky;top:12px;max-height:85vh;overflow-y:auto;padding-right:4px}
.tr-chip{border:1px solid transparent;background:transparent;border-radius:8px;padding:8px 10px;font-size:14px;cursor:pointer;color:#0f172a;text-align:left;width:100%}
.tr-chip:hover{background:#f1f5f9}
.tr-chip.active{background:#2563eb;color:#fff}
@media (max-width:760px){
  .tr-layout{grid-template-columns:1fr}
  .tr-chips{flex-direction:row;overflow-x:auto;overflow-y:hidden;position:static;max-height:none;padding-bottom:6px}
  .tr-chip{width:auto;white-space:nowrap;border:1px solid #cbd5e1;border-radius:999px}
}
.tr-row{display:flex;gap:12px;align-items:stretch;border:1px solid #e2e8f0;border-radius:12px;padding:12px;margin-bottom:10px;background:#fff}
.tr-left{flex:1;min-width:0;display:flex;flex-direction:column;gap:6px}
.tr-num{font-size:12px;color:#94a3b8}
.tr-vi{font-size:16px;color:#0f172a;line-height:1.4}
.tr-en{font-size:15px;color:#2563eb;font-style:italic;line-height:1.4}
.tr-reveal{align-self:flex-start;border:none;background:#f1f5f9;color:#334155;border-radius:8px;padding:6px 10px;font-size:13px;cursor:pointer}
.tr-right{display:flex;align-items:center}
.tr-play{border:none;background:#16a34a;color:#fff;border-radius:10px;padding:10px 16px;font-size:14px;cursor:pointer;white-space:nowrap}
.tr-play.playing{background:#dc2626}
@media (max-width:560px){
  .tr-row{flex-direction:column}
  .tr-right{justify-content:flex-end}
  .tr-vi{font-size:15px}
}
@media (prefers-color-scheme: dark){
  .tr-chip{color:#e2e8f0}
  .tr-chip:hover{background:#1e293b}
  .tr-row{background:#0f172a;border-color:#334155}
  .tr-vi{color:#e2e8f0}
  .tr-reveal{background:#1e293b;color:#cbd5e1}
  .tr-sub{color:#94a3b8}
}
`

export default function translatePage(app) {
  app.innerHTML = `
    <style>${STYLE}</style>
    <div class="tr-wrap">
      <div class="tr-title">Luyện dịch tiếng Anh – 20 chủ đề</div>
      <div class="tr-sub">Đọc câu tiếng Việt, tự nghĩ câu tiếng Anh, rồi bấm “Hiện tiếng Anh” để kiểm tra. Nút “Nghe” phát tiếng Việt, nghỉ 3 giây, rồi phát tiếng Anh.</div>
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
    const topic = TOPICS[currentTopic]
    list.innerHTML = rows(topic)
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
      playItem(topic, topic.items[Number(play.dataset.idx)], play)
    }
  })
}
