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
  let editingWord    = null
  let editingEx      = ''
  let editingMeaning = null
  let editingMeaningVal = ''
  let saving      = false
  const exMap      = {}
  const meaningMap = {}
  const deckIdMap  = {}
  const deckWordMap = {}
  let defaultDeckId = null

  let showAddForm = false
  let addLang     = 'en'
  let addWord     = ''
  let addPinyin   = ''
  let addMeaning  = ''
  let addExample  = ''
  let addSaving   = false

  let confirmDeleteKey = null  // key đang chờ xác nhận xoá

  app.innerHTML = `
    <div style="min-height:100vh;background:#f8faff;display:flex;align-items:center;justify-content:center">
      <div style="color:#64748b;font-size:14px">Đang tải từ vựng...</div>
    </div>`

  const [{ data: srsRows }, { data: learnedRows }, { data: deckItems }, { data: decks }] = await Promise.all([
    supabase.from('user_vocab_srs')
      .select('vocab_id, word, meaning, last_reviewed_at').eq('user_id', uid)
      .order('last_reviewed_at', { ascending: false }),
    supabase.from('user_vocab_learned')
      .select('vocab_id, learned_at').eq('user_id', uid),
    supabase.from('vocab_deck_items')
      .select('word, meaning, example, deck_id, updated_at').eq('user_id', uid)
      .order('updated_at', { ascending: false }),
    supabase.from('vocab_decks').select('id, name').eq('user_id', uid).order('created_at').limit(1),
  ])

  defaultDeckId = decks?.[0]?.id || null

  const isZhWord = w => /[一-鿿]/.test(w || '')

  for (const r of (deckItems || [])) {
    const key = (r.word || '').toLowerCase().trim()
    if (!key || deckIdMap[key]) continue
    deckIdMap[key]   = r.deck_id
    deckWordMap[key] = r.word
    if (r.meaning) meaningMap[key] = r.meaning
    if (isZhWord(r.word)) {
      // example field dùng để lưu pinyin cho từ Trung thêm tay
    } else {
      exMap[key] = r.example || ''
    }
  }

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

  const seen = new Set()
  const pushWord = (word, meaning, ts, vocabId = null) => {
    const key = (word || '').toLowerCase().trim()
    if (!key || seen.has(key)) return
    seen.add(key)
    toeicWords.push({ word, meaning: meaning || '', learned_at: ts, source: 'toeic', vocabId })
  }
  for (const r of (srsRows || [])) {
    const v = r.vocab_id ? vocabMap[r.vocab_id] : null
    pushWord(v?.word || r.word, v?.meaning || r.meaning, r.last_reviewed_at, r.vocab_id || null)
  }
  for (const r of (learnedRows || [])) {
    const v = r.vocab_id ? vocabMap[r.vocab_id] : null
    if (v) pushWord(v.word, v.meaning, r.learned_at, v.id)
  }
  for (const r of (deckItems || [])) {
    if (isZhWord(r.word)) {
      const key = (r.word || '').toLowerCase().trim()
      if (key && !seen.has(key)) {
        seen.add(key)
        // example field chứa JSON {p: pinyin, e: example} hoặc plain pinyin (cũ)
        let pinyin = '', exSentence = ''
        try {
          const parsed = JSON.parse(r.example || 'null')
          if (parsed && typeof parsed === 'object') { pinyin = parsed.p || ''; exSentence = parsed.e || '' }
          else pinyin = r.example || ''
        } catch { pinyin = r.example || '' }
        if (exSentence) exMap[key] = exSentence
        chineseWords.push({
          char: r.word, word: r.word, pinyin,
          meaning: r.meaning || '', vi: r.meaning || '',
          source: 'chinese', last_reviewed_at: r.updated_at, fromDeck: true,
        })
      }
    } else {
      pushWord(r.word, r.meaning, r.updated_at)
    }
  }
  toeicWords.sort((a, b) => new Date(b.learned_at || 0) - new Date(a.learned_at || 0))

  const { data: chineseRows } = await supabase
    .from('chinese_srs').select('chinese_vocab_id, last_reviewed_at')
    .eq('user_id', uid).order('last_reviewed_at', { ascending: false })
  const chineseIds = (chineseRows || []).map(r => r.chinese_vocab_id).filter(Boolean)
  if (chineseIds.length) {
    const { data: cvRows } = await supabase
      .from('chinese_vocab').select('id, char, pinyin, vi').in('id', chineseIds)
    const srsMap = {}
    for (const r of chineseRows) srsMap[r.chinese_vocab_id] = r
    const srsWords = (cvRows || []).map(v => ({
      ...v, word: v.char, meaning: v.vi, ...srsMap[v.id], source: 'chinese'
    }))
    // Merge với từ Trung từ deck (tránh trùng)
    for (const w of srsWords) {
      const key = (w.word || '').toLowerCase().trim()
      if (!seen.has(key)) { seen.add(key); chineseWords.push(w) }
    }
  }
  chineseWords.sort((a, b) => new Date(b.last_reviewed_at || 0) - new Date(a.last_reviewed_at || 0))

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
      </style>
      <div style="min-height:100vh;background:#f8faff;padding:32px 20px">
        <div style="max-width:860px;margin:0 auto">

          <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px;flex-wrap:wrap">
            <button onclick="history.back()" style="background:none;border:none;cursor:pointer;color:#64748b;font-size:14px;padding:0">← Quay lại</button>
            <div style="flex:1">
              <h1 style="font-size:24px;font-weight:800;color:#0f172a;margin:0;font-family:'Space Grotesk',sans-serif">📖 Kho từ vựng của tôi</h1>
              <p style="font-size:13px;color:#64748b;margin:4px 0 0"><strong>${total}</strong> từ đã học</p>
            </div>
            <button onclick="mvToggleAdd()"
              style="padding:9px 18px;border-radius:10px;border:none;cursor:pointer;font-size:13px;font-weight:700;
                background:${showAddForm?'#f1f5f9':'#2563eb'};color:${showAddForm?'#64748b':'white'};transition:all .15s">
              ${showAddForm ? '✕ Đóng' : '＋ Thêm từ mới'}
            </button>
          </div>

          ${showAddForm ? `
          <div style="background:white;border-radius:14px;border:1px solid #e2e8f0;padding:20px 24px;margin-bottom:20px;box-shadow:0 2px 12px rgba(0,0,0,.05)">
            <div style="font-size:13px;font-weight:700;color:#64748b;letter-spacing:.5px;margin-bottom:12px">THÊM TỪ MỚI</div>

            <div style="display:flex;gap:8px;margin-bottom:16px">
              <button onclick="mvAddLang('en')"
                style="padding:8px 20px;border-radius:10px;border:2px solid ${addLang==='en'?'#2563eb':'#e2e8f0'};
                  background:${addLang==='en'?'#eff6ff':'white'};color:${addLang==='en'?'#2563eb':'#64748b'};
                  font-size:13px;font-weight:700;cursor:pointer">
                🇬🇧 Tiếng Anh
              </button>
              <button onclick="mvAddLang('zh')"
                style="padding:8px 20px;border-radius:10px;border:2px solid ${addLang==='zh'?'#f97316':'#e2e8f0'};
                  background:${addLang==='zh'?'#fff7ed':'white'};color:${addLang==='zh'?'#f97316':'#64748b'};
                  font-size:13px;font-weight:700;cursor:pointer">
                🇨🇳 Tiếng Trung
              </button>
            </div>

            <div style="display:flex;flex-direction:column;gap:10px">
              <div style="display:flex;gap:10px;flex-wrap:wrap">
                <div style="flex:1;min-width:140px">
                  <div style="font-size:11px;font-weight:600;color:#94a3b8;margin-bottom:4px">
                    ${addLang==='zh' ? 'CHỮ HÁN' : 'TỪ TIẾNG ANH'}
                  </div>
                  <input id="add-word" type="text" value="${addWord}"
                    oninput="mvAddField('word',this.value)"
                    placeholder="${addLang==='zh' ? 'VD: 你好' : 'VD: treasure'}"
                    style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #e2e8f0;
                      border-radius:9px;font-size:${addLang==='zh'?'20px':'14px'};outline:none;
                      font-family:${addLang==='zh'?'serif':'inherit'};color:#0f172a;background:#f8faff"
                    onfocus="this.style.borderColor='#2563eb'" onblur="this.style.borderColor='#e2e8f0'">
                </div>
                ${addLang==='zh' ? `
                <div style="flex:1;min-width:120px">
                  <div style="font-size:11px;font-weight:600;color:#94a3b8;margin-bottom:4px">PINYIN</div>
                  <input id="add-pinyin" type="text" value="${addPinyin}"
                    oninput="mvAddField('pinyin',this.value)"
                    placeholder="VD: nǐ hǎo"
                    style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #e2e8f0;
                      border-radius:9px;font-size:14px;outline:none;color:#f97316;background:#f8faff"
                    onfocus="this.style.borderColor='#f97316'" onblur="this.style.borderColor='#e2e8f0'">
                </div>` : ''}
                <div style="flex:2;min-width:160px">
                  <div style="font-size:11px;font-weight:600;color:#94a3b8;margin-bottom:4px">NGHĨA TIẾNG VIỆT</div>
                  <input id="add-meaning" type="text" value="${addMeaning}"
                    oninput="mvAddField('meaning',this.value)"
                    placeholder="${addLang==='zh'?'VD: số tám':'VD: kho báu'}"
                    style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #e2e8f0;
                      border-radius:9px;font-size:14px;outline:none;color:#0f172a;background:#f8faff"
                    onfocus="this.style.borderColor='#2563eb'" onblur="this.style.borderColor='#e2e8f0'">
                </div>
              </div>

              <div>
                <div style="font-size:11px;font-weight:600;color:#94a3b8;margin-bottom:4px">CÂU VÍ DỤ (tuỳ chọn)</div>
                <input id="add-example" type="text" value="${addExample}"
                  oninput="mvAddField('example',this.value)"
                  onkeydown="if(event.key==='Enter')mvSaveAdd()"
                  placeholder="${addLang==='zh'?'VD: 八是一个吉祥数字。':'VD: The treasure was hidden underground.'}"
                  style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #e2e8f0;
                    border-radius:9px;font-size:14px;outline:none;color:#0f172a;background:#f8faff"
                  onfocus="this.style.borderColor='#2563eb'" onblur="this.style.borderColor='#e2e8f0'">
              </div>

              <div style="display:flex;gap:8px;align-items:center">
                <button onclick="mvSaveAdd()" ${addSaving?'disabled':''}
                  style="padding:9px 24px;border-radius:9px;border:none;cursor:pointer;background:#2563eb;
                    color:white;font-size:13px;font-weight:700;opacity:${addSaving?'.6':'1'}">
                  ${addSaving ? '...' : '💾 Lưu từ'}
                </button>
                <button onclick="mvCancelAdd()"
                  style="padding:9px 14px;border-radius:9px;border:none;cursor:pointer;background:#f1f5f9;
                    color:#64748b;font-size:13px;font-weight:600">
                  Huỷ
                </button>
                <span id="add-status" style="font-size:13px;color:#16a34a;margin-left:4px"></span>
              </div>
            </div>
          </div>` : ''}

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
                const isEditing        = editingWord === key
                const isMeaningEditing = editingMeaning === key
                const isConfirmDelete  = confirmDeleteKey === key
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
                    <button class="edit-btn" onclick="mvEditEx('${escAttr(key)}')" title="${ex ? 'Sửa ví dụ' : 'Thêm ví dụ'}">
                      ${isEditing ? '✕' : (ex ? '📝' : '＋')}
                    </button>
                    <button class="edit-btn" onclick="mvConfirmDelete('${escAttr(key)}')" title="Xoá từ"
                      style="color:${isConfirmDelete?'#dc2626':'#cbd5e1'}">🗑</button>
                  </div>

                  ${isConfirmDelete ? `
                    <div style="margin-top:10px;display:flex;align-items:center;gap:10px;
                      background:#fef2f2;border-radius:9px;padding:10px 14px">
                      <span style="font-size:13px;color:#dc2626;flex:1">Xoá từ "<strong>${w.word}</strong>" khỏi kho từ vựng?</span>
                      <button onclick="mvDeleteWord('${escAttr(key)}','${w.source}')"
                        style="padding:6px 16px;border-radius:7px;border:none;cursor:pointer;
                          background:#dc2626;color:white;font-size:13px;font-weight:700">
                        Xoá
                      </button>
                      <button onclick="mvConfirmDelete('')"
                        style="padding:6px 12px;border-radius:7px;border:none;cursor:pointer;
                          background:#f1f5f9;color:#64748b;font-size:13px">
                        Huỷ
                      </button>
                    </div>` : ''}

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

  window.mvTab    = t => { tab = t; render() }
  window.mvSearch = q => { search = q; render() }
  window.mvSpeak  = (text, lang) => speak(text, lang)

  window.mvConfirmDelete = key => { confirmDeleteKey = key || null; render() }

  window.mvDeleteWord = async (key, source) => {
    const allWords    = [...toeicWords, ...chineseWords]
    const w           = allWords.find(x => (x.word || '').toLowerCase().trim() === key)
    if (!w) return

    if (source === 'chinese') {
      if (w.fromDeck) {
        // Từ Trung thêm tay → xoá khỏi vocab_deck_items
        if (deckIdMap[key]) {
          await supabase.from('vocab_deck_items')
            .delete().eq('user_id', uid).eq('deck_id', deckIdMap[key])
            .eq('word', deckWordMap[key] || w.word)
          delete deckIdMap[key]; delete deckWordMap[key]
          delete meaningMap[key]
        }
      } else {
        // Từ Trung từ chinese_srs
        await supabase.from('chinese_srs')
          .delete().eq('user_id', uid).eq('chinese_vocab_id', w.id)
      }
      chineseWords = chineseWords.filter(x => x !== w)
      seen.delete(key)
    } else {
      const displayWord = w.word
      // Xoá khỏi user_vocab_srs
      await supabase.from('user_vocab_srs')
        .delete().eq('user_id', uid).ilike('word', displayWord)
      // Xoá khỏi user_vocab_learned nếu có vocab_id
      if (w.vocabId) {
        await supabase.from('user_vocab_learned')
          .delete().eq('user_id', uid).eq('vocab_id', w.vocabId)
      }
      // Xoá khỏi vocab_deck_items nếu có
      if (deckIdMap[key]) {
        await supabase.from('vocab_deck_items')
          .delete().eq('user_id', uid).eq('deck_id', deckIdMap[key])
          .eq('word', deckWordMap[key] || displayWord)
        delete deckIdMap[key]; delete deckWordMap[key]
        delete exMap[key]; delete meaningMap[key]
      }
      toeicWords = toeicWords.filter(x => x !== w)
      seen.delete(key)
    }

    confirmDeleteKey = null
    render()
  }

  window.mvToggleAdd = () => { showAddForm = !showAddForm; render() }
  window.mvCancelAdd = () => { showAddForm = false; addWord = ''; addPinyin = ''; addMeaning = ''; addExample = ''; render() }
  window.mvAddLang   = l => { addLang = l; render() }
  window.mvAddField  = (f, v) => {
    if (f === 'word')    addWord    = v
    if (f === 'pinyin')  addPinyin  = v
    if (f === 'meaning') addMeaning = v
    if (f === 'example') addExample = v
  }

  window.mvSaveAdd = async () => {
    const word    = addWord.trim()
    const meaning = addMeaning.trim()
    const pinyin  = addPinyin.trim()
    if (!word || !meaning) {
      document.getElementById('add-status').textContent = '⚠ Nhập đủ từ và nghĩa'
      return
    }
    addSaving = true; render()

    if (addLang === 'zh') {
      // Lưu vào vocab_deck_items: word=chữ Hán, meaning=nghĩa, example=pinyin
      let deckId = defaultDeckId
      if (!deckId) {
        const { data: nd } = await supabase.from('vocab_decks')
          .insert({ user_id: uid, name: '📚 Kho từ vựng' }).select('id').single()
        if (nd) { defaultDeckId = nd.id; deckId = nd.id }
      }
      if (deckId) {
        const exData = JSON.stringify({ p: pinyin, e: addExample.trim() })
        const { error } = await supabase.from('vocab_deck_items')
          .insert({ deck_id: deckId, user_id: uid, word, meaning, example: exData })
        if (!error) {
          const key = word.toLowerCase().trim()
          deckIdMap[key]   = deckId
          deckWordMap[key] = word
          if (addExample.trim()) exMap[key] = addExample.trim()
          if (!seen.has(key)) {
            seen.add(key)
            chineseWords.unshift({
              char: word, word, pinyin, meaning, vi: meaning,
              source: 'chinese', last_reviewed_at: new Date().toISOString(), fromDeck: true,
            })
          }
        } else console.error('add zh error:', error)
      }
    } else {
      // Thêm vào user_vocab_srs (English)
      const { error } = await supabase.from('user_vocab_srs')
        .insert({ user_id: uid, word, meaning })

      if (!error) {
        const key = word.toLowerCase().trim()
        // Nếu có ví dụ → lưu thêm vào vocab_deck_items
        if (addExample.trim()) {
          let deckId = defaultDeckId
          if (!deckId) {
            const { data: nd } = await supabase.from('vocab_decks')
              .insert({ user_id: uid, name: '📚 Kho từ vựng' }).select('id').single()
            if (nd) { defaultDeckId = nd.id; deckId = nd.id }
          }
          if (deckId) {
            await supabase.from('vocab_deck_items')
              .insert({ deck_id: deckId, user_id: uid, word, meaning, example: addExample.trim() })
            exMap[key] = addExample.trim()
            deckIdMap[key] = deckId; deckWordMap[key] = word
          }
        }
        if (!toeicWords.find(x => (x.word || '').toLowerCase() === key)) {
          toeicWords.unshift({ word, meaning, source: 'toeic', learned_at: new Date().toISOString() })
        }
      } else console.error('add english error:', error)
    }

    addSaving = false
    addWord = ''; addPinyin = ''; addMeaning = ''; addExample = ''
    // Giữ form mở để thêm tiếp
    render()
    setTimeout(() => {
      const el = document.getElementById('add-status')
      if (el) { el.textContent = '✓ Đã lưu'; setTimeout(() => { if (el) el.textContent = '' }, 2000) }
      document.getElementById('add-word')?.focus()
    }, 0)
  }

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

    const allWords   = [...toeicWords, ...chineseWords]
    const w          = allWords.find(x => (x.word || '').toLowerCase().trim() === key)
    const displayWord = w?.word || key

    let saved = false

    if (deckIdMap[key]) {
      // Row already exists — UPDATE bằng exact word trong DB
      const { error } = await supabase.from('vocab_deck_items')
        .update({ meaning: val })
        .eq('user_id', uid).eq('deck_id', deckIdMap[key]).eq('word', deckWordMap[key] || displayWord)
      if (!error) saved = true
      else console.error('update meaning error:', error)
    }

    if (!saved) {
      // Chưa có row — cần deck rồi INSERT
      let deckId = defaultDeckId
      if (!deckId) {
        const { data: nd, error: de } = await supabase.from('vocab_decks')
          .insert({ user_id: uid, name: '📚 Kho từ vựng' }).select('id').single()
        if (nd) { defaultDeckId = nd.id; deckId = nd.id }
        else console.error('create deck error:', de)
      }
      if (deckId) {
        const { error } = await supabase.from('vocab_deck_items')
          .insert({ deck_id: deckId, user_id: uid, word: displayWord, meaning: val, example: exMap[key] || '' })
        if (!error) {
          deckIdMap[key]   = deckId
          deckWordMap[key] = displayWord
          saved = true
        } else {
          // Có thể row đã tồn tại (case khác) — thử upsert
          const { error: e2 } = await supabase.from('vocab_deck_items').upsert(
            { deck_id: deckId, user_id: uid, word: displayWord, meaning: val, example: exMap[key] || '' },
            { onConflict: 'deck_id,word' }
          )
          if (!e2) { deckIdMap[key] = deckId; deckWordMap[key] = displayWord; saved = true }
          else console.error('upsert meaning error:', e2)
        }
      }
    }

    if (saved) {
      meaningMap[key] = val
      if (w) w.meaning = val
    }

    saving = false; editingMeaning = null; editingMeaningVal = ''
    render()
  }

  window.mvSaveEx = async (key) => {
    const ta  = document.getElementById(`ex-input-${key.replace(/\s+/g,'-')}`)
    const val = (ta?.value || editingEx).trim()
    saving = true; render()

    const allWords    = [...toeicWords, ...chineseWords]
    const w           = allWords.find(x => (x.word || '').toLowerCase().trim() === key)
    const displayWord = w?.word || key
    const curMeaning  = meaningMap[key] || w?.meaning || ''

    let saved = false

    if (deckIdMap[key]) {
      // Từ Trung fromDeck: giữ pinyin trong JSON
      const exVal = (w?.source === 'chinese' && w?.fromDeck)
        ? JSON.stringify({ p: w.pinyin || '', e: val })
        : val
      const { error } = await supabase.from('vocab_deck_items')
        .update({ example: exVal })
        .eq('user_id', uid).eq('deck_id', deckIdMap[key]).eq('word', deckWordMap[key] || displayWord)
      if (!error) saved = true
      else console.error('update example error:', error)
    }

    if (!saved) {
      let deckId = defaultDeckId
      if (!deckId) {
        const { data: nd } = await supabase.from('vocab_decks')
          .insert({ user_id: uid, name: '📚 Kho từ vựng' }).select('id').single()
        if (nd) { defaultDeckId = nd.id; deckId = nd.id }
      }
      if (deckId) {
        const { error } = await supabase.from('vocab_deck_items')
          .insert({ deck_id: deckId, user_id: uid, word: displayWord, meaning: curMeaning, example: val })
        if (!error) {
          deckIdMap[key]   = deckId
          deckWordMap[key] = displayWord
          saved = true
        } else {
          const { error: e2 } = await supabase.from('vocab_deck_items').upsert(
            { deck_id: deckId, user_id: uid, word: displayWord, meaning: curMeaning, example: val },
            { onConflict: 'deck_id,word' }
          )
          if (!e2) { deckIdMap[key] = deckId; deckWordMap[key] = displayWord; saved = true }
        }
      }
    }

    if (saved) exMap[key] = val
    saving = false; editingWord = null; editingEx = ''
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

  render()
}
