import { supabase } from '../supabase/client.js'

const HANZI_CDN   = 'https://cdn.jsdelivr.net/npm/hanzi-writer@3.5/dist/hanzi-writer.min.js'
const KEY         = 'cw_mastered_v1'
const SESSION_SIZE = 10
const LEVELS      = ['HSK1','HSK2','HSK3','HSK4','HSK5','HSK6']
const LEVEL_COLOR = { HSK1:'#2563eb', HSK2:'#16a34a', HSK3:'#d97706', HSK4:'#7c3aed', HSK5:'#dc2626', HSK6:'#0891b2' }

// Fallback words (HSK1) used if Supabase table not ready yet
const FALLBACK = [
  { char:'爱',pinyin:'ài',vi:'yêu' },{ char:'八',pinyin:'bā',vi:'tám' },
  { char:'爸',pinyin:'bà',vi:'bố' },{ char:'不',pinyin:'bù',vi:'không' },
  { char:'大',pinyin:'dà',vi:'lớn' },{ char:'的',pinyin:'de',vi:'của (trợ từ)' },
  { char:'多',pinyin:'duō',vi:'nhiều' },{ char:'好',pinyin:'hǎo',vi:'tốt' },
  { char:'喝',pinyin:'hē',vi:'uống' },{ char:'很',pinyin:'hěn',vi:'rất' },
  { char:'家',pinyin:'jiā',vi:'nhà' },{ char:'九',pinyin:'jiǔ',vi:'chín' },
  { char:'来',pinyin:'lái',vi:'đến' },{ char:'妈',pinyin:'mā',vi:'mẹ' },
  { char:'没',pinyin:'méi',vi:'không có' },{ char:'你',pinyin:'nǐ',vi:'bạn' },
  { char:'七',pinyin:'qī',vi:'bảy' },{ char:'去',pinyin:'qù',vi:'đi' },
  { char:'人',pinyin:'rén',vi:'người' },{ char:'三',pinyin:'sān',vi:'ba' },
  { char:'是',pinyin:'shì',vi:'là' },{ char:'水',pinyin:'shuǐ',vi:'nước' },
  { char:'说',pinyin:'shuō',vi:'nói' },{ char:'他',pinyin:'tā',vi:'anh ấy' },
  { char:'她',pinyin:'tā',vi:'cô ấy' },{ char:'天',pinyin:'tiān',vi:'trời, ngày' },
  { char:'我',pinyin:'wǒ',vi:'tôi' },{ char:'五',pinyin:'wǔ',vi:'năm (số)' },
  { char:'学',pinyin:'xué',vi:'học' },{ char:'一',pinyin:'yī',vi:'một' },
]

