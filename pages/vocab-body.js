const IMG1 = 'https://trehfvxlqfshfhcapqca.supabase.co/storage/v1/object/public/image/vocab_image/body.jpg'
const IMG2 = 'https://trehfvxlqfshfhcapqca.supabase.co/storage/v1/object/public/image/vocab_image/body_2.png'

const WORDS = [
  // A – The Body
  { num:1,  en:'face',          ph:'/feɪs/',              vi:'khuôn mặt',         s:'A' },
  { num:2,  en:'mouth',         ph:'/maʊθ/',              vi:'miệng',             s:'A' },
  { num:3,  en:'chin',          ph:'/tʃɪn/',              vi:'cằm',               s:'A' },
  { num:4,  en:'neck',          ph:'/nɛk/',               vi:'cổ',                s:'A' },
  { num:5,  en:'shoulder',      ph:'/ˈʃoʊldər/',          vi:'vai',               s:'A' },
  { num:6,  en:'arm',           ph:'/ɑːrm/',              vi:'cánh tay',          s:'A' },
  { num:7,  en:'upper arm',     ph:'/ˈʌpər ɑːrm/',        vi:'cánh tay trên',     s:'A' },
  { num:8,  en:'elbow',         ph:'/ˈɛlboʊ/',            vi:'khuỷu tay',         s:'A' },
  { num:9,  en:'forearm',       ph:'/ˈfɔːrɑːrm/',         vi:'cẳng tay',          s:'A' },
  { num:10, en:'armpit',        ph:'/ˈɑːrmpɪt/',          vi:'nách',              s:'A' },
  { num:11, en:'back',          ph:'/bæk/',               vi:'lưng',              s:'A' },
  { num:12, en:'chest',         ph:'/tʃɛst/',             vi:'ngực',              s:'A' },
  { num:13, en:'waist',         ph:'/weɪst/',             vi:'eo',                s:'A' },
  { num:14, en:'abdomen',       ph:'/ˈæbdəmən/',          vi:'bụng',              s:'A' },
  { num:15, en:'buttocks',      ph:'/ˈbʌtəks/',           vi:'mông',              s:'A' },
  { num:16, en:'hip',           ph:'/hɪp/',               vi:'hông',              s:'A' },
  { num:17, en:'leg',           ph:'/lɛɡ/',               vi:'chân',              s:'A' },
  { num:18, en:'thigh',         ph:'/θaɪ/',               vi:'đùi',               s:'A' },
  { num:19, en:'knee',          ph:'/niː/',               vi:'đầu gối',           s:'A' },
  { num:20, en:'calf',          ph:'/kæf/',               vi:'bắp chân',          s:'A' },
  // B – The Hand
  { num:21, en:'wrist',         ph:'/rɪst/',              vi:'cổ tay',            s:'B' },
  { num:22, en:'knuckle',       ph:'/ˈnʌkəl/',            vi:'đốt ngón tay',      s:'B' },
  { num:23, en:'fingernail',    ph:'/ˈfɪŋɡərneɪl/',       vi:'móng tay',          s:'B' },
  { num:24, en:'thumb',         ph:'/θʌm/',               vi:'ngón cái',          s:'B' },
  { num:25, en:'index finger',  ph:'/ˈɪndɛks ˈfɪŋɡər/',   vi:'ngón trỏ',          s:'B' },
  { num:26, en:'middle finger', ph:'/ˈmɪdəl ˈfɪŋɡər/',    vi:'ngón giữa',         s:'B' },
  { num:27, en:'ring finger',   ph:'/rɪŋ ˈfɪŋɡər/',       vi:'ngón đeo nhẫn',     s:'B' },
  { num:28, en:'little finger', ph:'/ˈlɪtəl ˈfɪŋɡər/',    vi:'ngón út',           s:'B' },
  { num:29, en:'palm',          ph:'/pɑːm/',              vi:'lòng bàn tay',      s:'B' },
  // C – The Head
  { num:30, en:'hair',          ph:'/hɛr/',               vi:'tóc',               s:'C' },
  { num:31, en:'part',          ph:'/pɑːrt/',             vi:'ngôi tóc',          s:'C' },
  { num:32, en:'forehead',      ph:'/ˈfɔːrhɛd/',          vi:'trán',              s:'C' },
  { num:33, en:'sideburn',      ph:'/ˈsaɪdbɜːrn/',        vi:'tóc mai',           s:'C' },
  { num:34, en:'ear',           ph:'/ɪr/',                vi:'tai',               s:'C' },
  { num:35, en:'cheek',         ph:'/tʃiːk/',             vi:'má',                s:'C' },
  { num:36, en:'nose',          ph:'/noʊz/',              vi:'mũi',               s:'C' },
  { num:37, en:'nostril',       ph:'/ˈnɒstrəl/',          vi:'lỗ mũi',            s:'C' },
  { num:38, en:'jaw',           ph:'/dʒɔː/',              vi:'hàm',               s:'C' },
  { num:39, en:'beard',         ph:'/bɪrd/',              vi:'râu cằm',           s:'C' },
  { num:40, en:'mustache',      ph:'/ˈmʌstæʃ/',           vi:'râu mép',           s:'C' },
  { num:41, en:'tongue',        ph:'/tʌŋ/',               vi:'lưỡi',              s:'C' },
  { num:42, en:'tooth',         ph:'/tuːθ/',              vi:'răng',              s:'C' },
  { num:43, en:'lip',           ph:'/lɪp/',               vi:'môi',               s:'C' },
  // D – The Eye
  { num:44, en:'eyebrow',       ph:'/ˈaɪbraʊ/',           vi:'lông mày',          s:'D' },
  { num:45, en:'eyelid',        ph:'/ˈaɪlɪd/',            vi:'mí mắt',            s:'D' },
  { num:46, en:'eyelashes',     ph:'/ˈaɪlæʃɪz/',          vi:'lông mi',           s:'D' },
  { num:47, en:'iris',          ph:'/ˈaɪrɪs/',            vi:'mống mắt',          s:'D' },
  { num:48, en:'pupil',         ph:'/ˈpjuːpəl/',          vi:'con ngươi',         s:'D' },
  // E – The Foot
  { num:49, en:'ankle',         ph:'/ˈæŋkəl/',            vi:'mắt cá chân',       s:'E' },
  { num:50, en:'heel',          ph:'/hiːl/',              vi:'gót chân',          s:'E' },
  { num:51, en:'instep',        ph:'/ˈɪnstɛp/',           vi:'mu bàn chân',       s:'E' },
  { num:52, en:'ball',          ph:'/bɔːl/',              vi:'lòng bàn chân trước', s:'E' },
  { num:53, en:'big toe',       ph:'/bɪɡ toʊ/',           vi:'ngón chân cái',     s:'E' },
  { num:54, en:'toe',           ph:'/toʊ/',               vi:'ngón chân',         s:'E' },
  { num:55, en:'little toe',    ph:'/ˈlɪtəl toʊ/',        vi:'ngón chân út',      s:'E' },
  { num:56, en:'toenail',       ph:'/ˈtoʊneɪl/',          vi:'móng chân',         s:'E' },
  // F – The Internal Organs
  { num:57, en:'brain',         ph:'/breɪn/',             vi:'não',               s:'F' },
  { num:58, en:'spinal cord',   ph:'/ˈspaɪnəl kɔːrd/',    vi:'tủy sống',          s:'F' },
  { num:59, en:'throat',        ph:'/θroʊt/',             vi:'họng',              s:'F' },
  { num:60, en:'windpipe',      ph:'/ˈwɪndpaɪp/',         vi:'khí quản',          s:'F' },
  { num:61, en:'esophagus',     ph:'/ɪˈsɒfəɡəs/',         vi:'thực quản',         s:'F' },
  { num:62, en:'muscle',        ph:'/ˈmʌsəl/',            vi:'cơ bắp',            s:'F' },
  { num:63, en:'lung',          ph:'/lʌŋ/',               vi:'phổi',              s:'F' },
  { num:64, en:'heart',         ph:'/hɑːrt/',             vi:'tim',               s:'F' },
  { num:65, en:'liver',         ph:'/ˈlɪvər/',            vi:'gan',               s:'F' },
  { num:66, en:'stomach',       ph:'/ˈstʌmək/',           vi:'dạ dày',            s:'F' },
  { num:67, en:'intestines',    ph:'/ɪnˈtɛstɪnz/',        vi:'ruột',              s:'F' },
  { num:68, en:'vein',          ph:'/veɪn/',              vi:'tĩnh mạch',         s:'F' },
  { num:69, en:'artery',        ph:'/ˈɑːrtəri/',          vi:'động mạch',         s:'F' },
  { num:70, en:'kidney',        ph:'/ˈkɪdni/',            vi:'thận',              s:'F' },
  { num:71, en:'pancreas',      ph:'/ˈpæŋkriəs/',         vi:'tụy',               s:'F' },
  { num:72, en:'bladder',       ph:'/ˈblædər/',           vi:'bàng quang',        s:'F' },
]

