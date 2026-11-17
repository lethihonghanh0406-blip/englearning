import { TRANSLATION_TOPICS } from './data.js'

// Noi dat cac file Chu_de_NN.wav (da upload). De trong thi trang se bao chua cau hinh.
const AUDIO_BASE = 'https://pub-693e3a32630c47669ee5eee2b66d4e8c.r2.dev/Luyen%20dich%20tieng%20Anh'

const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

let audio = null
let stopAt = 0
let activeBtn = null
let currentTopic = 0

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
  return TRANSLATION_TOPICS.map((t, i) =>
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
.tr-chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px}
.tr-chip{border:1px solid #cbd5e1;background:#fff;border-radius:999px;padding:6px 12px;font-size:13px;cursor:pointer;color:#0f172a}
.tr-chip.active{background:#2563eb;border-color:#2563eb;color:#fff}
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
  .tr-chip{background:#0f172a;color:#e2e8f0;border-color:#334155}
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
      <div class="tr-chips" id="tr-chips">${topicChips()}</div>
      <div id="tr-list"></div>
    </div>`

  const list = app.querySelector('#tr-list')
  const renderList = () => {
    const topic = TRANSLATION_TOPICS[currentTopic]
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
    const topic = TRANSLATION_TOPICS[currentTopic]
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
