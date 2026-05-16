const IMG = 'https://trehfvxlqfshfhcapqca.supabase.co/storage/v1/object/public/image/vocab_image/humanbody.png'

// 48 words — x/y calibrated to the numbered circles in humanbody.png
const WORDS = [
  // A – The Body  (side-view man, left ~33% of image)
  { num:1,  en:'face',          vi:'khuôn mặt',         s:'A', x:25,   y:12  },
  { num:2,  en:'mouth',         vi:'miệng',             s:'A', x:10,   y:11  },
  { num:3,  en:'chin',          vi:'cằm',               s:'A', x:11,   y:13  },
  { num:4,  en:'neck',          vi:'cổ',                s:'A', x:14,   y:17  },
  { num:5,  en:'shoulder',      vi:'vai',               s:'A', x:17,   y:21  },
  { num:6,  en:'arm',           vi:'cánh tay',          s:'A', x:6,    y:33  },
  { num:7,  en:'upper arm',     vi:'cánh tay trên',     s:'A', x:10,   y:26  },
  { num:8,  en:'elbow',         vi:'khuỷu tay',         s:'A', x:9,    y:36  },
  { num:9,  en:'forearm',       vi:'cẳng tay',          s:'A', x:10,   y:44  },
  { num:10, en:'armpit',        vi:'nách',              s:'A', x:17,   y:27  },
  { num:11, en:'back',          vi:'lưng',              s:'A', x:21,   y:35  },
  { num:12, en:'chest',         vi:'ngực',              s:'A', x:16,   y:28  },
  { num:13, en:'waist',         vi:'eo',                s:'A', x:20,   y:47  },
  { num:14, en:'abdomen',       vi:'bụng',              s:'A', x:17,   y:52  },
  { num:15, en:'buttocks',      vi:'mông',              s:'A', x:20,   y:62  },
  { num:16, en:'hip',           vi:'hông',              s:'A', x:21,   y:57  },
  { num:17, en:'leg',           vi:'chân',              s:'A', x:25,   y:73  },
  { num:18, en:'thigh',         vi:'đùi',               s:'A', x:17,   y:66  },
  { num:19, en:'knee',          vi:'đầu gối',           s:'A', x:16,   y:75  },
  { num:20, en:'calf',          vi:'bắp chân',          s:'A', x:16,   y:84  },
  // B – The Hand  (back-of-hand x:33-57% · palm x:57-97%, top half)
  { num:21, en:'wrist',         vi:'cổ tay',            s:'B', x:36,   y:39  },
  { num:22, en:'knuckle',       vi:'đốt ngón tay',      s:'B', x:43,   y:25  },
  { num:23, en:'fingernail',    vi:'móng tay',          s:'B', x:47,   y:9   },
  { num:24, en:'thumb',         vi:'ngón cái',          s:'B', x:63,   y:18  },
  { num:25, en:'index finger',  vi:'ngón trỏ',          s:'B', x:67,   y:10  },
  { num:26, en:'middle finger', vi:'ngón giữa',         s:'B', x:71,   y:7   },
  { num:27, en:'ring finger',   vi:'ngón đeo nhẫn',     s:'B', x:73,   y:10  },
  { num:28, en:'little finger', vi:'ngón út',           s:'B', x:79,   y:17  },
  { num:29, en:'palm',          vi:'lòng bàn tay',      s:'B', x:77,   y:33  },
  // C – The Head  (face close-up, lower center x:27-67%)
  { num:30, en:'hair',          vi:'tóc',               s:'C', x:38,   y:49  },
  { num:31, en:'part',          vi:'ngôi tóc',          s:'C', x:35,   y:53  },
  { num:32, en:'forehead',      vi:'trán',              s:'C', x:47,   y:55  },
  { num:33, en:'sideburn',      vi:'tóc mai',           s:'C', x:32,   y:62  },
  { num:34, en:'ear',           vi:'tai',               s:'C', x:29,   y:68  },
  { num:35, en:'cheek',         vi:'má',                s:'C', x:41,   y:72  },
  { num:36, en:'nose',          vi:'mũi',               s:'C', x:46,   y:67  },
  { num:37, en:'nostril',       vi:'lỗ mũi',            s:'C', x:50,   y:72  },
  { num:38, en:'jaw',           vi:'hàm',               s:'C', x:32,   y:82  },
  { num:39, en:'beard',         vi:'râu cằm',           s:'C', x:42,   y:85  },
  { num:40, en:'mustache',      vi:'râu mép',           s:'C', x:45,   y:79  },
  { num:41, en:'tongue',        vi:'lưỡi',              s:'C', x:47,   y:85  },
  { num:42, en:'tooth',         vi:'răng',              s:'C', x:49,   y:87  },
  { num:43, en:'lip',           vi:'môi',               s:'C', x:55,   y:80  },
  // D – The Eye  (close-up circle, lower right x:68-97%)
  { num:44, en:'eyebrow',       vi:'lông mày',          s:'D', x:74,   y:59  },
  { num:45, en:'eyelid',        vi:'mí mắt',            s:'D', x:83,   y:62  },
  { num:46, en:'eyelashes',     vi:'lông mi',           s:'D', x:72,   y:70  },
  { num:47, en:'iris',          vi:'mống mắt',          s:'D', x:77,   y:68  },
  { num:48, en:'pupil',         vi:'con ngươi',         s:'D', x:80,   y:69  },
]

