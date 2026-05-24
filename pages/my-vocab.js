import { supabase } from '../supabase/client.js'
import { requireAuth } from '../utils/auth.js'

export default async function myVocabPage(app) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) { requireAuth(() => {}); return }
  const uid = session.user.id

  let tab         = 'all'
  let search      = ''
  let toeicWords  = []
  let chineseWords = []
  let editingWord    = null  // key being edited (example)
  let editingEx      = ''
  let editingMeaning = null  // key being edited (meaning)
  let editingMeaningVal = ''
  let saving      = false
  const exMap      = {}     // word.lower → example string
  const meaningMap = {}     // word.lower → custom meaning
  const imageMap   = {}     // word.lower → image url
  const deckIdMap  = {}     // word.lower → deck_id
  let defaultDeckId = null

  app.innerHTML = `
    <div style="min-height:100vh;background:#f8faff;display:flex;align-items:center;justify-content:center">
      <div style="color:#64748b;font-size:14px">Đang tải từ vựng...</div>
    </div>`

  // ── Load all sources in parallel ───────────────────────────────────────────
  const [{ data: srsRows }, { data: learnedRows }, { data: deckItems }, { data: decks }] = await Promise.all([
    supabase.from('user_vocab_srs')
      .select('vocab_id, word, meaning, last_reviewed_at').eq('user_id', uid)
      .order('last_reviewed_at', { ascending: false }),
    supabase.from('user_vocab_learned')
      .select('vocab_id, learned_at').eq('user_id', uid),
    supabase.from('vocab_deck_items')
      .select('word, meaning, example, image_url, deck_id, updated_at').eq('user_id', uid)
      .order('updated_at', { ascending: false }),
    supabase.from('vocab_decks').select('id, name').eq('user_id', uid).order('created_at').limit(1),
  ])

  defaultDeckId = decks?.[0]?.id || null

  // Build example, meaning override, image, deck_id maps from deck items
  for (const r of (deckItems || [])) {
    const key = (r.word || '').toLowerCase().trim()
    if (key) {
      exMap[key]      = r.example || ''
      deckIdMap[key]  = r.deck_id
      if (r.meaning)  meaningMap[key] = r.meaning
      if (r.image_url) imageMap[key]  = r.image_url
    }
  }

  // Fetch question_vocab details for vocab_ids
  const allVocabIds = [...new Set([
    ...(srsRows || []).filter(r => r.vocab_id).map(r => r.vocab_id),
    ...(learnedRows || []).filter(r => r.vocab_id).map(r => r.vocab_id),
  ])]
  const vocabMap = {}
  if (allVocabIds.length) {
    const { data: vocabRows } = await supabase
      .from('question_vocab').select('id, word, meaning').in('id', allVocabIds)
    for (const v of (vocabRows || [])) vocabMap[v.id] = v
  }

  // Merge sources, dedup by lowercase word
  const seen = new Set()
  const pushWord = (word, meaning, ts) => {
    const key = (word || '').toLowerCase().trim()
    if (!key || seen.has(key)) return
    seen.add(key)
    toeicWords.push({ word, meaning: meaning || '', learned_at: ts, source: 'toeic' })
  }
  for (const r of (srsRows || [])) {
    const v = r.vocab_id ? vocabMap[r.vocab_id] : null
    pushWord(v?.word || r.word, v?.meaning || r.meaning, r.last_reviewed_at)
  }
  for (const r of (learnedRows || [])) {
    const v = r.vocab_id ? vocabMap[r.vocab_id] : null
    if (v) pushWord(v.word, v.meaning, r.learned_at)
  }
  for (const r of (deckItems || [])) pushWord(r.word, r.meaning, r.updated_at)
  toeicWords.sort((a, b) => new Date(b.learned_at || 0) - new Date(a.learned_at || 0))

  // Chinese
  const { data: chineseRows } = await supabase
    .from('chinese_srs').select('chinese_vocab_id, last_reviewed_at')
    .eq('user_id', uid).order('last_reviewed_at', { ascending: false })
  const chineseIds = (chineseRows || []).map(r => r.chinese_vocab_id).filter(Boolean)
  if (chineseIds.length) {
    const { data: cvRows } = await supabase
      .from('chinese_vocab').select('id, char, pinyin, vi').in('id', chineseIds)
    const srsMap = {}
    for (const r of chineseRows) srsMap[r.chinese_vocab_id] = r
    chineseWords = (cvRows || []).map(v => ({
      ...v, word: v.char, meaning: v.vi, ...srsMap[v.id], source: 'chinese'
    })).sort((a, b) => new Date(b.last_reviewed_at) - new Date(a.last_reviewed_at))
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  function getFiltered() {
    let list = tab === 'toeic' ? toeicWords : tab === 'chinese' ? chineseWords : [...toeicWords, ...chineseWords]
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(w =>
        w.word?.toLowerCase().includes(q) ||
        w.meaning?.toLowerCase().includes(q) ||
        w.pinyin?.toLowerCase().includes(q)
      )
    }
    return list
  }

  function speak(text, lang) {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = lang; u.rate = 0.9
    window.speechSynthesis.speak(u)
  }

  function escAttr(s) { return (s || '').replace(/'/g, "\\'").replace(/"/g, '&quot;') }

  // ── Render ─────────────────────────────────────────────────────────────────
  function render() {
    const list  = getFiltered()
    const total = toeicWords.length + chineseWords.length
    const tabs  = [
      { id: 'all',     label: `Tất cả (${total})` },
      { id: 'toeic',   label: `🇬🇧 Tiếng Anh (${toeicWords.length})` },
      { id: 'chinese', label: `🇨🇳 Tiếng Trung (${chineseWords.length})` },
    ]

    app.innerHTML = `
      <style>
        .vocab-row { background:white; border-radius:12px; border:1px solid #e2e8f0; padding:14px 18px;
          transition:box-shadow .15s; }
        .vocab-row:hover { box-shadow:0 4px 16px rgba(0,0,0,.07); }
        .vocab-main { display:flex; align-items:center; gap:14px; }
        .speak-btn  { background:none; border:none; cursor:pointer; font-size:18px; padding:4px 8px;
          border-radius:8px; transition:background .15s; flex-shrink:0; }
        .speak-btn:hover { background:#f1f5f9; }
        .edit-btn   { background:none; border:none; cursor:pointer; font-size:15px; padding:4px 8px;
          border-radius:8px; color:#94a3b8; transition:all .15s; flex-shrink:0; }
        .edit-btn:hover { background:#f1f5f9; color:#2563eb; }
        .ex-area    { width:100%; border:1.5px solid #e2e8f0; border-radius:10px; padding:9px 12px;
          font-size:13px; color:#0f172a; resize:none; outline:none; transition:border-color .15s;
          font-family:'Inter',sans-serif; background:#f8faff; margin-top:10px; }
        .ex-area:focus { border-color:#2563eb; background:white; }
        .meaning-input { border:1.5px solid #e2e8f0; border-radius:8px; padding:6px 10px;
          font-size:14px; color:#0f172a; outline:none; transition:border-color .15s;
          background:#f8faff; width:100%; box-sizing:border-box; margin-top:6px; }
        .meaning-input:focus { border-color:#2563eb; background:white; }
        #mv-search:focus { border-color:#2563eb !important; outline:none; }
        .meaning-edit-btn { background:none; border:none; cursor:pointer; font-size:12px; padding:2px 6px;
          border-radius:6px; color:#cbd5e1; transition:all .15s; flex-shrink:0; line-height:1; }
        .meaning-edit-btn:hover { background:#f1f5f9; color:#2563eb; }
        .img-btn { background:none; border:none; cursor:pointer; font-size:16px; padding:4px 8px;
          border-radius:8px; color:#94a3b8; transition:all .15s; flex-shrink:0; }
        .img-btn:hover { background:#f1f5f9; color:#2563eb; }
        .vocab-img { width:100%; max-width:220px; border-radius:10px; object-fit:cover; height:140px;
          margin-top:10px; box-shadow:0 2px 8px rgba(0,0,0,.1); display:block; }
        .img-grid { display:flex; gap:8px; flex-wrap:wrap; margin-top:10px; }
        .img-choice { width:90px; height:70px; object-fit:cover; border-radius:8px; cursor:pointer;
          border:2px solid transparent; transition:all .15s; }
        .img-choice:hover { border-color:#2563eb; transform:scale(1.04); }
      </style>
      <div style="min-height:100vh;background:#f8faff;padding:32px 20px">
        <div style="max-width:860px;margin:0 auto">

          <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px;flex-wrap:wrap">
            <button onclick="history.back()" style="background:none;border:none;cursor:pointer;color:#64748b;font-size:14px;padding:0">← Quay lại</button>
            <div>
              <h1 style="font-size:24px;font-weight:800;color:#0f172a;margin:0;font-family:'Space Grotesk',sans-serif">📖 Kho từ vựng của tôi</h1>
              <p style="font-size:13px;color:#64748b;margin:4px 0 0"><strong>${total}</strong> từ đã học</p>
            </div>
          </div>

          <div style="display:flex;gap:12px;align-items:center;margin-bottom:16px;flex-wrap:wrap">
            <input id="mv-search" type="text" placeholder="🔍  Tìm từ, nghĩa, pinyin..."
              value="${search}" oninput="mvSearch(this.value)"
              style="flex:1;min-width:200px;background:white;border:1px solid #e2e8f0;border-radius:10px;
                padding:10px 14px;font-size:14px;color:#0f172a;transition:border-color .15s"/>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              ${tabs.map(t => `
                <button onclick="mvTab('${t.id}')"
                  style="padding:8px 16px;border-radius:10px;border:none;cursor:pointer;font-size:13px;font-weight:600;
                    background:${tab===t.id?'#2563eb':'#f1f5f9'};color:${tab===t.id?'white':'#64748b'}">
                  ${t.label}
                </button>`).join('')}
            </div>
          </div>

          ${list.length === 0 ? `
            <div style="text-align:center;padding:60px 20px;color:#94a3b8">
              <div style="font-size:40px;margin-bottom:12px">${total === 0 ? '📚' : '🔍'}</div>
              <p style="font-size:15px">${total === 0 ? 'Chưa có từ nào. Hãy học thêm từ vựng nhé!' : 'Không tìm thấy từ phù hợp'}</p>
              ${total === 0 ? `<button onclick="navigate('/toeic/vocabulary')"
                style="margin-top:12px;padding:10px 24px;background:#2563eb;color:white;border:none;border-radius:10px;cursor:pointer;font-size:14px;font-weight:600">
                Học từ vựng TOEIC →</button>` : ''}
            </div>` : `
            <div style="display:flex;flex-direction:column;gap:8px">
              ${list.map(w => {
                const key = (w.word || '').toLowerCase().trim()
                const ex  = exMap[key] || ''
                const img = imageMap[key] || ''
                const isEditing        = editingWord === key
                const isMeaningEditing = editingMeaning === key
                const displayMeaning   = meaningMap[key] || w.meaning || '—'
                const safeKey          = key.replace(/\s+/g,'-')

                return `<div class="vocab-row" id="vrow-${safeKey}">
                  <div class="vocab-main">
                    ${w.source === 'chinese'
                      ? `<div style="font-size:28px;font-weight:800;color:#0f172a;min-width:44px;text-align:center;font-family:serif">${w.char || w.word}</div>`
                      : `<div style="font-size:18px;font-weight:700;color:#0f172a;min-width:100px;flex-shrink:0">${w.word}</div>`
                    }
                    <div style="flex:1;min-width:0">
                      ${w.source === 'chinese' && w.pinyin ? `<div style="font-size:13px;color:#f97316;font-weight:600;margin-bottom:2px">${w.pinyin}</div>` : ''}
                      <div style="display:flex;align-items:center;gap:4px">
                        <div style="font-size:14px;color:#475569;line-height:1.4">${displayMeaning}</div>
                        <button class="meaning-edit-btn" onclick="mvEditMeaning('${escAttr(key)}')" title="Sửa nghĩa">✏</button>
                      </div>
                      ${!isEditing && !isMeaningEditing && ex ? `<div style="font-size:13px;color:#64748b;font-style:italic;margin-top:4px;line-height:1.5">📝 ${ex}</div>` : ''}
                    </div>
                    <span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;flex-shrink:0;
                      background:${w.source==='chinese'?'#fff7ed':'#eff6ff'};
                      color:${w.source==='chinese'?'#c2410c':'#1d4ed8'}">
                      ${w.source==='chinese'?'中文':'EN'}
                    </span>
                    <button class="speak-btn" onclick="mvSpeak('${escAttr(w.word)}','${w.source==='chinese'?'zh-CN':'en-US'}')" title="Nghe">🔊</button>
                    <button class="img-btn" onclick="mvToggleImg('${escAttr(key)}','${escAttr(w.word)}')" title="${img ? 'Đổi ảnh' : 'Tìm ảnh'}">
                      ${img ? '🖼️' : '📷'}
                    </button>
                    <button class="edit-btn" onclick="mvEditEx('${escAttr(key)}')" title="${ex ? 'Sửa ví dụ' : 'Thêm ví dụ'}">
                      ${isEditing ? '✕' : (ex ? '📝' : '＋')}
                    </button>
                  </div>

                  ${img && !isEditing && !isMeaningEditing ? `
                    <div style="margin-top:10px;position:relative;display:inline-block">
                      <img src="${img}" class="vocab-img" onerror="this.style.display='none'">
                      <button onclick="mvRemoveImg('${escAttr(key)}')"
                        style="position:absolute;top:6px;right:6px;background:rgba(0,0,0,.5);border:none;
                          color:white;border-radius:50%;width:22px;height:22px;cursor:pointer;font-size:12px;line-height:1">✕</button>
                    </div>` : ''}

                  <div id="imgpicker-${safeKey}" style="display:none">
                    <div id="imgloading-${safeKey}" style="font-size:13px;color:#94a3b8;margin-top:8px">Đang tìm ảnh...</div>
                    <div id="imggrid-${safeKey}" class="img-grid"></div>
                  </div>

                  ${isMeaningEditing ? `
                    <div style="margin-top:8px">
                      <div style="font-size:11px;font-weight:700;color:#64748b;letter-spacing:.5px;margin-bottom:4px">
                        NGHĨA CỦA TỪ — Enter để lưu, Esc để huỷ
                      </div>
                      <input id="meaning-input-${safeKey}" class="meaning-input" type="text"
                        value="${escAttr(editingMeaningVal)}"
                        placeholder="Nhập nghĩa của từ..."
                        onkeydown="if(event.key==='Enter'){event.preventDefault();mvSaveMeaning('${escAttr(key)}')}else if(event.key==='Escape'){mvCancelMeaning()}"
                      />
                      <div style="display:flex;gap:8px;margin-top:8px">
                        <button onclick="mvSaveMeaning('${escAttr(key)}')" ${saving?'disabled':''}
                          style="padding:7px 20px;border-radius:8px;border:none;cursor:pointer;background:#2563eb;
                            color:white;font-size:13px;font-weight:700;opacity:${saving?'.6':'1'}">
                          ${saving ? '...' : '💾 Lưu'}
                        </button>
                        <button onclick="mvCancelMeaning()"
                          style="padding:7px 14px;border-radius:8px;border:none;cursor:pointer;background:#f1f5f9;
                            color:#64748b;font-size:13px;font-weight:600">
                          Huỷ
                        </button>
                      </div>
                    </div>` : ''}

                  ${isEditing ? `
                    <div style="margin-top:10px">
                      <div style="font-size:11px;font-weight:700;color:#64748b;letter-spacing:.5px;margin-bottom:4px">
                        CÂU VÍ DỤ — gõ xong nhấn Lưu hoặc Enter
                      </div>
                      <textarea id="ex-input-${safeKey}" class="ex-area" rows="2"
                        placeholder='Ví dụ: "The doctor gave me a prescription."'
                        onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();mvSaveEx('${escAttr(key)}')}else if(event.key==='Escape'){mvCancelEx()}"
                      >${editingEx}</textarea>
                      <div style="display:flex;gap:8px;margin-top:8px">
                        <button onclick="mvSaveEx('${escAttr(key)}')" ${saving?'disabled':''}
                          style="padding:7px 20px;border-radius:8px;border:none;cursor:pointer;background:#2563eb;
                            color:white;font-size:13px;font-weight:700;transition:opacity .15s;
                            opacity:${saving?'.6':'1'}">
                          ${saving ? '...' : '💾 Lưu'}
                        </button>
                        <button onclick="mvCancelEx()"
                          style="padding:7px 14px;border-radius:8px;border:none;cursor:pointer;background:#f1f5f9;
                            color:#64748b;font-size:13px;font-weight:600">
                          Huỷ
                        </button>
                        ${ex ? `<button onclick="mvDeleteEx('${escAttr(key)}')"
                          style="margin-left:auto;padding:7px 14px;border-radius:8px;border:none;cursor:pointer;
                            background:#fee2e2;color:#dc2626;font-size:13px;font-weight:600">
                          🗑 Xoá ví dụ
                        </button>` : ''}
                      </div>
                    </div>` : ''}
                </div>`
              }).join('')}
            </div>`}
        </div>
      </div>`

    if (editingWord) {
      const ta = document.getElementById(`ex-input-${editingWord.replace(/\s+/g,'-')}`)
      if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length) }
    }
    if (editingMeaning) {
      const inp = document.getElementById(`meaning-input-${editingMeaning.replace(/\s+/g,'-')}`)
      if (inp) { inp.focus(); inp.select() }
    }
  }

  // ── Handlers ───────────────────────────────────────────────────────────────
  window.mvTab    = t => { tab = t; render() }
  window.mvSearch = q => { search = q; render() }
  window.mvSpeak  = (text, lang) => speak(text, lang)

  window.mvEditEx = key => {
    if (editingWord === key) { editingWord = null; editingEx = ''; render(); return }
    editingWord    = key
    editingEx      = exMap[key] || ''
    editingMeaning = null; editingMeaningVal = ''
    render()
  }

  window.mvCancelEx = () => { editingWord = null; editingEx = ''; render() }

  window.mvEditMeaning = key => {
    if (editingMeaning === key) { editingMeaning = null; editingMeaningVal = ''; render(); return }
    editingMeaning    = key
    editingMeaningVal = meaningMap[key] || (() => {
      const all = [...toeicWords, ...chineseWords]
      return all.find(x => (x.word || '').toLowerCase().trim() === key)?.meaning || ''
    })()
    editingWord = null; editingEx = ''
    render()
  }

  window.mvCancelMeaning = () => { editingMeaning = null; editingMeaningVal = ''; render() }

  window.mvSaveMeaning = async (key) => {
    const inp = document.getElementById(`meaning-input-${key.replace(/\s+/g,'-')}`)
    const val = (inp?.value ?? editingMeaningVal).trim()
    if (!val) { window.mvCancelMeaning(); return }
    saving = true; render()

    let deckId = deckIdMap[key] || defaultDeckId
    if (!deckId) {
      const { data: nd } = await supabase.from('vocab_decks')
        .insert({ user_id: uid, name: '📚 Kho từ vựng' }).select().single()
      if (nd) { defaultDeckId = nd.id; deckId = nd.id }
    }

    const allWords = [...toeicWords, ...chineseWords]
    const w = allWords.find(x => (x.word || '').toLowerCase().trim() === key)
    const displayWord = w?.word || key

    if (deckId) {
      await supabase.from('vocab_deck_items').upsert(
        { deck_id: deckId, user_id: uid, word: displayWord, meaning: val, example: exMap[key] || '' },
        { onConflict: 'deck_id,word' }
      )
      meaningMap[key] = val
      deckIdMap[key]  = deckId
      if (w) w.meaning = val
    }

    saving = false; editingMeaning = null; editingMeaningVal = ''
    render()
  }

  window.mvSaveEx = async (key) => {
    const ta = document.getElementById(`ex-input-${key.replace(/\s+/g,'-')}`)
    const val = (ta?.value || editingEx).trim()
    saving = true; render()

    // Need a deck_id — use existing or create default deck
    let deckId = deckIdMap[key] || defaultDeckId
    if (!deckId) {
      const { data: nd } = await supabase.from('vocab_decks')
        .insert({ user_id: uid, name: '📚 Kho từ vựng' }).select().single()
      if (nd) { defaultDeckId = nd.id; deckId = nd.id }
    }

    // Find the display word from toeicWords / chineseWords
    const allWords = [...toeicWords, ...chineseWords]
    const w = allWords.find(x => (x.word || '').toLowerCase().trim() === key)
    const displayWord = w?.word || key

    if (deckId) {
      await supabase.from('vocab_deck_items').upsert(
        { deck_id: deckId, user_id: uid, word: displayWord,
          meaning: meaningMap[key] || w?.meaning || '', example: val },
        { onConflict: 'deck_id,word' }
      )
      exMap[key]     = val
      deckIdMap[key] = deckId
    }

    saving = false
    editingWord = null
    editingEx   = ''
    render()
  }

  window.mvDeleteEx = async (key) => {
    const deckId = deckIdMap[key]
    if (!deckId) { window.mvCancelEx(); return }
    await supabase.from('vocab_deck_items')
      .update({ example: '' })
      .eq('deck_id', deckId).eq('user_id', uid).eq('word', key)
    exMap[key] = ''
    editingWord = null; editingEx = ''
    render()
  }

  // ── Image handlers ─────────────────────────────────────────────────────────
  const imgPickerOpen = {}  // key → bool

  window.mvToggleImg = async (key, word) => {
    const safeKey = key.replace(/\s+/g,'-')
    const picker  = document.getElementById(`imgpicker-${safeKey}`)
    if (!picker) return
    const open = picker.style.display !== 'none' && picker.style.display !== ''
    if (open) { picker.style.display = 'none'; return }
    picker.style.display = 'block'

    const grid    = document.getElementById(`imggrid-${safeKey}`)
    const loading = document.getElementById(`imgloading-${safeKey}`)
    grid.innerHTML = ''

    const pixabayKey = localStorage.getItem('ll_pixabay_key') || ''
    if (!pixabayKey) {
      loading.style.display = 'none'
      grid.innerHTML = `
        <div style="padding:10px 0">
          <div style="font-size:13px;color:#64748b;margin-bottom:8px">
            Nhập <strong>Pixabay API key</strong> miễn phí để tìm ảnh.<br>
            Đăng ký tại <a href="https://pixabay.com/api/docs/" target="_blank" style="color:#2563eb">pixabay.com/api/docs</a>
          </div>
          <div style="display:flex;gap:8px;align-items:center">
            <input id="pixabay-key-input" type="text" placeholder="Dán API key vào đây..."
              style="flex:1;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;outline:none"
              onfocus="this.style.borderColor='#2563eb'" onblur="this.style.borderColor='#e2e8f0'">
            <button onclick="mvSavePixabayKey('${escAttr(key)}','${escAttr(word)}')"
              style="padding:8px 16px;background:#2563eb;color:white;border:none;border-radius:8px;
                font-size:13px;font-weight:600;cursor:pointer">
              Lưu & tìm
            </button>
          </div>
        </div>`
      return
    }

    loading.style.display = 'block'
    loading.textContent = 'Đang tìm ảnh...'

    try {
      const res  = await fetch(
        `https://pixabay.com/api/?key=${pixabayKey}&q=${encodeURIComponent(word)}&image_type=photo&per_page=6&safesearch=true&lang=en`
      )
      const data = await res.json()
      loading.style.display = 'none'
      if (!data.hits?.length) {
        grid.innerHTML = `<span style="font-size:13px;color:#94a3b8">Không tìm thấy ảnh cho "${word}"</span>`
        return
      }
      grid.innerHTML = data.hits.map(h =>
        `<img src="${h.previewURL}" class="img-choice" onclick="mvPickImg('${escAttr(key)}','${escAttr(h.webformatURL)}')" title="${escAttr(h.tags)}">`
      ).join('')
    } catch(e) {
      loading.style.display = 'none'
      grid.innerHTML = `<span style="font-size:13px;color:#ef4444">Lỗi: ${e.message}. Kiểm tra lại API key.</span>
        <button onclick="localStorage.removeItem('ll_pixabay_key');mvToggleImg('${escAttr(key)}','${escAttr(word)}')"
          style="margin-left:8px;font-size:12px;color:#64748b;background:none;border:none;cursor:pointer;text-decoration:underline">
          Đổi key
        </button>`
    }
  }

  window.mvSavePixabayKey = async (key, word) => {
    const inp = document.getElementById('pixabay-key-input')
    const k   = (inp?.value || '').trim()
    if (!k) return
    localStorage.setItem('ll_pixabay_key', k)
    await window.mvToggleImg(key, word)
  }

  window.mvPickImg = async (key, url) => {
    let deckId = deckIdMap[key] || defaultDeckId
    if (!deckId) {
      const { data: nd } = await supabase.from('vocab_decks')
        .insert({ user_id: uid, name: '📚 Kho từ vựng' }).select().single()
      if (nd) { defaultDeckId = nd.id; deckId = nd.id }
    }
    const allWords = [...toeicWords, ...chineseWords]
    const w = allWords.find(x => (x.word || '').toLowerCase().trim() === key)
    const displayWord = w?.word || key
    if (deckId) {
      await supabase.from('vocab_deck_items').upsert(
        { deck_id: deckId, user_id: uid, word: displayWord,
          meaning: meaningMap[key] || w?.meaning || '', example: exMap[key] || '', image_url: url },
        { onConflict: 'deck_id,word' }
      )
      imageMap[key]  = url
      deckIdMap[key] = deckId
    }
    render()
  }

  window.mvRemoveImg = async (key) => {
    const deckId = deckIdMap[key]
    if (!deckId) return
    await supabase.from('vocab_deck_items')
      .update({ image_url: '' })
      .eq('deck_id', deckId).eq('user_id', uid)
      .ilike('word', key)
    imageMap[key] = ''
    render()
  }

  render()
}
