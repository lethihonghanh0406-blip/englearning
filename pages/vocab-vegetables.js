const IMG1 = 'https://trehfvxlqfshfhcapqca.supabase.co/storage/v1/object/public/image/vocab_image/vegetables.png'
const IMG2 = 'https://trehfvxlqfshfhcapqca.supabase.co/storage/v1/object/public/image/vocab_image/vegetables_2.png'

const WORDS = [
  // A – Leafy Greens
  { num:1,  en:'cauliflower',    ph:'/ˈkɒliflaʊər/',       vi:'súp lơ trắng',      s:'A' },
  { num:2,  en:'broccoli',       ph:'/ˈbrɒkəli/',           vi:'súp lơ xanh',       s:'A' },
  { num:3,  en:'cabbage',        ph:'/ˈkæbɪdʒ/',            vi:'bắp cải',           s:'A' },
  { num:4,  en:'brussels sprouts', ph:'/ˈbrʌsəlz spraʊts/', vi:'cải Brussels',      s:'A' },
  { num:5,  en:'watercress',     ph:'/ˈwɔːtərkrɛs/',        vi:'cải xoong',         s:'A' },
  { num:6,  en:'lettuce',        ph:'/ˈlɛtɪs/',             vi:'xà lách',           s:'A' },
  { num:7,  en:'escarole',       ph:'/ˈɛskərəʊl/',          vi:'xà lách lá xoăn',   s:'A' },
  { num:8,  en:'spinach',        ph:'/ˈspɪnɪtʃ/',           vi:'rau bina',          s:'A' },
  { num:9,  en:'herbs',          ph:'/hɜːrbz/',             vi:'rau thơm',          s:'A' },
  { num:10, en:'celery',         ph:'/ˈsɛləri/',            vi:'cần tây',           s:'A' },
  { num:11, en:'artichoke',      ph:'/ˈɑːrtɪtʃoʊk/',        vi:'atisô',             s:'A' },
  // B – Legumes & Corn
  { num:12, en:'corn',           ph:'/kɔːrn/',              vi:'ngô / bắp',         s:'B' },
  { num:13, en:'kidney beans',   ph:'/ˈkɪdni biːnz/',       vi:'đậu thận',          s:'B' },
  { num:14, en:'black beans',    ph:'/blæk biːnz/',         vi:'đậu đen',           s:'B' },
  { num:15, en:'string beans',   ph:'/strɪŋ biːnz/',        vi:'đậu que',           s:'B' },
  { num:16, en:'lima beans',     ph:'/ˈlaɪmə biːnz/',       vi:'đậu lima',          s:'B' },
  { num:17, en:'peas',           ph:'/piːz/',               vi:'đậu Hà Lan',        s:'B' },
  { num:18, en:'asparagus',      ph:'/əˈspærəɡəs/',         vi:'măng tây',          s:'B' },
  // C – Garden Vegetables
  { num:19, en:'tomatoes',       ph:'/təˈmeɪtoʊz/',         vi:'cà chua',           s:'C' },
  { num:20, en:'cucumbers',      ph:'/ˈkjuːkʌmbərz/',       vi:'dưa chuột',         s:'C' },
  { num:21, en:'eggplant',       ph:'/ˈɛɡplænt/',           vi:'cà tím',            s:'C' },
  { num:22, en:'peppers',        ph:'/ˈpɛpərz/',            vi:'ớt',                s:'C' },
  { num:23, en:'potatoes',       ph:'/pəˈteɪtoʊz/',         vi:'khoai tây',         s:'C' },
  { num:24, en:'yam',            ph:'/jæm/',                vi:'khoai lang',        s:'C' },
  { num:25, en:'garlic',         ph:'/ˈɡɑːrlɪk/',           vi:'tỏi',               s:'C' },
  { num:26, en:'pumpkin',        ph:'/ˈpʌmpkɪn/',           vi:'bí ngô',            s:'C' },
  { num:27, en:'zucchini',       ph:'/zuːˈkiːni/',          vi:'bí xanh',           s:'C' },
  { num:28, en:'acorn squash',   ph:'/ˈeɪkɔːrn skwɒʃ/',    vi:'bí đào',            s:'C' },
  // D – Root Vegetables
  { num:29, en:'radishes',       ph:'/ˈrædɪʃɪz/',           vi:'củ cải đỏ',         s:'D' },
  { num:30, en:'mushrooms',      ph:'/ˈmʌʃruːmz/',          vi:'nấm',               s:'D' },
  { num:31, en:'onions',         ph:'/ˈʌnjənz/',            vi:'hành tây',          s:'D' },
  { num:32, en:'carrots',        ph:'/ˈkærəts/',            vi:'cà rốt',            s:'D' },
  { num:33, en:'beets',          ph:'/biːts/',              vi:'củ dền',            s:'D' },
  { num:34, en:'turnip',         ph:'/ˈtɜːrnɪp/',           vi:'củ cải trắng',      s:'D' },
]

