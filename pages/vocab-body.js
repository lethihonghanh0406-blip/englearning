const IMG = 'https://trehfvxlqfshfhcapqca.supabase.co/storage/v1/object/public/image/vocab_image/body.png'

const WORDS = [
  // A – Front Body (front figure left side + face inset upper-left)
  { num:1,  en:'head',          vi:'đầu',              s:'A', x:24,   y:7   },
  { num:2,  en:'face',          vi:'khuôn mặt',        s:'A', x:4.5,  y:8   },
  { num:3,  en:'neck',          vi:'cổ',               s:'A', x:24,   y:16  },
  { num:4,  en:'shoulder',      vi:'vai',              s:'A', x:20,   y:21  },
  { num:5,  en:'chest',         vi:'ngực',             s:'A', x:37,   y:29  },
  { num:6,  en:'armpit',        vi:'nách',             s:'A', x:36,   y:24  },
  { num:7,  en:'upper arm',     vi:'cánh tay trên',    s:'A', x:37,   y:17  },
  { num:8,  en:'arm',           vi:'cánh tay',         s:'A', x:8,    y:36  },
  { num:9,  en:'elbow',         vi:'khuỷu tay',        s:'A', x:11,   y:43  },
  { num:10, en:'forearm',       vi:'cẳng tay',         s:'A', x:8,    y:49  },
  { num:11, en:'waist',         vi:'eo',               s:'A', x:25,   y:44  },
  { num:12, en:'abdomen',       vi:'bụng',             s:'A', x:39,   y:44  },
  { num:13, en:'navel',         vi:'rốn',              s:'A', x:36,   y:49  },
  { num:14, en:'hip',           vi:'hông',             s:'A', x:26,   y:53  },
  { num:15, en:'groin',         vi:'háng',             s:'A', x:35,   y:54  },
  { num:16, en:'thigh',         vi:'đùi',              s:'A', x:23,   y:62  },
  { num:17, en:'knee',          vi:'đầu gối',          s:'A', x:12,   y:65  },
  { num:18, en:'shin',          vi:'ống chân',         s:'A', x:39,   y:68  },
  { num:19, en:'calf',          vi:'bắp chân',         s:'A', x:40,   y:76  },
  { num:20, en:'ankle',         vi:'mắt cá chân',      s:'A', x:23,   y:85  },
  { num:21, en:'foot',          vi:'bàn chân',         s:'A', x:23,   y:90  },
  // B – The Hand (middle section: x≈45-62%, y≈24-52%)
  { num:22, en:'thumb',         vi:'ngón cái',         s:'B', x:47,   y:38  },
  { num:23, en:'index finger',  vi:'ngón trỏ',         s:'B', x:50,   y:29  },
  { num:24, en:'middle finger', vi:'ngón giữa',        s:'B', x:53,   y:27  },
  { num:25, en:'ring finger',   vi:'ngón đeo nhẫn',    s:'B', x:56,   y:29  },
  { num:26, en:'little finger', vi:'ngón út',          s:'B', x:59,   y:33  },
  { num:27, en:'fingernail',    vi:'móng tay',         s:'B', x:52,   y:24  },
  { num:28, en:'knuckle',       vi:'đốt ngón tay',     s:'B', x:52,   y:40  },
  { num:29, en:'palm',          vi:'lòng bàn tay',     s:'B', x:53,   y:45  },
  { num:30, en:'wrist',         vi:'cổ tay',           s:'B', x:52,   y:52  },
  // C – The Foot (middle-lower section: x≈48-63%, y≈60-90%)
  { num:31, en:'ankle',         vi:'mắt cá chân',      s:'C', x:52,   y:63  },
  { num:32, en:'heel',          vi:'gót chân',         s:'C', x:58,   y:78  },
  { num:33, en:'instep',        vi:'mu bàn chân',      s:'C', x:53,   y:73  },
  { num:34, en:'sole',          vi:'lòng bàn chân',    s:'C', x:56,   y:83  },
  { num:35, en:'big toe',       vi:'ngón chân cái',    s:'C', x:50,   y:85  },
  { num:36, en:'toe',           vi:'ngón chân',        s:'C', x:53,   y:87  },
  { num:37, en:'toenail',       vi:'móng chân',        s:'C', x:52,   y:90  },
  // D – Back Body (right figure: x≈68-87%, callouts: x≈87-99%)
  { num:38, en:'back',          vi:'lưng',             s:'D', x:77,   y:30  },
  { num:39, en:'shoulder blade',vi:'xương bả vai',     s:'D', x:75,   y:22  },
  { num:40, en:'lower back',    vi:'lưng dưới',        s:'D', x:77,   y:44  },
  { num:41, en:'buttocks',      vi:'mông',             s:'D', x:90,   y:46  },
  { num:42, en:'hamstring',     vi:'gân kheo',         s:'D', x:77,   y:62  },
  { num:43, en:'back of knee',  vi:'khoeo chân',       s:'D', x:77,   y:70  },
  { num:44, en:'calf',          vi:'bắp chân',         s:'D', x:90,   y:74  },
  { num:45, en:'heel',          vi:'gót chân',         s:'D', x:90,   y:83  },
]

