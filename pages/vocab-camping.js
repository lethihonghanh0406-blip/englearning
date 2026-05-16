const IMG = 'https://trehfvxlqfshfhcapqca.supabase.co/storage/v1/object/public/image/vocab_image/camping.png'

const WORDS = [
  // A – Shelter
  { num:1,  en:'tent',         vi:'lều trại',       s:'A', x:7.2,  y:10.6 },
  { num:2,  en:'stake',        vi:'cọc lều',        s:'A', x:25.2, y:5.2  },
  { num:3,  en:'rope',         vi:'dây thừng',      s:'A', x:30.6, y:14.9 },
  { num:4,  en:'sleeping bag', vi:'túi ngủ',        s:'A', x:43.0, y:12.9 },
  { num:5,  en:'hammock',      vi:'võng',           s:'A', x:63.3, y:12.4 },
  { num:6,  en:'cabin',        vi:'nhà gỗ',         s:'A', x:88.1, y:11.5 },
  // B – Navigation
  { num:7,  en:'map',          vi:'bản đồ',         s:'B', x:8.5,  y:28.2 },
  { num:8,  en:'compass',      vi:'la bàn',         s:'B', x:27.7, y:31.1 },
  { num:9,  en:'directions',   vi:'hướng đi',       s:'B', x:42.4, y:38.9 },
  { num:10, en:'west',         vi:'hướng tây',      s:'B', x:29.9, y:38.6 },
  { num:11, en:'south',        vi:'hướng nam',      s:'B', x:33.6, y:36.1 },
  { num:12, en:'east',         vi:'hướng đông',     s:'B', x:35.4, y:29.6 },
  { num:13, en:'north',        vi:'hướng bắc',      s:'B', x:34.9, y:24.6 },
  // C – Fire & Light
  { num:14, en:'campfire',     vi:'lửa trại',       s:'C', x:55.0, y:32.7 },
  { num:15, en:'smoke',        vi:'khói',           s:'C', x:61.5, y:26.0 },
  { num:16, en:'spark',        vi:'tia lửa',        s:'C', x:57.5, y:29.5 },
  { num:17, en:'embers',       vi:'than hồng',      s:'C', x:56.0, y:37.5 },
  { num:18, en:'lantern',      vi:'đèn lồng',       s:'C', x:82.0, y:35.4 },
  { num:19, en:'flashlight',   vi:'đèn pin',        s:'C', x:74.5, y:25.1 },
  { num:20, en:'torch',        vi:'đuốc',           s:'C', x:86.3, y:27.3 },
  // D – Gear
  { num:21, en:'canteen',      vi:'bình nước',      s:'D', x:19.4, y:44.9 },
  { num:22, en:'binoculars',   vi:'ống nhòm',       s:'D', x:6.6,  y:42.0 },
  { num:23, en:'trail',        vi:'đường mòn',      s:'D', x:47.1, y:46.3 },
  { num:24, en:'backpack',     vi:'ba lô',          s:'D', x:7.4,  y:58.2 },
  { num:25, en:'ice cooler',   vi:'thùng đá',       s:'D', x:20.1, y:55.1 },
  { num:26, en:'thermos',      vi:'bình giữ nhiệt', s:'D', x:34.9, y:54.5 },
  // E – Fishing & Tools
  { num:27, en:'log',          vi:'khúc gỗ',        s:'E', x:68.6, y:54.4 },
  { num:28, en:'axe',          vi:'rìu',            s:'E', x:86.7, y:53.4 },
  { num:29, en:'hatchet',      vi:'búa rìu nhỏ',   s:'E', x:85.6, y:59.7 },
  { num:30, en:'stump',        vi:'gốc cây',        s:'E', x:52.2, y:55.3 },
  { num:31, en:'fishing pole', vi:'cần câu',        s:'E', x:16.5, y:70.1 },
  { num:32, en:'reel',         vi:'cuộn câu',       s:'E', x:14.7, y:77.7 },
  { num:33, en:'fishing line', vi:'dây câu',        s:'E', x:24.1, y:75.5 },
  { num:34, en:'bait',         vi:'mồi câu',        s:'E', x:54.0, y:77.3 },
  { num:35, en:'lure',         vi:'mồi giả',        s:'E', x:68.3, y:67.5 },
  { num:36, en:'hook',         vi:'lưỡi câu',       s:'E', x:36.5, y:77.3 },
  { num:37, en:'net',          vi:'lưới',           s:'E', x:83.5, y:73.3 },
]

const SECTIONS = {
  A: { label: 'A. Shelter',    color: '#2563eb', bg: '#dbeafe' },
  B: { label: 'B. Navigation', color: '#16a34a', bg: '#dcfce7' },
  C: { label: 'C. Fire',       color: '#dc2626', bg: '#fee2e2' },
  D: { label: 'D. Gear',       color: '#7c3aed', bg: '#f5f3ff' },
  E: { label: 'E. Outdoors',   color: '#92400e', bg: '#fef3c7' },
}

