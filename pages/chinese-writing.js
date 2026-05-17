const HANZI_CDN = 'https://cdn.jsdelivr.net/npm/hanzi-writer@3.5/dist/hanzi-writer.min.js'

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
  { char:'米', pinyin:'mǐ',    vi:'gạo, mét' },
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
  { char:'目', pinyin:'mù',    vi:'mắt' },
  { char:'耳', pinyin:'ěr',    vi:'tai' },
  { char:'山', pinyin:'shān',  vi:'núi' },
  { char:'水', pinyin:'shuǐ',  vi:'nước' },
  { char:'火', pinyin:'huǒ',   vi:'lửa' },
  { char:'木', pinyin:'mù',    vi:'gỗ, cây' },
  { char:'土', pinyin:'tǔ',    vi:'đất' },
  { char:'金', pinyin:'jīn',   vi:'vàng, kim loại' },
  { char:'月', pinyin:'yuè',   vi:'mặt trăng, tháng' },
  { char:'日', pinyin:'rì',    vi:'mặt trời, ngày' },
]

const SESSION_SIZE = 10
const KEY = 'cw_mastered_v1'

export default async function chineseWritingPage(app) {
  if (!window.HanziWriter) {
    await new Promise((res, rej) => {
      const s = document.createElement('script')
      s.src = HANZI_CDN
      s.onload = res; s.onerror = rej
      document.head.appendChild(s)
    })
  }

  const mastered = new Set(JSON.parse(localStorage.getItem(KEY) || '[]'))
  let srsMode = false
  let sessionWords = buildSession()
  let idx = 0
  let writer = null
  let mistakes = 0
  let done = false

  function buildSession() {
    const pool = srsMode ? WORDS.filter(w => !mastered.has(w.char)) : WORDS
    const unmastered = pool.filter(w => !mastered.has(w.char))
    return (unmastered.length > 0 ? unmastered : pool).slice(0, SESSION_SIZE)
  }

  function save() { localStorage.setItem(KEY, JSON.stringify([...mastered])) }

  app.innerHTML = `
    <style>
      .cw-tab { padding:8px 20px;border-radius:20px;border:2px solid #e5e7eb;cursor:pointer;font-size:14px;font-weight:600;background:white;color:#6b7280;transition:.12s }
      .cw-tab.active { border-color:#1e293b;color:#1e293b }
      .cw-tab.orange { color:#f97316;border-color:#fed7aa }
      .cw-tab.pink   { color:#f43f5e;border-color:#fecdd3 }
      .cw-btn { padding:10px 28px;border:1.5px solid #d1d5db;border-radius:10px;background:white;cursor:pointer;font-size:14px;font-weight:500;color:#374151;transition:.12s }
      .cw-btn:hover { border-color:#94a3b8;background:#f8fafc }
    </style>

    <div style="min-height:100vh;background:#fdf8f0;display:flex;flex-direction:column;align-items:center;padding:28px 16px">

      <!-- Tabs -->
      <div style="display:flex;gap:8px;margin-bottom:28px">
        <button class="cw-tab">Học thẻ</button>
        <button class="cw-tab active">Luyện viết</button>
        <button class="cw-tab orange">Luyện tập</button>
        <button class="cw-tab pink">Sổ tay ❤</button>
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
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px;flex-wrap:wrap;justify-content:center">
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

      <!-- Pinyin + meaning -->
      <div id="cw-pinyin" style="font-size:34px;font-weight:700;color:#f97316;letter-spacing:3px;margin-bottom:2px"></div>
      <div id="cw-meaning" style="font-size:14px;color:#64748b;margin-bottom:16px;min-height:20px"></div>

      <!-- Canvas -->
      <div style="background:white;border-radius:20px;padding:20px;box-shadow:0 2px 16px rgba(0,0,0,.08);margin-bottom:12px">
        <div id="cw-canvas"></div>
      </div>

      <p id="cw-hint" style="color:#94a3b8;font-size:13px;margin:0 0 16px;text-align:center;min-height:20px">
        Viết theo thứ tự nét. Viết đúng sẽ đổi màu xanh.
      </p>

      <!-- Buttons -->
      <div style="display:flex;gap:12px">
        <button class="cw-btn" onclick="cwReset()">Làm lại</button>
        <button class="cw-btn" onclick="cwFree()">Tự do (không kiểm tra)</button>
      </div>
    </div>`

  document.getElementById('cw-srs').addEventListener('change', e => {
    srsMode = e.target.checked
    sessionWords = buildSession()
    initWord(0)
  })

  function updateProgress() {
    document.getElementById('cw-mastered').textContent = mastered.size
    document.getElementById('cw-cur').textContent = idx + 1
    document.getElementById('cw-total').textContent = sessionWords.length
    document.getElementById('cw-left').textContent = WORDS.length - mastered.size
  }

  function initWord(i) {
    if (!sessionWords[i]) return
    idx = i; mistakes = 0; done = false
    const w = sessionWords[i]
    document.getElementById('cw-pinyin').textContent = w.pinyin
    document.getElementById('cw-meaning').textContent = w.vi
    document.getElementById('cw-hint').textContent = 'Viết theo thứ tự nét. Viết đúng sẽ đổi màu xanh.'
    updateProgress()

    document.getElementById('cw-canvas').innerHTML = ''
    try {
      writer = HanziWriter.create('cw-canvas', w.char, {
        width: 300, height: 300, padding: 5,
        showOutline: true,
        strokeColor: '#2563eb',
        outlineColor: '#d1d5db',
        drawingColor: '#2563eb',
        drawingWidth: 4,
        showHintAfterMisses: 3,
        highlightOnComplete: true,
      })
      writer.quiz({
        onMistake: () => { mistakes++ },
        onComplete: () => {
          if (done) return
          done = true
          if (mistakes === 0) {
            mastered.add(w.char); save()
            document.getElementById('cw-hint').textContent = '✅ Hoàn hảo! Tiếp theo...'
          } else {
            document.getElementById('cw-hint').textContent = `Xong! ${mistakes} lỗi. Tiếp theo...`
          }
          updateProgress()
          setTimeout(() => {
            if (idx + 1 < sessionWords.length) initWord(idx + 1)
            else showDone()
          }, 1200)
        }
      })
    } catch {
      document.getElementById('cw-hint').textContent = 'Không có dữ liệu nét. Bấm Làm lại.'
    }
  }

  function showDone() {
    document.getElementById('cw-canvas').innerHTML = `
      <div style="width:300px;height:300px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px">
        <div style="font-size:56px">🎉</div>
        <div style="font-size:16px;font-weight:700;color:#1e293b">Xong buổi luyện!</div>
        <button onclick="cwNew()" style="padding:10px 28px;border:none;border-radius:10px;background:#2563eb;color:white;font-size:14px;cursor:pointer;font-weight:600">Buổi mới</button>
      </div>`
    document.getElementById('cw-pinyin').textContent = ''
    document.getElementById('cw-meaning').textContent = ''
    document.getElementById('cw-hint').textContent = ''
    updateProgress()
  }

  window.cwReset = () => initWord(idx)

  window.cwFree = () => {
    if (!writer) return
    writer.animateCharacter()
    document.getElementById('cw-hint').textContent = 'Đang hiện thứ tự nét...'
  }

  window.cwNew = () => {
    sessionWords = buildSession()
    initWord(0)
  }

  initWord(0)
}
