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
  let editingWord = null   // word string currently being edited
  let editingEx   = ''     // textarea value while editing
  let saving      = false
  const exMap     = {}     // word.lower → example string
  const deckIdMap = {}     // word.lower → deck_id (for update)
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
      .select('word, meaning, example, deck_id, updated_at').eq('user_id', uid)
      .order('updated_at', { ascending: false }),
    supabase.from('vocab_decks').select('id, name').eq('user_id', uid).order('created_at').limit(1),
  ])

  defaultDeckId = decks?.[0]?.id || null

  // Build example + deck_id maps from deck items
  for (const r of (deckItems || [])) {
    const key = (r.word || '').toLowerCase().trim()
    if (key) {
      exMap[key]     = r.example || ''
      deckIdMap[key] = r.deck_id
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
        #mv-search:focus { border-color:#2563eb !important; outline:none; }
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
                const isEditing = editingWord === key

                return `<div class="vocab-row" id="vrow-${key.replace(/\s+/g,'-')}">
                  <div class="vocab-main">
                    ${w.source === 'chinese'
                      ? `<div style="font-size:28px;font-weight:800;color:#0f172a;min-width:44px;text-align:center;font-family:serif">${w.char || w.word}</div>`
                      : `<div style="font-size:18px;font-weight:700;color:#0f172a;min-width:100px;flex-shrink:0">${w.word}</div>`
                    }
                    <div style="flex:1;min-width:0">
                      ${w.source === 'chinese' && w.pinyin ? `<div style="font-size:13px;color:#f97316;font-weight:600;margin-bottom:2px">${w.pinyin}</div>` : ''}
                      <div style="font-size:14px;color:#475569;line-height:1.4">${w.meaning || '—'}</div>
                      ${!isEditing && ex ? `<div style="font-size:13px;color:#64748b;font-style:italic;margin-top:4px;line-height:1.5">📝 ${ex}</div>` : ''}
                    </div>
                    <span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;flex-shrink:0;
                      background:${w.source==='chinese'?'#fff7ed':'#eff6ff'};
                      color:${w.source==='chinese'?'#c2410c':'#1d4ed8'}">
                      ${w.source==='chinese'?'中文':'EN'}
                    </span>
                    <button class="speak-btn" onclick="mvSpeak('${escAttr(w.word)}','${w.source==='chinese'?'zh-CN':'en-US'}')" title="Nghe">🔊</button>
                    <button class="edit-btn" onclick="mvEditEx('${escAttr(key)}')" title="${ex ? 'Sửa ví dụ' : 'Thêm ví dụ'}">
                      ${isEditing ? '✕' : (ex ? '✏️' : '＋')}
                    </button>
                  </div>

                  ${isEditing ? `
                    <div style="margin-top:10px">
                      <div style="font-size:11px;font-weight:700;color:#64748b;letter-spacing:.5px;margin-bottom:4px">
                        CÂU VÍ DỤ — gõ xong nhấn Lưu hoặc Enter
                      </div>
                      <textarea id="ex-input-${key.replace(/\s+/g,'-')}" class="ex-area" rows="2"
                        placeholder='Ví dụ: "The doctor gave me a prescription."'
                        onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();mvSaveEx('${escAttr(key)}')}"
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

    // Focus textarea if editing
    if (editingWord) {
      const ta = document.getElementById(`ex-input-${editingWord.replace(/\s+/g,'-')}`)
      if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length) }
    }
  }

  // ── Handlers ───────────────────────────────────────────────────────────────
  window.mvTab    = t => { tab = t; render() }
  window.mvSearch = q => { search = q; render() }
  window.mvSpeak  = (text, lang) => speak(text, lang)

  window.mvEditEx = key => {
    if (editingWord === key) { editingWord = null; editingEx = ''; render(); return }
    editingWord = key
    editingEx   = exMap[key] || ''
    render()
  }

  window.mvCancelEx = () => { editingWord = null; editingEx = ''; render() }

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
        { deck_id: deckId, user_id: uid, word: displayWord, meaning: w?.meaning || '', example: val },
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

  render()
}