export default async function chineseWritingPage(app) {
  const mastered = new Set(JSON.parse(localStorage.getItem(KEY) || '[]'))
  let tab      = 'write'
  let level    = 'HSK1'
  let srsMode  = false
  let allWords = []
  let writer   = null

  function save() { localStorage.setItem(KEY, JSON.stringify([...mastered])) }

  // ── Supabase fetch ─────────────────────────────────────────────────────────
  async function fetchLevel(lvl) {
    try {
      const { data, error } = await supabase
        .from('chinese_vocab')
        .select('char,pinyin,vi,example,ex_pinyin,ex_vi')
        .eq('level', lvl)
        .order('id')
      if (error || !data?.length) throw new Error()
      return data
    } catch {
      return lvl === 'HSK1' ? FALLBACK : []
    }
  }

  // ── TTS ────────────────────────────────────────────────────────────────────
  function speak(char) {
    speechSynthesis.cancel()
    const doSpeak = () => {
      const utt = new SpeechSynthesisUtterance(char)
      utt.lang = 'zh-CN'; utt.rate = 0.8
      const voices = speechSynthesis.getVoices()
      utt.voice =
        voices.find(v => v.name.includes('Google') && v.lang.startsWith('zh')) ||
        voices.find(v => v.lang === 'zh-CN') ||
        voices.find(v => v.lang.startsWith('zh')) || null
      speechSynthesis.speak(utt)
    }
    const voices = speechSynthesis.getVoices()
    if (voices.length) doSpeak()
    else speechSynthesis.onvoiceschanged = doSpeak
  }
  window.cwSpeak = speak

  function buildSession() {
    const pool = srsMode ? allWords.filter(w => !mastered.has(w.char)) : allWords
    const unmastered = pool.filter(w => !mastered.has(w.char))
    return (unmastered.length > 0 ? unmastered : pool).slice(0, SESSION_SIZE)
  }

  function masteredInLevel() { return allWords.filter(w => mastered.has(w.char)).length }

  // ── Shell HTML ─────────────────────────────────────────────────────────────
  app.innerHTML = `
    <style>
      .cw-tab  { padding:8px 20px;border-radius:20px;border:2px solid #e5e7eb;cursor:pointer;font-size:14px;font-weight:600;background:white;color:#6b7280;transition:.12s }
      .cw-tab.active { border-color:#1e293b;color:#1e293b }
      .cw-tab.orange { color:#f97316;border-color:#fed7aa }
      .cw-tab.pink   { color:#f43f5e;border-color:#fecdd3 }
      .cw-lvl  { padding:6px 16px;border-radius:20px;border:2px solid #e5e7eb;cursor:pointer;font-size:13px;font-weight:700;background:white;color:#6b7280;transition:.12s }
      .cw-lvl.active { color:white;border-color:transparent }
      .cw-btn  { padding:10px 28px;border:1.5px solid #d1d5db;border-radius:10px;background:white;cursor:pointer;font-size:14px;font-weight:500;color:#374151;transition:.12s }
      .cw-btn:hover { border-color:#94a3b8;background:#f8fafc }
      .cw-opt  { width:100%;padding:12px 16px;border:2px solid #e5e7eb;border-radius:12px;background:white;cursor:pointer;font-size:15px;font-weight:500;color:#1e293b;text-align:left;transition:.15s }
      .cw-opt:hover:not(:disabled) { border-color:#94a3b8;background:#f8fafc }
      .cw-opt.correct { border-color:#16a34a!important;background:#dcfce7!important;color:#15803d!important }
      .cw-opt.wrong   { border-color:#dc2626!important;background:#fee2e2!important;color:#dc2626!important }
    </style>

    <div style="min-height:100vh;background:#fdf8f0;display:flex;flex-direction:column;align-items:center;padding:28px 16px">

      <!-- Mode tabs -->
      <div style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap;justify-content:center">
        <button id="tab-flash" class="cw-tab" onclick="cwTab('flash')">Học thẻ</button>
        <button id="tab-write" class="cw-tab active" onclick="cwTab('write')">Luyện viết</button>
        <button id="tab-quiz"  class="cw-tab orange" onclick="cwTab('quiz')">Luyện tập</button>
        <button id="tab-note"  class="cw-tab pink">Sổ tay ❤</button>
      </div>

      <!-- HSK level picker -->
      <div style="display:flex;gap:6px;margin-bottom:18px;flex-wrap:wrap;justify-content:center">
        ${LEVELS.map(l => `
          <button id="lvl-${l}" class="cw-lvl${l==='HSK1'?' active':''}"
            style="${l==='HSK1'?`background:${LEVEL_COLOR[l]};border-color:${LEVEL_COLOR[l]}`:''};"
            onclick="cwLevel('${l}')">
            ${l}
          </button>`).join('')}
      </div>

      <!-- SRS -->
      <label style="display:flex;align-items:center;gap:10px;background:white;border-radius:12px;padding:10px 20px;cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,.06);margin-bottom:18px;border:1.5px solid #e5e7eb">
        <input type="checkbox" id="cw-srs" style="width:16px;height:16px;accent-color:#2563eb">
        <div>
          <div style="font-size:14px;font-weight:600;color:#1e293b">Chế độ Ôn tập (SRS)</div>
          <div style="font-size:12px;color:#94a3b8">Chỉ hiện những từ chưa thuộc</div>
        </div>
      </label>

      <!-- Progress -->
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:24px;flex-wrap:wrap;justify-content:center">
        <div style="background:#dcfce7;color:#15803d;font-size:13px;font-weight:700;padding:6px 16px;border-radius:20px">
          ✅ Đã thuộc: <span id="cw-mastered">0</span> / <span id="cw-lvl-total">?</span>
        </div>
        <div style="font-size:17px;font-weight:700;color:#1e293b;background:white;padding:6px 20px;border-radius:20px;box-shadow:0 1px 4px rgba(0,0,0,.06)">
          <span id="cw-cur">1</span> / <span id="cw-total">${SESSION_SIZE}</span>
        </div>
        <div style="background:#fee2e2;color:#dc2626;font-size:13px;font-weight:700;padding:6px 16px;border-radius:20px">
          📖 Chưa thuộc: <span id="cw-left">?</span>
        </div>
      </div>

      <!-- Content -->
      <div id="cw-body" style="width:100%;max-width:380px;display:flex;flex-direction:column;align-items:center">
        <div style="color:#94a3b8;font-size:14px">Đang tải...</div>
      </div>

    </div>`

  document.getElementById('cw-srs').addEventListener('change', e => {
    srsMode = e.target.checked; startTab()
  })

  window.cwTab = (t) => {
    tab = t
    document.querySelectorAll('.cw-tab').forEach(b => b.classList.remove('active'))
    document.getElementById('tab-' + t)?.classList.add('active')
    startTab()
  }

  window.cwLevel = async (lvl) => {
    level = lvl
    const color = LEVEL_COLOR[lvl]
    LEVELS.forEach(l => {
      const btn = document.getElementById('lvl-' + l)
      if (l === lvl) {
        btn.classList.add('active')
        btn.style.background = LEVEL_COLOR[l]
        btn.style.borderColor = LEVEL_COLOR[l]
        btn.style.color = 'white'
      } else {
        btn.classList.remove('active')
        btn.style.background = 'white'
        btn.style.borderColor = '#e5e7eb'
        btn.style.color = '#6b7280'
      }
    })
    document.getElementById('cw-body').innerHTML = `<div style="color:#94a3b8;font-size:14px">Đang tải ${lvl}...</div>`
    allWords = await fetchLevel(lvl)
    updateProgress(0, SESSION_SIZE)
    startTab()
  }

  function updateProgress(i, total) {
    document.getElementById('cw-mastered').textContent = masteredInLevel()
    document.getElementById('cw-lvl-total').textContent = allWords.length
    document.getElementById('cw-cur').textContent = i + 1
    document.getElementById('cw-total').textContent = total
    document.getElementById('cw-left').textContent = allWords.filter(w => !mastered.has(w.char)).length
  }

  // ── TAB: Học thẻ ───────────────────────────────────────────────────────────
  function startFlash() {
    const words = buildSession(); let idx = 0, flipped = false
    function show() {
      flipped = false; const w = words[idx]
      updateProgress(idx, words.length); speak(w.char)
      document.getElementById('cw-body').innerHTML = `
        <div id="fc-card" onclick="fcFlip()"
          style="width:320px;min-height:220px;background:white;border-radius:20px;
            box-shadow:0 4px 20px rgba(0,0,0,.1);cursor:pointer;padding:24px;
            display:flex;flex-direction:column;align-items:center;justify-content:center;
            margin-bottom:20px;user-select:none">
          <div style="font-size:80px;line-height:1;color:#1e293b;margin-bottom:10px">${w.char}</div>
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:22px;color:#f97316;font-weight:700">${w.pinyin}</span>
            <button onclick="event.stopPropagation();cwSpeak('${w.char}')"
              style="background:none;border:none;cursor:pointer;font-size:18px;color:#94a3b8;padding:4px;line-height:1">🔊</button>
          </div>
          <div style="font-size:12px;color:#94a3b8;margin-top:10px">Bấm để xem nghĩa</div>
        </div>
        <div id="fc-btns" style="display:none;flex-direction:column;align-items:center;gap:10px;width:100%">
          <div style="display:flex;gap:10px;width:100%">
            <button class="cw-btn" onclick="fcAnswer(false)"
              style="flex:1;background:#fee2e2;border-color:#fca5a5;color:#dc2626;font-weight:700">✗ Chưa biết</button>
            <button class="cw-btn" onclick="fcAnswer(true)"
              style="flex:1;background:#dcfce7;border-color:#86efac;color:#15803d;font-weight:700">✓ Đã biết</button>
          </div>
        </div>`
    }
    window.fcFlip = () => {
      if (flipped) return; flipped = true; const w = words[idx]
      document.getElementById('fc-card').innerHTML = `
        <div style="font-size:56px;line-height:1;color:#1e293b;margin-bottom:8px">${w.char}</div>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
          <span style="font-size:24px;color:#f97316;font-weight:700">${w.pinyin}</span>
          <button onclick="event.stopPropagation();cwSpeak('${w.char}')"
            style="background:none;border:none;cursor:pointer;font-size:18px;color:#94a3b8;padding:4px;line-height:1">🔊</button>
        </div>
        <div style="font-size:20px;color:#475569;font-weight:600">${w.vi}</div>
        ${w.example ? `<div style="font-size:13px;color:#94a3b8;margin-top:10px;text-align:center">${w.example}<br><span style="font-size:11px">${w.ex_pinyin||''}</span><br><span style="font-size:11px;color:#3b82f6">${w.ex_vi||''}</span></div>` : ''}`
      document.getElementById('fc-btns').style.display = 'flex'
    }
    window.fcAnswer = (knew) => {
      if (knew) { mastered.add(words[idx].char); save() }
      updateProgress(idx, words.length)
      if (idx + 1 < words.length) { idx++; show() }
      else { document.getElementById('cw-body').innerHTML = doneHTML(startFlash); updateProgress(words.length - 1, words.length) }
    }
    show()
  }

  // ── TAB: Luyện viết ────────────────────────────────────────────────────────

  // Split pinyin string into individual syllables matching the character count
  function splitPinyin(pinyin, count) {
    const parts = pinyin.trim().split(/\s+/).filter(Boolean)
    if (parts.length === count) return parts
    // Regex: optional initial consonant cluster + toned vowel nucleus + optional coda
    const re = /(?:zh|ch|sh|[bpmfdtnlgkhzcsrjqxyw])?[āáǎàōóǒòēéěèīíǐìūúǔùǖǘǚǜaeiouü][a-züāáǎàōóǒòēéěèīíǐìūúǔùǖǘǚǜngr]*/gi
    const matches = [...pinyin.matchAll(re)].map(m => m[0])
    return matches.length === count ? matches : [pinyin]
  }

  async function startWrite() {
    if (!window.HanziWriter) {
      document.getElementById('cw-body').innerHTML = `<div style="color:#94a3b8;font-size:14px">Đang tải HanziWriter...</div>`
      await new Promise((res, rej) => {
        const s = document.createElement('script')
        s.src = HANZI_CDN; s.onload = res; s.onerror = rej
        document.head.appendChild(s)
      })
    }
    const words = buildSession(); let wordIdx = 0

    function showWord(wi) {
      wordIdx = wi
      const w = words[wi]
      const chars = [...w.char]
      const pinyins = splitPinyin(w.pinyin, chars.length)
      updateProgress(wi, words.length)
      speak(w.char)
      showChar(wi, chars, pinyins, 0, 0)
    }

    function showChar(wi, chars, pinyins, ci, totalMistakes) {
      const w = words[wi]
      let mistakes = 0, done = false

      const boxesHTML = chars.map((ch, bi) => {
        if (bi < ci) return `
          <div style="display:flex;flex-direction:column;align-items:center;gap:4px">
            <span style="font-size:12px;color:#f97316;font-weight:600">${pinyins[bi] || ''}</span>
            <div style="width:72px;height:72px;border-radius:12px;background:#dcfce7;border:2px solid #16a34a;
              display:flex;align-items:center;justify-content:center;font-size:36px">${ch}</div>
          </div>`
        if (bi === ci) return `
          <div style="display:flex;flex-direction:column;align-items:center;gap:4px">
            <span style="font-size:12px;color:#f97316;font-weight:600">${pinyins[bi] || ''}</span>
            <div style="width:72px;height:72px;border-radius:12px;background:white;border:2px solid #2563eb;
              display:flex;align-items:center;justify-content:center"></div>
          </div>`
        return `
          <div style="display:flex;flex-direction:column;align-items:center;gap:4px">
            <span style="font-size:12px;color:#cbd5e1">${pinyins[bi] || ''}</span>
            <div style="width:72px;height:72px;border-radius:12px;background:#f1f5f9;border:2px solid #e2e8f0;
              display:flex;align-items:center;justify-content:center;font-size:28px;color:#94a3b8">?</div>
          </div>`
      }).join('')

      document.getElementById('cw-body').innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
          <span style="font-size:22px;font-weight:700;color:#f97316">${w.pinyin}</span>
          <button onclick="cwSpeak('${w.char}')"
            style="background:none;border:none;cursor:pointer;font-size:18px;color:#94a3b8;padding:4px;line-height:1">🔊</button>
        </div>
        <div style="font-size:14px;color:#64748b;margin-bottom:14px">${w.vi}</div>
        <div style="display:flex;gap:16px;justify-content:center;margin-bottom:18px">${boxesHTML}</div>
        <div style="background:white;border-radius:20px;padding:20px;box-shadow:0 2px 16px rgba(0,0,0,.08);margin-bottom:12px;display:flex;justify-content:center">
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
        writer = HanziWriter.create('cw-canvas', chars[ci], {
          width:260, height:260, padding:5, showOutline:true,
          strokeColor:'#2563eb', outlineColor:'#d1d5db',
          drawingColor:'#2563eb', drawingWidth:4,
          showHintAfterMisses:3, highlightOnComplete:true,
        })
        writer.quiz({
          onMistake: () => { mistakes++ },
          onComplete: () => {
            if (done) return; done = true
            const allMistakes = totalMistakes + mistakes
            const h = document.getElementById('cw-hint')
            const nextCi = ci + 1
            if (nextCi < chars.length) {
              if (h) h.textContent = `✅ Chữ ${ci + 1}/${chars.length}! Tiếp tục...`
              setTimeout(() => showChar(wi, chars, pinyins, nextCi, allMistakes), 900)
            } else {
              if (allMistakes === 0) { mastered.add(w.char); save() }
              if (h) h.textContent = allMistakes === 0 ? '✅ Hoàn hảo!' : `Xong! ${allMistakes} lỗi.`
              updateProgress(wi, words.length)
              setTimeout(() => {
                if (wi + 1 < words.length) showWord(wi + 1)
                else { document.getElementById('cw-body').innerHTML = doneHTML(startWrite); updateProgress(words.length - 1, words.length) }
              }, 1200)
            }
          }
        })
      } catch { document.getElementById('cw-hint').textContent = 'Không có dữ liệu nét cho chữ này.' }
    }

    window.cwReset = () => { const w = words[wordIdx]; const chars = [...w.char]; const pinyins = splitPinyin(w.pinyin, chars.length); showChar(wordIdx, chars, pinyins, 0, 0) }
    window.cwFree  = () => { if (writer) { writer.animateCharacter(); document.getElementById('cw-hint').textContent = 'Đang hiện thứ tự nét...' } }
    showWord(0)
  }

  // ── TAB: Luyện tập ─────────────────────────────────────────────────────────
  function startQuiz() {
    const words = buildSession(); let idx = 0, answered = false
    function makeOpts(w) {
      const wrong = allWords.filter(x => x.char !== w.char).sort(() => Math.random() - 0.5).slice(0, 3)
      return [...wrong, w].sort(() => Math.random() - 0.5)
    }
    function show(i) {
      idx = i; answered = false; const w = words[i]; const opts = makeOpts(w)
      updateProgress(i, words.length); speak(w.char)
      document.getElementById('cw-body').innerHTML = `
        <div style="background:white;border-radius:20px;padding:28px 24px;box-shadow:0 2px 16px rgba(0,0,0,.08);
          width:100%;text-align:center;margin-bottom:20px">
          <div style="font-size:80px;line-height:1;margin-bottom:8px">${w.char}</div>
          <div style="display:flex;align-items:center;justify-content:center;gap:10px">
            <span style="font-size:24px;color:#f97316;font-weight:700">${w.pinyin}</span>
            <button onclick="cwSpeak('${w.char}')"
              style="background:none;border:none;cursor:pointer;font-size:18px;color:#94a3b8;padding:4px;line-height:1">🔊</button>
          </div>
          <div style="font-size:13px;color:#94a3b8;margin-top:6px">Chọn nghĩa đúng</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:10px;width:100%">
          ${opts.map((o, oi) => `
            <button class="cw-opt" id="opt-${oi}" onclick="qzPick(${oi},'${o.char}','${w.char}')">
              ${o.vi}
            </button>`).join('')}
        </div>`
    }
    window.qzPick = (oi, picked, correct) => {
      if (answered) return; answered = true
      const ok = picked === correct
      if (ok) { mastered.add(words[idx].char); save() }
      document.getElementById('opt-' + oi).classList.add(ok ? 'correct' : 'wrong')
      if (!ok) {
        document.querySelectorAll('.cw-opt').forEach(btn => {
          const w = allWords.find(x => x.vi === btn.textContent.trim())
          if (w?.char === correct) btn.classList.add('correct')
        })
      }
      document.querySelectorAll('.cw-opt').forEach(b => b.disabled = true)
      updateProgress(idx, words.length)
      setTimeout(() => {
        if (idx + 1 < words.length) show(idx + 1)
        else { document.getElementById('cw-body').innerHTML = doneHTML(startQuiz); updateProgress(words.length - 1, words.length) }
      }, ok ? 700 : 1400)
    }
    show(0)
  }

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

  function startTab() {
    if (tab === 'flash') startFlash()
    else if (tab === 'write') startWrite()
    else if (tab === 'quiz') startQuiz()
  }

  // Initial load
  allWords = await fetchLevel('HSK1')
  updateProgress(0, SESSION_SIZE)
  startTab()
}
