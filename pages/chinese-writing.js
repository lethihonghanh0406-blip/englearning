const HANZI_CDN = 'https://cdn.jsdelivr.net/npm/hanzi-writer@3.5/dist/hanzi-writer.min.js'
const KEY = 'cw_mastered_v1'
const SESSION_SIZE = 10

const WORDS = [
  { char:'爱', pinyin:'ài',    vi:'yêu' },
  { char:'八', pinyin:'bā',    vi:'tám' },
  { char:'爸', pinyin:'bà',    vi:'bố' },
  { char:'杯', pinyin:'bēi',   vi:'cốc, ly' },
  { char:'北', pinyin:'běi',   vi:'phía bắc' },
  { char:'本', pinyin:'běn',   vi:'quyển (sách)' },
  { char:'不', pinyin:'bù',    vi:'không' },
  { char:'菜', pinyin:'cài',   vi:'rau, món ăn' },
  { char:'茶', pinyin:'chá',   vi:'trà' },
  { char:'吃', pinyin:'chī',   vi:'ăn' },
  { char:'出', pinyin:'chū',   vi:'ra ngoài' },
  { char:'大', pinyin:'dà',    vi:'lớn' },
  { char:'的', pinyin:'de',    vi:'của (trợ từ)' },
  { char:'点', pinyin:'diǎn',  vi:'điểm, giờ' },
  { char:'电', pinyin:'diàn',  vi:'điện' },
  { char:'东', pinyin:'dōng',  vi:'phía đông' },
  { char:'都', pinyin:'dōu',   vi:'đều, tất cả' },
  { char:'读', pinyin:'dú',    vi:'đọc' },
  { char:'对', pinyin:'duì',   vi:'đúng' },
  { char:'多', pinyin:'duō',   vi:'nhiều' },
  { char:'二', pinyin:'èr',    vi:'hai' },
  { char:'飞', pinyin:'fēi',   vi:'bay' },
  { char:'分', pinyin:'fēn',   vi:'phút, điểm' },
  { char:'高', pinyin:'gāo',   vi:'cao' },
  { char:'个', pinyin:'gè',    vi:'cái (lượng từ)' },
  { char:'狗', pinyin:'gǒu',   vi:'con chó' },
  { char:'好', pinyin:'hǎo',   vi:'tốt' },
  { char:'号', pinyin:'hào',   vi:'số' },
  { char:'喝', pinyin:'hē',    vi:'uống' },
  { char:'和', pinyin:'hé',    vi:'và' },
  { char:'很', pinyin:'hěn',   vi:'rất' },
  { char:'后', pinyin:'hòu',   vi:'sau' },
  { char:'回', pinyin:'huí',   vi:'quay về' },
  { char:'会', pinyin:'huì',   vi:'biết làm, sẽ' },
  { char:'几', pinyin:'jǐ',    vi:'mấy, bao nhiêu' },
  { char:'家', pinyin:'jiā',   vi:'nhà' },
  { char:'叫', pinyin:'jiào',  vi:'gọi, tên là' },
  { char:'今', pinyin:'jīn',   vi:'hôm nay, nay' },
  { char:'九', pinyin:'jiǔ',   vi:'chín' },
  { char:'开', pinyin:'kāi',   vi:'mở' },
  { char:'看', pinyin:'kàn',   vi:'nhìn, xem' },
  { char:'来', pinyin:'lái',   vi:'đến' },
  { char:'老', pinyin:'lǎo',   vi:'già, lão' },
  { char:'冷', pinyin:'lěng',  vi:'lạnh' },
  { char:'里', pinyin:'lǐ',    vi:'trong' },
  { char:'六', pinyin:'liù',   vi:'sáu' },
  { char:'妈', pinyin:'mā',    vi:'mẹ' },
  { char:'买', pinyin:'mǎi',   vi:'mua' },
  { char:'猫', pinyin:'māo',   vi:'con mèo' },
  { char:'没', pinyin:'méi',   vi:'không có' },
  { char:'明', pinyin:'míng',  vi:'sáng, ngày mai' },
  { char:'哪', pinyin:'nǎ',    vi:'nào, đâu' },
  { char:'那', pinyin:'nà',    vi:'kia, đó' },
  { char:'能', pinyin:'néng',  vi:'có thể' },
  { char:'你', pinyin:'nǐ',    vi:'bạn, anh/chị' },
  { char:'年', pinyin:'nián',  vi:'năm' },
  { char:'女', pinyin:'nǚ',    vi:'nữ, con gái' },
  { char:'七', pinyin:'qī',    vi:'bảy' },
  { char:'钱', pinyin:'qián',  vi:'tiền' },
  { char:'请', pinyin:'qǐng',  vi:'xin mời' },
  { char:'去', pinyin:'qù',    vi:'đi (đến đó)' },
  { char:'热', pinyin:'rè',    vi:'nóng' },
  { char:'人', pinyin:'rén',   vi:'người' },
  { char:'日', pinyin:'rì',    vi:'ngày, mặt trời' },
  { char:'三', pinyin:'sān',   vi:'ba' },
  { char:'上', pinyin:'shàng', vi:'trên' },
  { char:'少', pinyin:'shǎo',  vi:'ít' },
  { char:'谁', pinyin:'shéi',  vi:'ai' },
  { char:'生', pinyin:'shēng', vi:'sinh, sống' },
  { char:'十', pinyin:'shí',   vi:'mười' },
  { char:'时', pinyin:'shí',   vi:'thời gian' },
  { char:'是', pinyin:'shì',   vi:'là' },
  { char:'书', pinyin:'shū',   vi:'sách' },
  { char:'水', pinyin:'shuǐ',  vi:'nước' },
  { char:'说', pinyin:'shuō',  vi:'nói' },
  { char:'四', pinyin:'sì',    vi:'bốn' },
  { char:'岁', pinyin:'suì',   vi:'tuổi' },
  { char:'他', pinyin:'tā',    vi:'anh ấy' },
  { char:'她', pinyin:'tā',    vi:'cô ấy' },
  { char:'太', pinyin:'tài',   vi:'quá' },
  { char:'天', pinyin:'tiān',  vi:'trời, ngày' },
  { char:'听', pinyin:'tīng',  vi:'nghe' },
  { char:'我', pinyin:'wǒ',    vi:'tôi' },
  { char:'五', pinyin:'wǔ',    vi:'năm (số)' },
  { char:'午', pinyin:'wǔ',    vi:'buổi trưa' },
  { char:'西', pinyin:'xī',    vi:'phía tây' },
  { char:'下', pinyin:'xià',   vi:'dưới, xuống' },
  { char:'先', pinyin:'xiān',  vi:'trước' },
  { char:'现', pinyin:'xiàn',  vi:'hiện tại' },
  { char:'想', pinyin:'xiǎng', vi:'muốn, nghĩ' },
  { char:'小', pinyin:'xiǎo',  vi:'nhỏ' },
  { char:'谢', pinyin:'xiè',   vi:'cảm ơn' },
  { char:'学', pinyin:'xué',   vi:'học' },
  { char:'一', pinyin:'yī',    vi:'một' },
  { char:'有', pinyin:'yǒu',   vi:'có' },
  { char:'月', pinyin:'yuè',   vi:'tháng, trăng' },
  { char:'在', pinyin:'zài',   vi:'ở, đang' },
  { char:'再', pinyin:'zài',   vi:'lại, hẹn gặp' },
  { char:'这', pinyin:'zhè',   vi:'này, đây' },
  { char:'中', pinyin:'zhōng', vi:'giữa, Trung Quốc' },
  { char:'住', pinyin:'zhù',   vi:'ở, sống' },
  { char:'字', pinyin:'zì',    vi:'chữ' },
  { char:'坐', pinyin:'zuò',   vi:'ngồi' },
  { char:'做', pinyin:'zuò',   vi:'làm' },
  { char:'左', pinyin:'zuǒ',   vi:'trái' },
  { char:'右', pinyin:'yòu',   vi:'phải' },
  { char:'口', pinyin:'kǒu',   vi:'miệng, cửa' },
  { char:'手', pinyin:'shǒu',  vi:'tay' },
  { char:'心', pinyin:'xīn',   vi:'tim, lòng' },
  { char:'山', pinyin:'shān',  vi:'núi' },
  { char:'火', pinyin:'huǒ',   vi:'lửa' },
  { char:'木', pinyin:'mù',    vi:'gỗ, cây' },
  { char:'土', pinyin:'tǔ',    vi:'đất' },
  { char:'金', pinyin:'jīn',   vi:'vàng, kim loại' },
]