export default function vocabCampingPage(app) {
  let activeSection = 'All'

  function speak(text) {
    speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(text)
    utt.lang = 'en-US'; utt.rate = 0.85
    speechSynthesis.speak(utt)
  }

  window.campingFilter = (sec) => {
    activeSection = sec
    document.querySelectorAll('.vc-pill').forEach(p => {
      p.style.background = p.dataset.sec === sec ? '#2563eb' : '#1e293b'
      p.style.color      = p.dataset.sec === sec ? 'white'   : '#94a3b8'
    })
    document.querySelectorAll('.vc-dot').forEach(el => {
      const s = el.dataset.s
      el.style.opacity      = (sec === 'All' || s === sec) ? '1' : '0.15'
      el.style.pointerEvents = (sec === 'All' || s === sec) ? 'auto' : 'none'
    })
    document.querySelectorAll('.vc-word-row').forEach(el => {
      el.style.display = (sec === 'All' || el.dataset.s === sec) ? '' : 'none'
    })
  }

  window.campingHover = (num) => {
    const word = WORDS.find(w => w.num === num)
    if (!word) return
    document.querySelectorAll('.vc-dot').forEach(el =>
      el.classList.toggle('vc-dot-active', +el.dataset.num === num))
    document.querySelectorAll('.vc-word-row').forEach(el =>
      el.classList.toggle('vc-word-active', +el.dataset.num === num))
    document.querySelector(`.vc-word-row[data-num="${num}"]`)
      ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    const sc = SECTIONS[word.s]
    document.getElementById('vc-detail').innerHTML = `
      <div style="margin-bottom:8px">
        <span style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;
          background:${sc.bg};color:${sc.color}">${sc.label}</span>
      </div>
      <div style="font-size:42px;font-weight:800;color:#f1f5f9;line-height:1;margin-bottom:6px">${word.en}</div>
      <div style="font-size:20px;color:#93c5fd;margin-bottom:14px">${word.vi}</div>
      <button onclick="campingSpeak(${num})"
        style="padding:8px 20px;border-radius:8px;border:none;cursor:pointer;
          background:#2563eb;color:white;font-size:13px;font-weight:600">
        🔊 Phát âm
      </button>`
  }

  window.campingLeave = () => {
    document.querySelectorAll('.vc-dot').forEach(el => el.classList.remove('vc-dot-active'))
    document.querySelectorAll('.vc-word-row').forEach(el => el.classList.remove('vc-word-active'))
    document.getElementById('vc-detail').innerHTML =
      `<div style="color:#475569;font-size:13px;text-align:center;padding-top:20px">
        Rê chuột vào ảnh hoặc từ để xem
      </div>`
  }

  window.campingSpeak = (num) => {
    const word = WORDS.find(w => w.num === num)
    if (word) speak(word.en)
  }

  function buildWordList() {
    return Object.entries(SECTIONS).map(([sec, info]) => `
      <div style="margin-bottom:16px">
        <div style="font-size:11px;font-weight:700;color:${info.color};letter-spacing:.8px;margin-bottom:6px;padding:0 4px">
          ${info.label}
        </div>
        ${WORDS.filter(w => w.s === sec).map(w => `
          <div class="vc-word-row" data-num="${w.num}" data-s="${w.s}"
            onmouseenter="campingHover(${w.num})" onmouseleave="campingLeave()"
            onclick="campingSpeak(${w.num})"
            style="display:flex;align-items:center;gap:8px;padding:5px 8px;border-radius:7px;
              cursor:pointer;transition:.12s;margin-bottom:1px">
            <span style="font-size:10px;font-weight:700;color:${info.color};
              min-width:22px;text-align:right">${w.num}.</span>
            <span style="font-size:13px;color:#cbd5e1;font-weight:500">${w.en}</span>
            <span style="font-size:11px;color:#64748b;margin-left:auto">${w.vi}</span>
          </div>`).join('')}
      </div>`).join('')
  }

  function buildDots() {
    return WORDS.map(w => {
      const sc = SECTIONS[w.s]
      return `
        <div class="vc-dot" data-num="${w.num}" data-s="${w.s}"
          onmouseenter="campingHover(${w.num})" onmouseleave="campingLeave()"
          onclick="campingSpeak(${w.num})"
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

  const filters = ['All', 'A', 'B', 'C', 'D', 'E']
  const filterLabels = { All: 'Tất cả', A: 'Shelter', B: 'Navigation', C: 'Fire', D: 'Gear', E: 'Outdoors' }

  app.innerHTML = `
    <style>
      .vc-dot:hover, .vc-dot-active {
        transform: translate(-50%,-50%) scale(1.35) !important;
        box-shadow: 0 0 0 4px rgba(255,255,255,.4), 0 2px 8px rgba(0,0,0,.5) !important;
        z-index: 20 !important;
      }
      .vc-word-row:hover, .vc-word-active { background: #1e293b !important; }
      .vc-word-active { background: #1d3461 !important; }
      .vc-word-active span { color: #f1f5f9 !important; }
    </style>

    <div style="min-height:100vh;background:#0f172a;display:flex;flex-direction:column">

      <!-- Header -->
      <div style="background:#1e293b;border-bottom:1px solid #334155;padding:14px 24px;
        display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
        <div>
          <h1 style="font-size:18px;font-weight:800;color:#f1f5f9;margin:0;font-family:'Space Grotesk',sans-serif">
            🏕️ Camping — Vocabulary
          </h1>
          <p style="margin:2px 0 0;font-size:12px;color:#64748b">Rê chuột vào hình để nghe và xem từ vựng</p>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          ${filters.map(f => `
            <button class="vc-pill" data-sec="${f}" onclick="campingFilter('${f}')"
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
          <div style="position:relative;max-width:1100px;width:100%">
            <img src="${IMG}" style="width:100%;display:block;border-radius:12px;
              box-shadow:0 8px 32px rgba(0,0,0,.4)" draggable="false"
              onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
            <div style="display:none;width:100%;aspect-ratio:1000/798;background:#1e293b;border-radius:12px;
              align-items:center;justify-content:center;flex-direction:column;gap:12px;color:#64748b">
              <div style="font-size:48px">🏕️</div>
              <div style="font-size:14px">Không tải được ảnh — hãy upload ảnh lên Supabase</div>
            </div>
            ${buildDots()}
          </div>
        </div>

        <!-- Right panel -->
        <div style="width:260px;min-width:260px;background:#1e293b;border-left:1px solid #334155;
          display:flex;flex-direction:column;overflow:hidden">

          <div id="vc-detail"
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