const SECTIONS = {
  A: { label: 'A. Front Body', color: '#2563eb', bg: '#dbeafe' },
  B: { label: 'B. The Hand',   color: '#16a34a', bg: '#dcfce7' },
  C: { label: 'C. The Foot',   color: '#d97706', bg: '#fef3c7' },
  D: { label: 'D. Back Body',  color: '#7c3aed', bg: '#f5f3ff' },
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
    else { speechSynthesis.onvoiceschanged = doSpeak }
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
      const s = el.dataset.s
      el.style.display = (sec === 'All' || s === sec) ? '' : 'none'
    })
  }

  // ── Hover ──────────────────────────────────────────────────────────────────
  window.vocabHover = (num) => {
    hovered = num
    const word = WORDS.find(w => w.num === num)
    if (!word) return

    // Hotspot
    document.querySelectorAll('.voc-dot').forEach(el =>
      el.classList.toggle('voc-dot-active', +el.dataset.num === num))

    // Word list
    document.querySelectorAll('.voc-word-row').forEach(el =>
      el.classList.toggle('voc-word-active', +el.dataset.num === num))
    document.querySelector(`.voc-word-row[data-num="${num}"]`)
      ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })

    // Detail card
    const sc = SECTIONS[word.s]
    document.getElementById('voc-detail').innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <span style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;
          background:${sc.bg};color:${sc.color}">${sc.label}</span>
      </div>
      <div style="font-size:42px;font-weight:800;color:#f1f5f9;line-height:1;margin-bottom:6px">${word.en}</div>
      <div style="font-size:20px;color:#93c5fd;margin-bottom:14px">${word.vi}</div>
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

  // ── Build word list by section ─────────────────────────────────────────────
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

  // ── Build hotspots ─────────────────────────────────────────────────────────
  function buildDots() {
    return WORDS.map(w => {
      const sc = SECTIONS[w.s]
      return `
        <div class="voc-dot" data-num="${w.num}" data-s="${w.s}"
          onmouseenter="vocabHover(${w.num})" onmouseleave="vocabLeave()"
          onclick="vocabSpeak(${w.num})"
          style="position:absolute;left:${w.x}%;top:${w.y}%;transform:translate(-50%,-50%);
            width:20px;height:20px;border-radius:50%;border:2px solid white;
            background:${sc.color};color:white;font-size:9px;font-weight:700;
            display:flex;align-items:center;justify-content:center;
            cursor:pointer;transition:.15s;z-index:10;
            box-shadow:0 1px 4px rgba(0,0,0,.4)">
          ${w.num}
        </div>`
    }).join('')
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const filters = ['All', 'A', 'B', 'C', 'D']
  const filterLabels = { All: 'Tất cả', A: 'Front Body', B: 'Hand', C: 'Foot', D: 'Back Body' }

  app.innerHTML = `
    <style>
      .voc-dot:hover, .voc-dot-active {
        transform: translate(-50%,-50%) scale(1.35) !important;
        box-shadow: 0 0 0 4px rgba(255,255,255,.4), 0 2px 8px rgba(0,0,0,.5) !important;
        z-index: 20 !important;
      }
      .voc-word-row:hover, .voc-word-active {
        background: #1e293b !important;
      }
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
          <div style="position:relative;max-width:860px;width:100%">
            <img src="${IMG}" style="width:100%;display:block;border-radius:12px;
              box-shadow:0 8px 32px rgba(0,0,0,.4)" draggable="false">
            ${buildDots()}
          </div>
        </div>

        <!-- Right: detail + word list -->
        <div style="width:260px;min-width:260px;background:#1e293b;border-left:1px solid #334155;
          display:flex;flex-direction:column;overflow:hidden">

          <!-- Active word card -->
          <div id="voc-detail"
            style="padding:20px 16px;border-bottom:1px solid #334155;min-height:130px;flex-shrink:0">
            <div style="color:#475569;font-size:13px;text-align:center;padding-top:20px">
              Rê chuột vào ảnh hoặc từ để xem
            </div>
          </div>

          <!-- Word list -->
          <div style="flex:1;overflow-y:auto;padding:12px 10px">
            ${buildWordList()}
          </div>
        </div>

      </div>
    </div>`
}