const SECTIONS = {
  A: { label: 'A. The Body', color: '#2563eb', bg: '#dbeafe' },
  B: { label: 'B. The Hand', color: '#16a34a', bg: '#dcfce7' },
  C: { label: 'C. The Head', color: '#d97706', bg: '#fef3c7' },
  D: { label: 'D. The Eye',  color: '#7c3aed', bg: '#f5f3ff' },
}

export default function vocabBodyPage(app) {
  let activeSection = 'All'
  let hovered = null

  // ── Speak ──────────────────────────────────────────────────────────────────
  function speak(text) {
    speechSynthesis.cancel()
    const doSpeak = () => {
      const utt = new SpeechSynthesisUtterance(text)
      utt.lang = 'en-US'
      utt.rate = 0.82
      const voices = speechSynthesis.getVoices()
      utt.voice =
        voices.find(v => v.name === 'Google US English') ||
        voices.find(v => v.name.includes('Google') && v.lang.startsWith('en')) ||
        voices.find(v => v.lang === 'en-US' && v.localService === false) ||
        voices.find(v => v.lang === 'en-US') || null
      speechSynthesis.speak(utt)
    }
    const voices = speechSynthesis.getVoices()
    if (voices.length) doSpeak()
    else speechSynthesis.onvoiceschanged = doSpeak
  }

  // ── Filter ─────────────────────────────────────────────────────────────────
  window.vocabFilter = (sec) => {
    activeSection = sec
    document.querySelectorAll('.vf-pill').forEach(p => {
      p.style.background = p.dataset.sec === sec ? '#2563eb' : '#1e293b'
      p.style.color      = p.dataset.sec === sec ? 'white'   : '#94a3b8'
    })
    document.querySelectorAll('.voc-dot').forEach(el => {
      const s = el.dataset.s
      el.style.opacity = (sec === 'All' || s === sec) ? '1' : '0.15'
      el.style.pointerEvents = (sec === 'All' || s === sec) ? 'auto' : 'none'
    })
    document.querySelectorAll('.voc-word-row').forEach(el => {
      el.style.display = (sec === 'All' || el.dataset.s === sec) ? '' : 'none'
    })
  }

  // ── Hover ──────────────────────────────────────────────────────────────────
  window.vocabHover = (num) => {
    hovered = num
    const word = WORDS.find(w => w.num === num)
    if (!word) return

    document.querySelectorAll('.voc-dot').forEach(el =>
      el.classList.toggle('voc-dot-active', +el.dataset.num === num))
    document.querySelectorAll('.voc-word-row').forEach(el =>
      el.classList.toggle('voc-word-active', +el.dataset.num === num))
    document.querySelector(`.voc-word-row[data-num="${num}"]`)
      ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })

    const sc = SECTIONS[word.s]
    document.getElementById('voc-detail').innerHTML = `
      <div style="margin-bottom:8px">
        <span style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;
          background:${sc.bg};color:${sc.color}">${sc.label}</span>
      </div>
      <div style="font-size:38px;font-weight:800;color:#f1f5f9;line-height:1.1;margin-bottom:6px">${word.en}</div>
      <div style="font-size:19px;color:#93c5fd;margin-bottom:14px">${word.vi}</div>
      <button onclick="vocabSpeak(${num})"
        style="padding:8px 20px;border-radius:8px;border:none;cursor:pointer;
          background:#2563eb;color:white;font-size:13px;font-weight:600">
        🔊 Phát âm
      </button>`
  }

  window.vocabLeave = () => {
    hovered = null
    document.querySelectorAll('.voc-dot').forEach(el => el.classList.remove('voc-dot-active'))
    document.querySelectorAll('.voc-word-row').forEach(el => el.classList.remove('voc-word-active'))
    document.getElementById('voc-detail').innerHTML =
      `<div style="color:#475569;font-size:13px;text-align:center;padding-top:20px">
        Rê chuột vào ảnh hoặc từ để xem
      </div>`
  }

  window.vocabSpeak = (num) => {
    const word = WORDS.find(w => w.num === num)
    if (word) speak(word.en)
  }

  // ── Word list ──────────────────────────────────────────────────────────────
  function buildWordList() {
    return Object.entries(SECTIONS).map(([sec, info]) => `
      <div style="margin-bottom:16px">
        <div style="font-size:11px;font-weight:700;color:${info.color};letter-spacing:.8px;margin-bottom:6px;padding:0 4px">
          ${info.label}
        </div>
        ${WORDS.filter(w => w.s === sec).map(w => `
          <div class="voc-word-row" data-num="${w.num}" data-s="${w.s}"
            onmouseenter="vocabHover(${w.num})" onmouseleave="vocabLeave()"
            onclick="vocabSpeak(${w.num})"
            style="display:flex;align-items:center;gap:8px;padding:5px 8px;border-radius:7px;
              cursor:pointer;transition:.12s;margin-bottom:1px">
            <span style="font-size:10px;font-weight:700;color:${info.color};
              min-width:22px;text-align:right">${w.num}.</span>
            <span style="font-size:13px;color:#cbd5e1;font-weight:500">${w.en}</span>
            <span style="font-size:11px;color:#64748b;margin-left:auto">${w.vi}</span>
          </div>`).join('')}
      </div>`).join('')
  }

  // ── Hotspots ───────────────────────────────────────────────────────────────
  function buildDots() {
    return WORDS.map(w => {
      const sc = SECTIONS[w.s]
      return `
        <div class="voc-dot" data-num="${w.num}" data-s="${w.s}"
          onmouseenter="vocabHover(${w.num})" onmouseleave="vocabLeave()"
          onclick="vocabSpeak(${w.num})"
          style="position:absolute;left:${w.x}%;top:${w.y}%;transform:translate(-50%,-50%);
            width:22px;height:22px;border-radius:50%;border:2px solid white;
            background:${sc.color};color:white;font-size:8px;font-weight:700;
            display:flex;align-items:center;justify-content:center;
            cursor:pointer;transition:.15s;z-index:10;
            box-shadow:0 1px 4px rgba(0,0,0,.5)">
          ${w.num}
        </div>`
    }).join('')
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const filters = ['All', 'A', 'B', 'C', 'D']
  const filterLabels = { All: 'Tất cả', A: 'Body', B: 'Hand', C: 'Head', D: 'Eye' }

  app.innerHTML = `
    <style>
      .voc-dot:hover, .voc-dot-active {
        transform: translate(-50%,-50%) scale(1.4) !important;
        box-shadow: 0 0 0 4px rgba(255,255,255,.5), 0 2px 8px rgba(0,0,0,.6) !important;
        z-index: 20 !important;
      }
      .voc-word-row:hover { background: #1e293b !important; }
      .voc-word-active { background: #1d3461 !important; }
      .voc-word-active span { color: #f1f5f9 !important; }
    </style>

    <div style="min-height:100vh;background:#0f172a;display:flex;flex-direction:column">

      <!-- Header -->
      <div style="background:#1e293b;border-bottom:1px solid #334155;padding:14px 24px;
        display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
        <div>
          <h1 style="font-size:18px;font-weight:800;color:#f1f5f9;margin:0;font-family:'Space Grotesk',sans-serif">
            🫁 Human Body — Vocabulary
          </h1>
          <p style="margin:2px 0 0;font-size:12px;color:#64748b">Rê chuột vào hình để nghe và xem từ vựng</p>
        </div>
        <div style="display:flex;gap:6px">
          ${filters.map(f => `
            <button class="vf-pill" data-sec="${f}" onclick="vocabFilter('${f}')"
              style="padding:6px 14px;border-radius:20px;border:none;cursor:pointer;font-size:12px;font-weight:600;
                transition:.12s;background:${f==='All'?'#2563eb':'#1e293b'};
                color:${f==='All'?'white':'#94a3b8'}">
              ${filterLabels[f]}
            </button>`).join('')}
        </div>
      </div>

      <!-- Body -->
      <div style="display:flex;flex:1;min-height:0;overflow:hidden">

        <!-- Image with hotspots -->
        <div style="flex:1;overflow-y:auto;padding:20px;display:flex;align-items:flex-start;justify-content:center">
          <div style="position:relative;max-width:980px;width:100%">
            <img src="${IMG}" style="width:100%;display:block;border-radius:12px;
              box-shadow:0 8px 32px rgba(0,0,0,.4)" draggable="false">
            ${buildDots()}
          </div>
        </div>

        <!-- Right panel -->
        <div style="width:260px;min-width:260px;background:#1e293b;border-left:1px solid #334155;
          display:flex;flex-direction:column;overflow:hidden">

          <div id="voc-detail"
            style="padding:20px 16px;border-bottom:1px solid #334155;min-height:130px;flex-shrink:0">
            <div style="color:#475569;font-size:13px;text-align:center;padding-top:20px">
              Rê chuột vào ảnh hoặc từ để xem
            </div>
          </div>

          <div style="flex:1;overflow-y:auto;padding:12px 10px">
            ${buildWordList()}
          </div>
        </div>

      </div>
    </div>`
}
