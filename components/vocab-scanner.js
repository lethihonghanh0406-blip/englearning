import { supabase } from '../supabase/client.js'

export async function initVocabScanner() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return
  const uid = session.user.id

  // ── Popup element ──────────────────────────────────────────────────────────
  const el = document.createElement('div')
  el.id = 'vs-popup'
  el.style.cssText = [
    'display:none', 'position:fixed', 'z-index:99999', 'width:320px',
    'background:white', 'border-radius:18px',
    'box-shadow:0 16px 56px rgba(0,0,0,.18),0 2px 8px rgba(0,0,0,.08)',
    'border:1px solid #e2e8f0', "font-family:'Inter',sans-serif", 'overflow:hidden',
  ].join(';')
  document.body.appendChild(el)

  // ── State ──────────────────────────────────────────────────────────────────
  let word = '', tab = 'meaning', dictData = null, viMeaning = null
  let decks = [], addedDeckId = null, mode = 'add'
  let srsAdded = false

  const FREE_LIMIT = 50

  // ── Load decks + plan + word count ────────────────────────────────────────
  let isPro = false
  let savedCount = 0

  async function loadDecks() {
    const { data } = await supabase.from('vocab_decks')
      .select('*').eq('user_id', uid).order('created_at')
    decks = data || []
  }

  async function loadPlanAndCount() {
    const [profileRes, countRes] = await Promise.all([
      supabase.from('profiles').select('plan, plan_expires_at').eq('id', uid).single(),
      supabase.from('vocab_deck_items').select('id', { count: 'exact', head: true }).eq('user_id', uid),
    ])
    const p = profileRes.data
    isPro = p?.plan === 'pro' && (!p.plan_expires_at || new Date(p.plan_expires_at) > new Date())
    savedCount = countRes.count || 0
  }

  await Promise.all([loadDecks(), loadPlanAndCount()])

  // ── Dictionary API (EN definitions) ───────────────────────────────────────
  const dictCache = new Map()
  async function lookupEN(w) {
    const key = w.toLowerCase().trim()
    if (dictCache.has(key)) return dictCache.get(key)
    try {
      const r = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(key)}`)
      const v = r.ok ? (await r.json())[0] || null : null
      dictCache.set(key, v); return v
    } catch { dictCache.set(key, null); return null }
  }

  // ── Vietnamese meaning: DB first → MyMemory fallback ──────────────────────
  const viCache = new Map()
  async function lookupVI(w) {
    const key = w.toLowerCase().trim()
    if (viCache.has(key)) return viCache.get(key)

    // 1. Check question_vocab in DB
    const { data } = await supabase
      .from('question_vocab')
      .select('meaning')
      .ilike('word', key)
      .limit(1)
    if (data?.[0]?.meaning) {
      viCache.set(key, data[0].meaning); return data[0].meaning
    }

    // 2. MyMemory free translation API
    try {
      const r = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(w)}&langpair=en|vi`)
      const d = await r.json()
      const t = d?.responseData?.translatedText
      const result = (t && t !== w && !t.startsWith('PLEASE SELECT')) ? t : null
      viCache.set(key, result); return result
    } catch { viCache.set(key, null); return null }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  function render() {
    const meanings = dictData?.meanings || []
    const phonetic = dictData?.phonetic || dictData?.phonetics?.find(p => p.text)?.text || ''
    // Accept both https:// and // (protocol-relative) audio URLs
    const rawAudio = dictData?.phonetics?.find(p => p.audio)?.audio || ''
    const audio    = rawAudio.startsWith('//') ? 'https:' + rawAudio : rawAudio
    const examples = meanings.flatMap(m => m.definitions.flatMap(d => d.example ? [{ ex: d.example, pos: m.partOfSpeech }] : []))
    const synonyms = [...new Set(meanings.flatMap(m => [...(m.synonyms || []), ...m.definitions.flatMap(d => d.synonyms || [])]))]

    // ── Tab: Nghĩa ──
    let body = ''
    if (tab === 'meaning') {
      if (dictData === null && viMeaning === null) {
        body = `<div style="text-align:center;padding:20px;color:#94a3b8;font-size:13px">Đang tra từ...</div>`
      } else {
        // Vietnamese meaning block (prominent)
        const viBlock = viMeaning ? `
          <div style="background:#eff6ff;border-radius:12px;padding:10px 14px;margin-bottom:12px;border-left:3px solid #2563eb">
            <div style="font-size:11px;font-weight:700;color:#2563eb;letter-spacing:.5px;margin-bottom:4px">TIẾNG VIỆT</div>
            <div style="font-size:15px;font-weight:600;color:#0f172a;line-height:1.5">${viMeaning}</div>
          </div>` : ''

        // English definitions block
        const enBlock = meanings.length ? `
          <div style="margin-top:4px">
            <div style="font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:.5px;margin-bottom:8px">GIẢI THÍCH (ENGLISH)</div>
            ${meanings.slice(0, 2).map(m => `
              <div style="margin-bottom:10px">
                <span style="font-size:11px;background:#f1f5f9;color:#64748b;padding:2px 9px;border-radius:10px;font-weight:600;text-transform:capitalize">${m.partOfSpeech}</span>
                <div style="margin-top:5px">
                  ${m.definitions.slice(0, 2).map((d, i) => `
                    <div style="display:flex;gap:8px;margin-bottom:3px">
                      <span style="font-size:12px;color:#94a3b8;flex-shrink:0;margin-top:1px">${i + 1}.</span>
                      <span style="font-size:12px;color:#374151;line-height:1.6">${d.definition}</span>
                    </div>`).join('')}
                </div>
              </div>`).join('')}
          </div>` : (!viMeaning ? `<div style="text-align:center;padding:12px;color:#94a3b8;font-size:13px">Không tìm thấy nghĩa 😕</div>` : '')

        body = viBlock + enBlock
      }

    } else if (tab === 'example') {
      body = examples.length
        ? examples.slice(0, 4).map(({ ex, pos }) => `
            <div style="margin-bottom:10px;padding:10px 12px;background:#f8faff;border-radius:10px;border-left:3px solid #2563eb">
              <div style="font-size:11px;color:#94a3b8;margin-bottom:3px;text-transform:capitalize;font-weight:600">${pos}</div>
              <div style="font-size:13px;color:#374151;line-height:1.6;font-style:italic">"${ex}"</div>
            </div>`).join('')
        : `<div style="text-align:center;padding:20px;color:#94a3b8;font-size:13px">Không có ví dụ</div>`

    } else {
      body = synonyms.length
        ? `<div style="display:flex;flex-wrap:wrap;gap:6px">
            ${synonyms.slice(0, 12).map(s => `
              <span onclick="window._vsSynClick('${s.replace(/'/g, "\\'")}')"
                style="background:#f1f5f9;color:#374151;padding:5px 12px;border-radius:20px;font-size:12px;cursor:pointer;transition:all .15s"
                onmouseover="this.style.background='#eff6ff';this.style.color='#2563eb'"
                onmouseout="this.style.background='#f1f5f9';this.style.color='#374151'">${s}</span>`).join('')}
          </div>`
        : `<div style="text-align:center;padding:20px;color:#94a3b8;font-size:13px">Không có từ đồng nghĩa</div>`
    }

    // ── Footer ──
    const deckOptions = decks.map(d =>
      `<option value="${d.id}" ${addedDeckId === d.id ? 'selected' : ''}>${d.name}</option>`
    ).join('')

    const footer = mode === 'creating' ? `
      <div style="display:flex;gap:8px">
        <input id="vs-deck-name" placeholder="Tên học phần..." autofocus
          style="flex:1;padding:8px 12px;border:1.5px solid #2563eb;border-radius:10px;font-size:13px;outline:none;color:#0f172a"
          onkeydown="if(event.key==='Enter')window._vsCreateDeck();if(event.key==='Escape')window._vsMode('add')" />
        <button onclick="window._vsCreateDeck()"
          style="padding:8px 14px;background:#2563eb;color:white;border:none;border-radius:10px;cursor:pointer;font-size:13px;font-weight:600">
          Tạo
        </button>
        <button onclick="window._vsMode('add')"
          style="padding:8px 10px;background:#f1f5f9;color:#64748b;border:none;border-radius:10px;cursor:pointer;font-size:13px">
          ✕
        </button>
      </div>` : `
      <div style="display:flex;gap:8px;align-items:center">
        <select id="vs-deck-sel"
          style="flex:1;padding:7px 10px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:12px;color:#374151;background:white;cursor:pointer;outline:none"
          onchange="if(this.value==='__new__')window._vsMode('creating')">
          ${decks.length === 0 ? '<option value="">-- Chọn học phần --</option>' : ''}
          ${deckOptions}
          <option value="__new__">+ Tạo học phần mới...</option>
        </select>
        <button onclick="window._vsAdd()"
          style="flex-shrink:0;padding:7px 16px;
            background:${addedDeckId ? '#f0fdf4' : '#2563eb'};
            color:${addedDeckId ? '#16a34a' : 'white'};
            border:${addedDeckId ? '1.5px solid #86efac' : 'none'};
            border-radius:10px;cursor:pointer;font-size:13px;font-weight:600;transition:all .15s">
          ${addedDeckId ? '✓ Đã thêm' : 'Thêm vào'}
        </button>
      </div>`

    el.innerHTML = `
      <!-- Header -->
      <div style="padding:14px 16px 0">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
          <div style="flex:1;min-width:0">
            <div style="font-size:18px;font-weight:800;color:#0f172a;font-family:'Space Grotesk',sans-serif;line-height:1.2;word-break:break-word">${word}</div>
            <div style="display:flex;align-items:center;gap:8px;margin-top:5px;flex-wrap:wrap">
              ${phonetic ? `<span style="font-size:13px;color:#6366f1;font-style:italic">${phonetic}</span>` : ''}
              ${audio
                ? `<button onclick="window._vsPlayAudio('${audio.replace(/'/g, "\\'")}')"
                    style="display:flex;align-items:center;gap:4px;background:#eff6ff;border:none;cursor:pointer;
                      color:#2563eb;font-size:12px;font-weight:600;padding:3px 10px;border-radius:20px;line-height:1.4">
                    🔊 Nghe
                  </button>`
                : `<button onclick="window._vsSpeak('${word.replace(/'/g, "\\'")}')"
                    style="display:flex;align-items:center;gap:4px;background:#f1f5f9;border:none;cursor:pointer;
                      color:#64748b;font-size:12px;font-weight:600;padding:3px 10px;border-radius:20px;line-height:1.4">
                    🔊 TTS
                  </button>`}
            </div>
          </div>
          <button onclick="document.getElementById('vs-popup').style.display='none'"
            style="background:#f1f5f9;border:none;cursor:pointer;color:#64748b;font-size:14px;line-height:1;padding:5px 9px;border-radius:8px;flex-shrink:0;font-weight:600">
            ✕
          </button>
        </div>

        <!-- Tabs -->
        <div style="display:flex;margin-top:12px;border-bottom:1px solid #f1f5f9">
          ${[['meaning','Nghĩa'],['example','Ví dụ'],['synonym','Đồng nghĩa']].map(([k, lbl]) => `
            <button onclick="window._vsTab('${k}')"
              style="flex:1;padding:7px 0;border:none;border-bottom:2px solid ${tab === k ? '#2563eb' : 'transparent'};
                background:none;cursor:pointer;font-size:12px;font-weight:${tab === k ? 700 : 500};
                color:${tab === k ? '#2563eb' : '#94a3b8'};transition:all .15s">${lbl}
            </button>`).join('')}
        </div>
      </div>

      <!-- Body -->
      <div style="padding:14px 16px;min-height:100px;max-height:200px;overflow-y:auto">
        ${body}
      </div>

      <!-- Footer -->
      <div style="padding:10px 16px 14px;border-top:1px solid #f1f5f9;display:flex;flex-direction:column;gap:8px">
        ${addedDeckId && mode === 'add' ? `
          <div style="display:flex;align-items:center;gap:8px;padding:7px 12px;background:#f0fdf4;border-radius:10px">
            <span style="color:#16a34a">✓</span>
            <span style="font-size:12px;font-weight:600;color:#16a34a;flex:1">
              Đã thêm · ${decks.find(d => d.id === addedDeckId)?.name || 'Học phần'}
            </span>
            ${srsAdded ? `<span style="font-size:11px;font-weight:700;color:#6366f1;background:#eef2ff;padding:2px 8px;border-radius:8px">🧠 SRS</span>` : ''}
          </div>` : ''}
        ${footer}
        ${!isPro ? `
          <div style="display:flex;align-items:center;justify-content:space-between">
            <span style="font-size:11px;color:${savedCount >= FREE_LIMIT ? '#dc2626' : '#94a3b8'}">
              ${savedCount >= FREE_LIMIT
                ? '🔒 Đã đạt giới hạn 50 từ'
                : `📚 ${savedCount}/${FREE_LIMIT} từ đã lưu`}
            </span>
            ${savedCount >= FREE_LIMIT
              ? `<span onclick="navigate('/pricing')" style="font-size:11px;color:#2563eb;font-weight:700;cursor:pointer">Nâng cấp Pro →</span>`
              : `<span style="font-size:11px;color:#94a3b8">${FREE_LIMIT - savedCount} từ còn lại</span>`}
          </div>` : ''}
      </div>`

    if (mode === 'creating') setTimeout(() => document.getElementById('vs-deck-name')?.focus(), 50)
  }

  // ── Window handlers ────────────────────────────────────────────────────────
  window._vsTab       = (t) => { tab = t; render() }
  window._vsMode      = (m) => { mode = m; render() }
  window._vsPlayAudio = (url) => { try { new Audio(url).play() } catch(e) {} }
  window._vsSpeak     = (w)  => {
    speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(w)
    u.lang = 'en-US'; u.rate = 0.9
    speechSynthesis.speak(u)
  }

  window._vsSynClick = async (syn) => {
    word = syn; tab = 'meaning'; dictData = null; viMeaning = null; addedDeckId = null; srsAdded = false
    render()
    ;[dictData, viMeaning] = await Promise.all([lookupEN(syn), lookupVI(syn)])
    render()
  }

  function showLimitModal() {
    el.style.display = 'none'
    const m = document.createElement('div')
    m.id = 'vs-limit-modal'
    m.style.cssText = 'position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:20px'
    m.innerHTML = `
      <div style="background:white;border-radius:22px;padding:36px 32px;max-width:380px;width:100%;text-align:center;box-shadow:0 24px 64px rgba(0,0,0,.2)">
        <div style="font-size:48px;margin-bottom:12px">🔒</div>
        <h3 style="font-size:20px;font-weight:800;color:#0f172a;margin:0 0 8px;font-family:'Space Grotesk',sans-serif">Đã đạt giới hạn Free</h3>
        <p style="font-size:14px;color:#64748b;line-height:1.7;margin:0 0 20px">
          Tài khoản Free chỉ lưu được <strong>${FREE_LIMIT} từ</strong>.<br>
          Nâng cấp Pro để lưu không giới hạn!
        </p>
        <div style="background:#f8faff;border-radius:14px;padding:14px;margin-bottom:20px;text-align:left">
          ${['📚 Lưu từ vựng không giới hạn','🧠 Ôn tập SRS thông minh','🌐 Đọc song ngữ EN–VI','📊 Thống kê chi tiết'].map(f=>
            `<div style="font-size:13px;color:#374151;padding:5px 0;display:flex;align-items:center;gap:8px">
              <span style="color:#16a34a;font-weight:700">✓</span>${f}
            </div>`).join('')}
        </div>
        <button onclick="navigate('/pricing');document.getElementById('vs-limit-modal').remove()"
          style="width:100%;padding:13px;background:#2563eb;color:white;border:none;border-radius:12px;cursor:pointer;font-size:15px;font-weight:700;margin-bottom:10px;box-shadow:0 4px 14px rgba(37,99,235,.3)">
          👑 Nâng cấp Pro ngay
        </button>
        <button onclick="document.getElementById('vs-limit-modal').remove()"
          style="width:100%;padding:11px;background:#f1f5f9;color:#64748b;border:none;border-radius:12px;cursor:pointer;font-size:14px">
          Để sau
        </button>
      </div>`
    document.body.appendChild(m)
    m.addEventListener('click', e => { if (e.target === m) m.remove() })
  }

  async function addToSRS(w, meaning) {
    const today   = new Date().toISOString().split('T')[0]
    const wordKey = w.toLowerCase().trim()
    const base    = { user_id: uid, interval: 1, ease_factor: 2.5, repetitions: 0, due_date: today }

    // Ưu tiên vocab_id từ question_vocab
    const { data: vRows } = await supabase
      .from('question_vocab').select('id').ilike('word', wordKey).limit(1)

    if (vRows?.length) {
      const vocabId = vRows[0].id
      const { data: ex } = await supabase.from('user_vocab_srs')
        .select('id').eq('user_id', uid).eq('vocab_id', vocabId).maybeSingle()
      if (ex) return true  // đã có rồi
      const { error } = await supabase.from('user_vocab_srs').insert({ ...base, vocab_id: vocabId })
      return !error
    }

    // Từ không có trong question_vocab → lưu word/meaning trực tiếp
    const { data: ex } = await supabase.from('user_vocab_srs')
      .select('id').eq('user_id', uid).eq('word', wordKey).is('vocab_id', null).maybeSingle()
    if (ex) return true  // đã có rồi
    const { error } = await supabase.from('user_vocab_srs').insert({ ...base, word: wordKey, meaning: meaning || '' })
    return !error
  }

  async function checkSrsAdded(w) {
    const wordKey = w.toLowerCase().trim()
    const { data: direct } = await supabase.from('user_vocab_srs')
      .select('id').eq('user_id', uid).eq('word', wordKey).is('vocab_id', null).maybeSingle()
    if (direct) return true
    const { data: vRows } = await supabase
      .from('question_vocab').select('id').ilike('word', wordKey).limit(1)
    if (!vRows?.length) return false
    const { data: byvocab } = await supabase.from('user_vocab_srs')
      .select('id').eq('user_id', uid).eq('vocab_id', vRows[0].id).maybeSingle()
    return !!byvocab
  }

  async function checkLimitThenSave(saveFn) {
    // Nếu đã add từ này rồi thì không tính quota
    if (addedDeckId) { await saveFn(); return }
    if (!isPro && savedCount >= FREE_LIMIT) { showLimitModal(); return }
    await saveFn()
    savedCount++
  }

  window._vsAdd = async () => {
    const sel = document.getElementById('vs-deck-sel')
    const deckId = sel?.value
    if (!deckId || deckId === '__new__') { window._vsMode('creating'); return }

    await checkLimitThenSave(async () => {
      const def     = dictData?.meanings?.[0]?.definitions?.[0]
      const meaning = viMeaning || def?.definition || ''
      const example = def?.example || ''

      await supabase.from('vocab_deck_items').upsert({
        deck_id: deckId, user_id: uid,
        word: word.toLowerCase().trim(),
        meaning, example,
      }, { onConflict: 'deck_id,word', ignoreDuplicates: true })

      addedDeckId = deckId
      srsAdded = await addToSRS(word, meaning)
      render()
    })
  }

  window._vsCreateDeck = async () => {
    const name = document.getElementById('vs-deck-name')?.value?.trim()
    if (!name) return

    await checkLimitThenSave(async () => {
      const { data } = await supabase.from('vocab_decks')
        .insert({ user_id: uid, name }).select().single()
      if (!data) return

      decks.push(data)
      mode = 'add'

      const def     = dictData?.meanings?.[0]?.definitions?.[0]
      const meaning = viMeaning || def?.definition || ''
      await supabase.from('vocab_deck_items').upsert({
        deck_id: data.id, user_id: uid,
        word: word.toLowerCase().trim(),
        meaning, example: def?.example || '',
      }, { onConflict: 'deck_id,word', ignoreDuplicates: true })

      addedDeckId = data.id
      srsAdded = await addToSRS(word, meaning)
      render()
    })
  }

  // ── Selection listener ─────────────────────────────────────────────────────
  document.addEventListener('mouseup', async (e) => {
    if (el.contains(e.target)) return

    const sel  = window.getSelection()
    const text = sel?.toString().trim().replace(/\s+/g, ' ')
    if (!text || text.length < 2 || text.length > 120) {
      if (!text || text.length < 2) el.style.display = 'none'
      return
    }

    // Position popup near selection
    const range = sel.getRangeAt(0)
    const rect  = range.getBoundingClientRect()
    let left = rect.left
    let top  = rect.bottom + 10
    if (left + 320 > window.innerWidth - 10) left = window.innerWidth - 330
    if (left < 10) left = 10
    if (top + 420 > window.innerHeight) top = rect.top - 430
    if (top < 10) top = 10

    el.style.left = left + 'px'
    el.style.top  = top + 'px'
    el.style.display = 'block'

    if (text === word) return

    word = text; tab = 'meaning'; dictData = null; viMeaning = null; addedDeckId = null; mode = 'add'; srsAdded = false

    // Check nếu đã lưu trong deck và SRS
    const [{ data: existing }, alreadyInSRS] = await Promise.all([
      supabase.from('vocab_deck_items')
        .select('deck_id').eq('user_id', uid).eq('word', text.toLowerCase().trim()).limit(1),
      checkSrsAdded(text),
    ])
    if (existing?.length) addedDeckId = existing[0].deck_id
    srsAdded = alreadyInSRS

    render()

    // Fetch EN + VI in parallel
    ;[dictData, viMeaning] = await Promise.all([lookupEN(text), lookupVI(text)])
    if (el.style.display !== 'none' && word === text) render()
  })

  document.addEventListener('mousedown', (e) => {
    if (!el.contains(e.target)) el.style.display = 'none'
  })

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') el.style.display = 'none'
  })
}
