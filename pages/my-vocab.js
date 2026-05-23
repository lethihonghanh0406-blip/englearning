import { supabase } from '../supabase/client.js'
import { requireAuth } from '../utils/auth.js'

export default async function myVocabPage(app) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) { requireAuth(() => {}); return }
  const uid = session.user.id

  let tab      = 'all'   // 'all' | 'toeic' | 'chinese'
  let search   = ''
  let toeicWords   = []
  let chineseWords = []

  app.innerHTML = `
    <div style="min-height:100vh;background:#f8faff;display:flex;align-items:center;justify-content:center">
      <div style="color:#64748b;font-size:14px">Đang tải từ vựng...</div>
    </div>`

  // Load English words from 3 sources: user_vocab_srs (scanner+flashcard), user_vocab_learned, vocab_deck_items
  const [{ data: srsRows }, { data: learnedRows }, { data: deckItems }] = await Promise.all([
    supabase.from('user_vocab_srs')
      .select('vocab_id, word, meaning, last_reviewed_at')
      .eq('user_id', uid).order('last_reviewed_at', { ascending: false }),
    supabase.from('user_vocab_learned')
      .select('vocab_id, learned_at').eq('user_id', uid),
    supabase.from('vocab_deck_items')
      .select('word, meaning, updated_at').eq('user_id', uid).order('updated_at', { ascending: false }),
  ])

  // Fetch question_vocab details for all vocab_ids
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

  // Merge all sources, dedup by lowercase word
  const seen = new Set()
  const addWord = (word, meaning, ts) => {
    const key = (word || '').toLowerCase().trim()
    if (!key || seen.has(key)) return
    seen.add(key)
    toeicWords.push({ word, meaning: meaning || '', learned_at: ts, source: 'toeic' })
  }

  // 1. SRS (scanner + flashcard)
  for (const r of (srsRows || [])) {
    const v = r.vocab_id ? vocabMap[r.vocab_id] : null
    addWord(v?.word || r.word, v?.meaning || r.meaning, r.last_reviewed_at)
  }
  // 2. Learned (flashcard only — may not be in SRS yet)
  for (const r of (learnedRows || [])) {
    const v = r.vocab_id ? vocabMap[r.vocab_id] : null
    if (v) addWord(v.word, v.meaning, r.learned_at)
  }
  // 3. Deck items (saved via scanner popup to a deck)
  for (const r of (deckItems || [])) {
    addWord(r.word, r.meaning, r.updated_at)
  }

  toeicWords.sort((a, b) => new Date(b.learned_at || 0) - new Date(a.learned_at || 0))

  // Load Chinese learned vocab
  const { data: chineseRows } = await supabase
    .from('chinese_srs')
    .select('chinese_vocab_id, last_reviewed_at, interval, ease_factor')
    .eq('user_id', uid)
    .order('last_reviewed_at', { ascending: false })

  const chineseIds = (chineseRows || []).map(r => r.chinese_vocab_id).filter(Boolean)
  if (chineseIds.length) {
    const { data: cvRows } = await supabase
      .from('chinese_vocab').select('id, char, pinyin, vi').in('id', chineseIds)
    const srsMap = {}
    for (const r of chineseRows) srsMap[r.chinese_vocab_id] = r
    chineseWords = (cvRows || []).map(v => ({ ...v, word: v.char, meaning: v.vi, ...srsMap[v.id], source: 'chinese' }))
      .sort((a, b) => new Date(b.last_reviewed_at) - new Date(a.last_reviewed_at))
  }

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

  function render() {
    const list = getFiltered()
    const total = toeicWords.length + chineseWords.length
    const tabs = [
      { id: 'all',     label: `Tất cả (${total})` },
      { id: 'toeic',   label: `🇬🇧 Tiếng Anh (${toeicWords.length})` },
      { id: 'chinese', label: `🇨🇳 Tiếng Trung (${chineseWords.length})` },
    ]

    app.innerHTML = `
      <style>
        .vocab-row { background:white; border-radius:12px; border:1px solid #e2e8f0; padding:14px 18px;
          display:flex; align-items:center; gap:14px; transition:box-shadow .15s; }
        .vocab-row:hover { box-shadow:0 4px 16px rgba(0,0,0,.07); }
        .speak-btn { background:none; border:none; cursor:pointer; font-size:18px; padding:4px 8px;
          border-radius:8px; transition:background .15s; }
        .speak-btn:hover { background:#f1f5f9; }
        #mv-search:focus { border-color:#2563eb !important; outline:none; }
      </style>
      <div style="min-height:100vh;background:#f8faff;padding:32px 20px">
        <div style="max-width:860px;margin:0 auto">

          <!-- Header -->
          <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px;flex-wrap:wrap">
            <button onclick="history.back()" style="background:none;border:none;cursor:pointer;color:#64748b;font-size:14px;padding:0">← Quay lại</button>
            <div>
              <h1 style="font-size:24px;font-weight:800;color:#0f172a;margin:0;font-family:'Space Grotesk',sans-serif">📖 Kho từ vựng của tôi</h1>
              <p style="font-size:13px;color:#64748b;margin:4px 0 0"><strong>${total}</strong> từ đã học</p>
            </div>
          </div>

          <!-- Search + Tabs -->
          <div style="display:flex;gap:12px;align-items:center;margin-bottom:16px;flex-wrap:wrap">
            <input id="mv-search" type="text" placeholder="🔍  Tìm từ, nghĩa, pinyin..."
              value="${search}"
              oninput="mvSearch(this.value)"
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

          <!-- List -->
          ${list.length === 0 ? `
            <div style="text-align:center;padding:60px 20px;color:#94a3b8">
              <div style="font-size:40px;margin-bottom:12px">${total === 0 ? '📚' : '🔍'}</div>
              <p style="font-size:15px">${total === 0 ? 'Chưa có từ nào. Hãy học thêm từ vựng nhé!' : 'Không tìm thấy từ phù hợp'}</p>
              ${total === 0 ? `<button onclick="navigate('/toeic/vocabulary')"
                style="margin-top:12px;padding:10px 24px;background:#2563eb;color:white;border:none;border-radius:10px;cursor:pointer;font-size:14px;font-weight:600">
                Học từ vựng TOEIC →
              </button>` : ''}
            </div>` : `
            <div style="display:flex;flex-direction:column;gap:8px">
              ${list.map(w => `
                <div class="vocab-row">
                  ${w.source === 'chinese'
                    ? `<div style="font-size:28px;font-weight:800;color:#0f172a;min-width:44px;text-align:center;font-family:serif">${w.char || w.word}</div>`
                    : `<div style="font-size:18px;font-weight:700;color:#0f172a;min-width:100px">${w.word}</div>`
                  }
                  <div style="flex:1;min-width:0">
                    ${w.source === 'chinese' && w.pinyin ? `<div style="font-size:13px;color:#f97316;font-weight:600;margin-bottom:2px">${w.pinyin}</div>` : ''}
                    <div style="font-size:14px;color:#475569;line-height:1.4">${w.meaning || '—'}</div>
                  </div>
                  <span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;flex-shrink:0;
                    background:${w.source==='chinese'?'#fff7ed':'#eff6ff'};
                    color:${w.source==='chinese'?'#c2410c':'#1d4ed8'}">
                    ${w.source==='chinese'?'中文':'EN'}
                  </span>
                  <button class="speak-btn" onclick="mvSpeak('${(w.word||'').replace(/'/g,"\\'")}','${w.source==='chinese'?'zh-CN':'en-US'}')" title="Nghe phát âm">🔊</button>
                </div>`).join('')}
            </div>`}

        </div>
      </div>`
  }

  window.mvTab = t => { tab = t; render() }
  window.mvSearch = q => { search = q; render() }
  window.mvSpeak  = (text, lang) => speak(text, lang)

  render()
}