const SECTIONS = {
  A: { label: 'A. Leafy Greens',  color: '#16a34a', bg: '#dcfce7' },
  B: { label: 'B. Legumes',       color: '#d97706', bg: '#fef3c7' },
  C: { label: 'C. Garden Veg',    color: '#dc2626', bg: '#fee2e2' },
  D: { label: 'D. Root Veg',      color: '#7c3aed', bg: '#f5f3ff' },
}

export default function vocabVegetablesPage(app) {
  let activeSection = 'All'

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

  window.vegFilter = (sec) => {
    activeSection = sec
    document.querySelectorAll('.vg-pill').forEach(p => {
      p.style.background = p.dataset.sec === sec ? '#2563eb' : '#1e293b'
      p.style.color      = p.dataset.sec === sec ? 'white'   : '#94a3b8'
    })
    document.querySelectorAll('.vg-row').forEach(el => {
      el.style.display = (sec === 'All' || el.dataset.s === sec) ? '' : 'none'
    })
    document.querySelectorAll('.vg-section-head').forEach(el => {
      el.style.display = (sec === 'All' || el.dataset.s === sec) ? '' : 'none'
    })
    const img1 = document.getElementById('vg-img1')
    const img2 = document.getElementById('vg-img2')
    const isImg1 = sec === 'A' || sec === 'B'
    const isImg2 = sec === 'C' || sec === 'D'
    img1.style.display = (sec === 'All' || isImg1) ? 'block' : 'none'
    img2.style.display = (sec === 'All' || isImg2) ? 'block' : 'none'
  }

  window.vegSpeak = (num) => {
    const word = WORDS.find(w => w.num === num)
    if (word) speak(word.en)
  }

  function buildWordList() {
    return Object.entries(SECTIONS).map(([sec, info]) => `
      <div class="vg-section-head" data-s="${sec}"
        style="font-size:11px;font-weight:700;color:${info.color};letter-spacing:.8px;
          padding:10px 8px 4px;text-transform:uppercase">
        ${info.label}
      </div>
      ${WORDS.filter(w => w.s === sec).map(w => `
        <div class="vg-row" data-s="${w.s}"
          onclick="vegSpeak(${w.num})"
          style="display:flex;align-items:center;gap:10px;padding:7px 8px;border-radius:8px;
            cursor:pointer;transition:.12s;margin-bottom:2px">
          <span style="font-size:10px;font-weight:700;color:${info.color};
            min-width:22px;text-align:right;flex-shrink:0">${w.num}.</span>
          <div style="min-width:0;flex:1">
            <div style="font-size:13px;font-weight:600;color:#e2e8f0">${w.en}</div>
            <div style="font-size:11px;color:#64748b;font-family:monospace;margin-top:1px">${w.ph}</div>
            <div style="font-size:11px;color:#93c5fd;margin-top:1px">${w.vi}</div>
          </div>
          <span style="font-size:16px;color:#475569;flex-shrink:0">🔊</span>
        </div>`).join('')}
    `).join('')
  }

  const filters = ['All', 'A', 'B', 'C', 'D']
  const filterLabels = { All: 'Tất cả', A: 'Greens', B: 'Legumes', C: 'Garden', D: 'Root' }

  app.innerHTML = `
    <style>
      .vg-row:hover { background: #1e293b !important; }
      .vg-row:hover span:last-child { color: #2563eb !important; }
    </style>

    <div style="height:100vh;background:#0f172a;display:flex;flex-direction:column">

      <!-- Header -->
      <div style="background:#1e293b;border-bottom:1px solid #334155;padding:14px 24px;
        display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
        <div>
          <h1 style="font-size:18px;font-weight:800;color:#f1f5f9;margin:0;font-family:'Space Grotesk',sans-serif">
            🥦 Vegetables — Vocabulary
          </h1>
          <p style="margin:2px 0 0;font-size:12px;color:#64748b">Bấm vào từ để nghe phát âm</p>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          ${filters.map(f => `
            <button class="vg-pill" data-sec="${f}" onclick="vegFilter('${f}')"
              style="padding:6px 14px;border-radius:20px;border:none;cursor:pointer;font-size:12px;font-weight:600;
                transition:.12s;background:${f==='All'?'#2563eb':'#1e293b'};
                color:${f==='All'?'white':'#94a3b8'}">
              ${filterLabels[f]}
            </button>`).join('')}
        </div>
      </div>

      <!-- Body -->
      <div style="display:flex;flex:1;min-height:0;overflow:hidden">

        <!-- Images -->
        <div style="flex:1;overflow-y:auto;padding:20px;display:flex;flex-direction:column;align-items:center;gap:20px">
          <img id="vg-img1" src="${IMG1}" style="max-width:980px;width:100%;display:block;border-radius:12px;
            box-shadow:0 8px 32px rgba(0,0,0,.4)" draggable="false">
          <img id="vg-img2" src="${IMG2}" style="max-width:980px;width:100%;display:block;border-radius:12px;
            box-shadow:0 8px 32px rgba(0,0,0,.4)" draggable="false">
        </div>

        <!-- Right panel — word list -->
        <div style="width:280px;min-width:280px;background:#1e293b;border-left:1px solid #334155;
          overflow-y:auto;padding:4px 8px 16px">
          ${buildWordList()}
        </div>

      </div>
    </div>`
}