const SECTIONS = {
  A: { label: 'A. The Body',            color: '#2563eb', bg: '#dbeafe' },
  B: { label: 'B. The Hand',            color: '#16a34a', bg: '#dcfce7' },
  C: { label: 'C. The Head',            color: '#d97706', bg: '#fef3c7' },
  D: { label: 'D. The Eye',             color: '#7c3aed', bg: '#f5f3ff' },
  E: { label: 'E. The Foot',            color: '#0891b2', bg: '#cffafe' },
  F: { label: 'F. The Internal Organs', color: '#be185d', bg: '#fce7f3' },
}

export default function vocabBodyPage(app) {
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

  window.vocabFilter = (sec) => {
    activeSection = sec
    document.querySelectorAll('.vf-pill').forEach(p => {
      p.style.background = p.dataset.sec === sec ? '#2563eb' : '#1e293b'
      p.style.color      = p.dataset.sec === sec ? 'white'   : '#94a3b8'
    })
    document.querySelectorAll('.voc-row').forEach(el => {
      el.style.display = (sec === 'All' || el.dataset.s === sec) ? '' : 'none'
    })
    document.querySelectorAll('.voc-section-head').forEach(el => {
      el.style.display = (sec === 'All' || el.dataset.s === sec) ? '' : 'none'
    })
    const img1 = document.getElementById('vb-img1')
    const img2 = document.getElementById('vb-img2')
    const isImg2 = sec === 'E' || sec === 'F'
    const isImg1 = sec === 'A' || sec === 'B' || sec === 'C' || sec === 'D'
    img1.style.display = (sec === 'All' || isImg1) ? 'block' : 'none'
    img2.style.display = (sec === 'All' || isImg2) ? 'block' : 'none'
  }

  window.vocabSpeak = (num) => {
    const word = WORDS.find(w => w.num === num)
    if (word) speak(word.en)
  }

  function buildWordList() {
    return Object.entries(SECTIONS).map(([sec, info]) => `
      <div class="voc-section-head" data-s="${sec}"
        style="font-size:11px;font-weight:700;color:${info.color};letter-spacing:.8px;
          padding:10px 8px 4px;text-transform:uppercase">
        ${info.label}
      </div>
      ${WORDS.filter(w => w.s === sec).map(w => `
        <div class="voc-row" data-s="${w.s}"
          onclick="vocabSpeak(${w.num})"
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

  const filters = ['All', 'A', 'B', 'C', 'D', 'E', 'F']
  const filterLabels = { All: 'Tất cả', A: 'Body', B: 'Hand', C: 'Head', D: 'Eye', E: 'Foot', F: 'Organs' }

  app.innerHTML = `
    <style>
      .voc-row:hover { background: #1e293b !important; }
      .voc-row:hover span:last-child { color: #2563eb !important; }
    </style>

    <div style="height:100vh;background:#0f172a;display:flex;flex-direction:column">

      <!-- Header -->
      <div style="background:#1e293b;border-bottom:1px solid #334155;padding:14px 24px;
        display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
        <div>
          <h1 style="font-size:18px;font-weight:800;color:#f1f5f9;margin:0;font-family:'Space Grotesk',sans-serif">
            🫁 Human Body — Vocabulary
          </h1>
          <p style="margin:2px 0 0;font-size:12px;color:#64748b">Bấm vào từ để nghe phát âm</p>
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

        <!-- Images (stacked, filterable) -->
        <div style="flex:1;overflow-y:auto;padding:20px;display:flex;flex-direction:column;align-items:center;gap:20px">
          <img id="vb-img1" src="${IMG1}" style="max-width:980px;width:100%;display:block;border-radius:12px;
            box-shadow:0 8px 32px rgba(0,0,0,.4)" draggable="false">
          <img id="vb-img2" src="${IMG2}" style="max-width:980px;width:100%;display:block;border-radius:12px;
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