export default async function chineseWritingPage(app) {
  const mastered = new Set(JSON.parse(localStorage.getItem(KEY) || '[]'))
  let tab = 'write'   // 'flash' | 'write' | 'quiz'
  let srsMode = false
  let writer = null

  function save() { localStorage.setItem(KEY, JSON.stringify([...mastered])) }

  function buildSession() {
    const pool = srsMode ? WORDS.filter(w => !mastered.has(w.char)) : WORDS
    const unmastered = pool.filter(w => !mastered.has(w.char))
    return (unmastered.length > 0 ? unmastered : pool).slice(0, SESSION_SIZE)
  }

  // ── shared shell ──────────────────────────────────────────────────────────
  app.innerHTML = `
    <style>
      .cw-tab { padding:8px 20px;border-radius:20px;border:2px solid #e5e7eb;cursor:pointer;font-size:14px;font-weight:600;background:white;color:#6b7280;transition:.12s }
      .cw-tab.active { border-color:#1e293b;color:#1e293b }
      .cw-tab.orange { color:#f97316;border-color:#fed7aa }
      .cw-tab.pink   { color:#f43f5e;border-color:#fecdd3 }
      .cw-btn { padding:10px 28px;border:1.5px solid #d1d5db;border-radius:10px;background:white;cursor:pointer;font-size:14px;font-weight:500;color:#374151;transition:.12s }
      .cw-btn:hover { border-color:#94a3b8;background:#f8fafc }
      .cw-opt { width:100%;padding:12px 16px;border:2px solid #e5e7eb;border-radius:12px;background:white;cursor:pointer;font-size:15px;font-weight:500;color:#1e293b;text-align:left;transition:.15s }
      .cw-opt:hover:not(:disabled) { border-color:#94a3b8;background:#f8fafc }
      .cw-opt.correct  { border-color:#16a34a!important;background:#dcfce7!important;color:#15803d!important }
      .cw-opt.wrong    { border-color:#dc2626!important;background:#fee2e2!important;color:#dc2626!important }
    </style>

    <div style="min-height:100vh;background:#fdf8f0;display:flex;flex-direction:column;align-items:center;padding:28px 16px">

      <!-- Tabs -->
      <div style="display:flex;gap:8px;margin-bottom:28px;flex-wrap:wrap;justify-content:center">
        <button id="tab-flash" class="cw-tab" onclick="cwTab('flash')">Học thẻ</button>
        <button id="tab-write" class="cw-tab active" onclick="cwTab('write')">Luyện viết</button>
        <button id="tab-quiz"  class="cw-tab orange" onclick="cwTab('quiz')">Luyện tập</button>
        <button id="tab-note"  class="cw-tab pink" onclick="">Sổ tay ❤</button>
      </div>

      <!-- SRS -->
      <label style="display:flex;align-items:center;gap:10px;background:white;border-radius:12px;padding:10px 20px;cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,.06);margin-bottom:20px;border:1.5px solid #e5e7eb">
        <input type="checkbox" id="cw-srs" style="width:16px;height:16px;accent-color:#2563eb">
        <div>
          <div style="font-size:14px;font-weight:600;color:#1e293b">Chế độ Ôn tập (SRS)</div>
          <div style="font-size:12px;color:#94a3b8">Chỉ hiện những từ sắp quên</div>
        </div>
      </label>

      <!-- Progress -->
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:24px;flex-wrap:wrap;justify-content:center">
        <div style="background:#dcfce7;color:#15803d;font-size:13px;font-weight:700;padding:6px 16px;border-radius:20px">
          ✅ Đã thuộc: <span id="cw-mastered">${mastered.size}</span>
        </div>
        <div style="font-size:17px;font-weight:700;color:#1e293b;background:white;padding:6px 20px;border-radius:20px;box-shadow:0 1px 4px rgba(0,0,0,.06)">
          <span id="cw-cur">1</span> / <span id="cw-total">${SESSION_SIZE}</span>
        </div>
        <div style="background:#fee2e2;color:#dc2626;font-size:13px;font-weight:700;padding:6px 16px;border-radius:20px">
          📖 Chưa thuộc: <span id="cw-left">${WORDS.length - mastered.size}</span>
        </div>
      </div>

      <!-- Dynamic content area -->
      <div id="cw-body" style="width:100%;max-width:380px;display:flex;flex-direction:column;align-items:center"></div>

    </div>`

  document.getElementById('cw-srs').addEventListener('change', e => {
    srsMode = e.target.checked
    startTab()
  })

  window.cwTab = (t) => {
    tab = t
    document.querySelectorAll('.cw-tab').forEach(b => b.classList.remove('active'))
    const el = document.getElementById('tab-' + t)
    if (el) el.classList.add('active')
    startTab()
  }

  function updateProgress(i, total) {
    document.getElementById('cw-mastered').textContent = mastered.size
    document.getElementById('cw-cur').textContent = i + 1
    document.getElementById('cw-total').textContent = total
    document.getElementById('cw-left').textContent = WORDS.length - mastered.size
  }

  // ── TAB: Học thẻ (Flashcard) ──────────────────────────────────────────────
  function startFlash() {
    const words = buildSession()
    let idx = 0, flipped = false

    function show() {
      flipped = false
      const w = words[idx]
      updateProgress(idx, words.length)
      document.getElementById('cw-body').innerHTML = `
        <div id="fc-card" onclick="fcFlip()"
          style="width:320px;height:220px;background:white;border-radius:20px;
            box-shadow:0 4px 20px rgba(0,0,0,.1);cursor:pointer;
            display:flex;flex-direction:column;align-items:center;justify-content:center;
            margin-bottom:20px;user-select:none;transition:.2s">
          <div style="font-size:80px;line-height:1;color:#1e293b">${w.char}</div>
          <div style="font-size:12px;color:#94a3b8;margin-top:12px">Bấm để xem nghĩa</div>
        </div>
        <div id="fc-btns" style="display:none;flex-direction:column;align-items:center;gap:10px;width:100%">
          <div style="display:flex;gap:10px;width:100%">
            <button class="cw-btn" onclick="fcAnswer(false)"
              style="flex:1;background:#fee2e2;border-color:#fca5a5;color:#dc2626;font-weight:700">
              ✗ Chưa biết
            </button>
            <button class="cw-btn" onclick="fcAnswer(true)"
              style="flex:1;background:#dcfce7;border-color:#86efac;color:#15803d;font-weight:700">
              ✓ Đã biết
            </button>
          </div>
        </div>`
    }

    window.fcFlip = () => {
      if (flipped) return
      flipped = true
      const w = words[idx]
      document.getElementById('fc-card').innerHTML = `
        <div style="font-size:56px;line-height:1;color:#1e293b">${w.char}</div>
        <div style="font-size:28px;color:#f97316;font-weight:700;margin-top:8px">${w.pinyin}</div>
        <div style="font-size:18px;color:#475569;margin-top:4px">${w.vi}</div>`
      document.getElementById('fc-btns').style.display = 'flex'
    }

    window.fcAnswer = (knew) => {
      if (knew) { mastered.add(words[idx].char); save() }
      updateProgress(idx, words.length)
      if (idx + 1 < words.length) { idx++; show() }
      else {
        document.getElementById('cw-body').innerHTML = doneHTML(() => startFlash())
        updateProgress(words.length - 1, words.length)
      }
    }

    show()
  }

  // ── TAB: Luyện viết (Hanzi-writer) ────────────────────────────────────────
  async function startWrite() {
    if (!window.HanziWriter) {
      document.getElementById('cw-body').innerHTML =
        `<div style="color:#94a3b8;font-size:14px">Đang tải...</div>`
      await new Promise((res, rej) => {
        const s = document.createElement('script')
        s.src = HANZI_CDN; s.onload = res; s.onerror = rej
        document.head.appendChild(s)
      })
    }

    const words = buildSession()
    let idx = 0, mistakes = 0, done = false

    function show(i) {
      idx = i; mistakes = 0; done = false
      const w = words[i]
      updateProgress(i, words.length)
      document.getElementById('cw-body').innerHTML = `
        <div style="font-size:34px;font-weight:700;color:#f97316;letter-spacing:3px;margin-bottom:2px">${w.pinyin}</div>
        <div style="font-size:14px;color:#64748b;margin-bottom:16px">${w.vi}</div>
        <div style="background:white;border-radius:20px;padding:20px;box-shadow:0 2px 16px rgba(0,0,0,.08);margin-bottom:12px">
          <div id="cw-canvas"></div>
        </div>
        <p id="cw-hint" style="color:#94a3b8;font-size:13px;margin:0 0 16px;text-align:center">
          Viết theo thứ tự nét. Viết đúng sẽ đổi màu xanh.
        </p>
        <div style="display:flex;gap:12px">
          <button class="cw-btn" onclick="cwReset()">Làm lại</button>
          <button class="cw-btn" onclick="cwFree()">Tự do (không kiểm tra)</button>
        </div>`

      try {
        writer = HanziWriter.create('cw-canvas', w.char, {
          width: 300, height: 300, padding: 5,
          showOutline: true,
          strokeColor: '#2563eb', outlineColor: '#d1d5db',
          drawingColor: '#2563eb', drawingWidth: 4,
          showHintAfterMisses: 3, highlightOnComplete: true,
        })
        writer.quiz({
          onMistake: () => { mistakes++ },
          onComplete: () => {
            if (done) return; done = true
            if (mistakes === 0) { mastered.add(w.char); save() }
            const hint = document.getElementById('cw-hint')
            if (hint) hint.textContent = mistakes === 0 ? '✅ Hoàn hảo!' : `Xong! ${mistakes} lỗi.`
            updateProgress(i, words.length)
            setTimeout(() => {
              if (i + 1 < words.length) show(i + 1)
              else { document.getElementById('cw-body').innerHTML = doneHTML(() => startWrite()); updateProgress(words.length - 1, words.length) }
            }, 1200)
          }
        })
      } catch { document.getElementById('cw-hint').textContent = 'Không có dữ liệu nét cho chữ này.' }
    }

    window.cwReset = () => show(idx)
    window.cwFree  = () => { if (writer) { writer.animateCharacter(); document.getElementById('cw-hint').textContent = 'Đang hiện thứ tự nét...' } }

    show(0)
  }

  // ── TAB: Luyện tập (Multiple choice quiz) ─────────────────────────────────
  function startQuiz() {
    const words = buildSession()
    let idx = 0, answered = false

    function makeOptions(w) {
      const wrong = WORDS.filter(x => x.char !== w.char)
        .sort(() => Math.random() - 0.5).slice(0, 3)
      return [...wrong, w].sort(() => Math.random() - 0.5)
    }

    function show(i) {
      idx = i; answered = false
      const w = words[i]
      const opts = makeOptions(w)
      updateProgress(i, words.length)
      document.getElementById('cw-body').innerHTML = `
        <div style="background:white;border-radius:20px;padding:28px 24px;box-shadow:0 2px 16px rgba(0,0,0,.08);
          width:100%;text-align:center;margin-bottom:20px">
          <div style="font-size:80px;line-height:1;margin-bottom:8px">${w.char}</div>
          <div style="font-size:24px;color:#f97316;font-weight:700">${w.pinyin}</div>
          <div style="font-size:13px;color:#94a3b8;margin-top:6px">Chọn nghĩa đúng</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:10px;width:100%">
          ${opts.map((o, oi) => `
            <button class="cw-opt" id="opt-${oi}" onclick="qzPick(${oi}, '${o.char}', '${w.char}')">
              ${o.vi}
            </button>`).join('')}
        </div>`
    }

    window.qzPick = (oi, picked, correct) => {
      if (answered) return; answered = true
      const isCorrect = picked === correct
      if (isCorrect) { mastered.add(words[idx].char); save() }
      document.querySelectorAll('.cw-opt').forEach((btn, i) => {
        btn.disabled = true
        const char = btn.textContent.trim()
        // find which option this button is by re-matching
      })
      document.getElementById('opt-' + oi).classList.add(isCorrect ? 'correct' : 'wrong')
      // highlight correct answer if wrong
      if (!isCorrect) {
        document.querySelectorAll('.cw-opt').forEach(btn => {
          const w = WORDS.find(x => x.vi === btn.textContent.trim())
          if (w && w.char === correct) btn.classList.add('correct')
        })
      }
      updateProgress(idx, words.length)
      setTimeout(() => {
        if (idx + 1 < words.length) show(idx + 1)
        else { document.getElementById('cw-body').innerHTML = doneHTML(() => startQuiz()); updateProgress(words.length - 1, words.length) }
      }, isCorrect ? 700 : 1400)
    }

    show(0)
  }

  // ── Shared done screen ─────────────────────────────────────────────────────
  function doneHTML(restart) {
    window._cwRestart = restart
    return `
      <div style="display:flex;flex-direction:column;align-items:center;gap:16px;padding:40px 0">
        <div style="font-size:56px">🎉</div>
        <div style="font-size:16px;font-weight:700;color:#1e293b">Xong buổi luyện!</div>
        <button onclick="window._cwRestart()"
          style="padding:10px 28px;border:none;border-radius:10px;background:#2563eb;color:white;font-size:14px;cursor:pointer;font-weight:600">
          Buổi mới
        </button>
      </div>`
  }

  // ── Start ──────────────────────────────────────────────────────────────────
  function startTab() {
    if (tab === 'flash') startFlash()
    else if (tab === 'write') startWrite()
    else if (tab === 'quiz') startQuiz()
  }

  startTab()
}
