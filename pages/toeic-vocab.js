import { supabase }     from '../supabase/client.js'
import { requireAuth } from '../utils/auth.js'

export default async function toeicVocab(app) {
  let allTests = []
  let vocab    = []

  let selYear   = null
  let selTestId = null
  let selPart   = null   // null = tất cả part
  let mode      = 'list' // 'list' | 'flash' | 'game'
  let cardIdx   = 0
  let flipped   = false
  let search    = ''

  // Game state
  let gameCards    = []
  let gameSelected = null
  let gameMatched  = new Set()
  let gameWrong    = null
  let gameLocking  = false

  let learned = new Set()
  let currentUserId = null

  async function loadLearnedFromDB() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    currentUserId = session.user.id
    const { data } = await supabase
      .from('user_vocab_learned')
      .select('vocab_id')
      .eq('user_id', currentUserId)
    for (const row of (data || [])) learned.add(row.vocab_id)
  }

  const dictCache = new Map() // word → { ipa, audio } | null

  async function fetchDictData(word) {
    if (dictCache.has(word)) return dictCache.get(word)
    try {
      const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`)
      if (!res.ok) { dictCache.set(word, null); return null }
      const data = await res.json()
      const entry = data[0]
      const phonetic = entry?.phonetics?.find(p => p.audio && p.audio.trim())
      const result = {
        ipa:   entry?.phonetic || entry?.phonetics?.find(p => p.text)?.text || '',
        audio: phonetic?.audio || ''
      }
      dictCache.set(word, result)
      return result
    } catch {
      dictCache.set(word, null)
      return null
    }
  }

  function escapeHtml(s) {
    return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  }

  app.innerHTML = `<div style="min-height:100vh;background:#f8faff;display:flex;align-items:center;justify-content:center"><div style="color:#94a3b8;font-size:14px">Đang tải...</div></div>`

  const { data: testsData } = await supabase
    .from('tests')
    .select('id, test_number, year')
    .order('year', { ascending: false })
    .order('test_number')

  allTests = testsData || []
  if (!allTests.length) {
    app.innerHTML = `<div style="padding:60px;text-align:center;color:#64748b">Chưa có dữ liệu</div>`
    return
  }

  const years = [...new Set(allTests.map(t => t.year))].sort((a,b) => b-a)
  selYear   = years[0]
  selTestId = allTests.find(t => t.year === selYear)?.id
  await loadLearnedFromDB()
  await loadVocab()

  // ── Fetch ─────────────────────────────────────────────────────────────────
  async function loadVocab() {
    if (!selTestId) { vocab = []; render(); return }

    let gq = supabase.from('question_groups').select('id, part').eq('test_id', selTestId)
    if (selPart) gq = gq.eq('part', selPart)
    const { data: groups } = await gq
    if (!groups?.length) { vocab = []; render(); return }

    const { data: questions } = await supabase
      .from('questions').select('id, group_id')
      .in('group_id', groups.map(g => g.id))
    if (!questions?.length) { vocab = []; render(); return }

    const { data: rows } = await supabase
      .from('question_vocab').select('*')
      .in('question_id', questions.map(q => q.id))
      .order('word')

    const gPartMap = {}
    for (const g of groups) gPartMap[g.id] = g.part
    const qGroupMap = {}
    for (const q of questions) qGroupMap[q.id] = q.group_id

    vocab = (rows || []).map(v => ({
      ...v,
      part: gPartMap[qGroupMap[v.question_id]] || 0
    }))

    cardIdx = 0; flipped = false; search = ''
    render()
  }

  // ── Render ────────────────────────────────────────────────────────────────
  function render() {
    const testsForYear = allTests.filter(t => t.year === selYear)
    const filtered = search
      ? vocab.filter(v => v.word.toLowerCase().includes(search.toLowerCase()) || (v.meaning||'').toLowerCase().includes(search.toLowerCase()))
      : vocab

    const sidebar = `
      <div style="width:220px;min-width:220px;background:white;border-right:1px solid #e2e8f0;display:flex;flex-direction:column;overflow:hidden">

        <!-- Top-level nav -->
        <div style="padding:10px 10px 8px;border-bottom:1px solid #f1f5f9">
          <div style="font-size:10px;color:#94a3b8;font-weight:700;letter-spacing:.7px;padding:0 10px;margin-bottom:6px">TOEIC</div>
          ${[
            { icon:'🎯', label:'4 Kỹ năng (Hub)', url:'/toeic' },
            { icon:'📝', label:'Full Test L&R',   url:'/toeic-lr' },
            { icon:'📚', label:'Từ vựng',          url:'/toeic/vocabulary', active: true },
          ].map(n=>`
            <div onclick="navigate('${n.url}')"
              style="display:flex;align-items:center;gap:9px;padding:8px 10px;border-radius:10px;cursor:pointer;margin-bottom:1px;background:${n.active?'#eff6ff':'transparent'}">
              <span style="font-size:14px">${n.icon}</span>
              <span style="font-size:13px;font-weight:${n.active?600:400};color:${n.active?'#1d4ed8':'#374151'}">${n.label}</span>
            </div>`).join('')}
        </div>

        <!-- Year filter -->
        <div style="padding:10px 14px;border-bottom:1px solid #f1f5f9">
          <div style="display:flex;gap:5px;flex-wrap:wrap">
            ${years.map(y=>`
              <button onclick="vocabYear(${y})"
                style="padding:4px 11px;border-radius:14px;border:none;cursor:pointer;font-size:12px;font-weight:${y===selYear?600:400};background:${y===selYear?'#2563eb':'#f1f5f9'};color:${y===selYear?'white':'#64748b'}">
                ETS ${y}
              </button>`).join('')}
          </div>
        </div>

        <div style="padding:10px 14px;border-bottom:1px solid #f1f5f9">
          <div style="display:flex;gap:5px;flex-wrap:wrap">
            ${testsForYear.map(t=>`
              <button onclick="vocabTest('${t.id}')"
                style="padding:4px 11px;border-radius:14px;border:none;cursor:pointer;font-size:12px;font-weight:${t.id===selTestId?600:400};background:${t.id===selTestId?'#0f172a':'#f1f5f9'};color:${t.id===selTestId?'white':'#64748b'}">
                Test ${t.test_number}
              </button>`).join('')}
          </div>
        </div>

        <div style="padding:10px 14px;border-bottom:1px solid #f1f5f9">
          <div style="font-size:11px;color:#94a3b8;margin-bottom:7px;font-weight:600">PART</div>
          <div style="display:flex;gap:5px;flex-wrap:wrap">
            <button onclick="vocabPart(null)"
              style="padding:4px 10px;border-radius:12px;border:none;cursor:pointer;font-size:12px;font-weight:${selPart===null?600:400};background:${selPart===null?'#2563eb':'#f1f5f9'};color:${selPart===null?'white':'#64748b'}">
              Tất cả
            </button>
            ${[1,2,3,4,5,6,7].map(p=>`
              <button onclick="vocabPart(${p})"
                style="padding:4px 10px;border-radius:12px;border:none;cursor:pointer;font-size:12px;font-weight:${selPart===p?600:400};background:${selPart===p?'#2563eb':'#f1f5f9'};color:${selPart===p?'white':'#64748b'}">
                P${p}
              </button>`).join('')}
          </div>
        </div>

        <div style="padding:14px;border-bottom:1px solid #f1f5f9">
          <div style="background:#f8faff;border-radius:10px;padding:12px;text-align:center">
            <div style="font-size:28px;font-weight:700;color:#2563eb;font-family:'Space Grotesk',sans-serif">${vocab.length}</div>
            <div style="font-size:12px;color:#64748b;margin-top:2px">từ vựng</div>
          </div>
          ${vocab.length ? `
            <div style="margin-top:8px;background:#f0fdf4;border-radius:10px;padding:10px;text-align:center">
              <div style="font-size:22px;font-weight:700;color:#16a34a;font-family:'Space Grotesk',sans-serif">${learned.size}</div>
              <div style="font-size:12px;color:#15803d;margin-top:1px">đã học</div>
            </div>` : ''}
        </div>

        <div style="padding:14px">
          <button onclick="vocabResetLearned()"
            style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:8px;background:white;cursor:pointer;font-size:12px;color:#64748b">
            ↺ Reset tiến độ
          </button>
        </div>
      </div>`

    const header = `
      <div style="background:white;border-bottom:1px solid #e2e8f0;padding:32px 40px 24px;flex-shrink:0">
        <div style="max-width:860px;margin:auto;display:flex;align-items:flex-end;justify-content:space-between;flex-wrap:wrap;gap:16px">
          <div>
            <h1 style="font-size:28px;font-weight:800;color:#0f172a;margin:0 0 6px;font-family:'Space Grotesk',sans-serif">
              Chinh phục <span style="color:#2563eb">Từ vựng TOEIC</span>
            </h1>
            <p style="margin:0;font-size:13px;color:#64748b">Học từ vựng theo phương pháp lặp lại ngắt quãng (Spaced Repetition)</p>
          </div>
          <div style="display:flex;gap:2px;background:#f1f5f9;border-radius:10px;padding:3px">
            ${[['list','📋 Danh sách'],['flash','🃏 Flashcard'],['game','🎮 Game']].map(([m,lbl])=>`
              <button onclick="vocabMode('${m}')"
                style="padding:6px 16px;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:${mode===m?600:400};background:${mode===m?'white':'transparent'};color:${mode===m?'#0f172a':'#64748b'};box-shadow:${mode===m?'0 1px 3px rgba(0,0,0,.1)':'none'}">
                ${lbl}
              </button>`).join('')}
          </div>
        </div>
      </div>`

    const content = !vocab.length
      ? `<div style="flex:1;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;color:#94a3b8"><div style="font-size:40px">📭</div><p style="font-size:14px">Chưa có từ vựng cho phần này</p></div>`
      : mode === 'list' ? renderList(filtered)
      : mode === 'flash' ? renderFlash(filtered)
      : renderGame(filtered)

    app.innerHTML = `
      <div style="min-height:100vh;background:#f8faff;display:flex;flex-direction:column">
        ${header}
        <div style="flex:1;display:flex;overflow:hidden">
          ${sidebar}
          <div style="flex:1;overflow-y:auto">${content}</div>
        </div>
      </div>`

    // Auto-fetch IPA for current flashcard
    if (mode === 'flash' && filtered.length) {
      const v = filtered[Math.min(cardIdx, filtered.length - 1)]
      if (!dictCache.has(v.word)) {
        fetchDictData(v.word).then(data => {
          if (data?.ipa) {
            const el = document.getElementById('flash-ipa')
            if (el) el.textContent = data.ipa
          }
        })
      }
    }
  }

  // ── List mode ─────────────────────────────────────────────────────────────
  function renderList(filtered) {
    return `
      <div style="max-width:900px;margin:auto;padding:24px">
        <div style="background:white;border-radius:12px;border:1px solid #e2e8f0;padding:10px 14px;margin-bottom:20px;display:flex;align-items:center;gap:10px">
          <span style="color:#94a3b8;font-size:16px">🔍</span>
          <input type="text" id="vocab-search" placeholder="Tìm từ vựng..." value="${escapeHtml(search)}"
            oninput="vocabSearch(this.value)"
            style="border:none;outline:none;font-size:14px;color:#0f172a;flex:1;background:transparent"
          />
          ${search ? `<button onclick="vocabSearch('')" style="background:none;border:none;cursor:pointer;color:#94a3b8;font-size:16px">×</button>` : ''}
        </div>

        ${!filtered.length ? `<div style="text-align:center;padding:40px;color:#94a3b8">Không tìm thấy từ nào</div>` : `
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px">
            ${filtered.map((v,i) => {
              const isLearned = learned.has(v.id)
              return `
                <div style="background:white;border-radius:14px;border:1.5px solid ${isLearned?'#86efac':'#e2e8f0'};padding:18px;transition:all .15s;position:relative"
                  onmouseover="this.style.boxShadow='0 4px 14px rgba(0,0,0,0.07)'"
                  onmouseout="this.style.boxShadow='none'">

                  <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:6px">
                    <div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap">
                      <span style="background:#fef3c7;color:#92400e;font-size:14px;font-weight:700;padding:3px 12px;border-radius:20px">${escapeHtml(v.word)}</span>
                      <button onclick="vocabPlayAudio('${escapeHtml(v.word)}','ipa-${v.id}')" title="Nghe phát âm"
                        style="width:26px;height:26px;border-radius:50%;border:1px solid #e2e8f0;background:white;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
                        🔊
                      </button>
                    </div>
                    <button onclick="vocabToggleLearned('${v.id}')"
                      title="${isLearned?'Bỏ đánh dấu':'Đánh dấu đã học'}"
                      style="width:28px;height:28px;border-radius:50%;border:1.5px solid ${isLearned?'#86efac':'#e2e8f0'};background:${isLearned?'#f0fdf4':'white'};cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
                      ${isLearned?'✓':'○'}
                    </button>
                  </div>
                  <div style="margin-bottom:8px">
                    <span id="ipa-${v.id}" style="font-size:12px;color:#6366f1;font-style:italic">${dictCache.get(v.word)?.ipa || ''}</span>
                  </div>

                  <div style="font-size:13px;color:#374151;line-height:1.6;margin-bottom:6px">${escapeHtml(v.meaning||'')}</div>

                  ${v.example ? `
                    <div style="font-size:12px;color:#64748b;line-height:1.6;font-style:italic;padding:8px;background:#f8faff;border-radius:8px;border-left:3px solid #fde68a">
                      ${escapeHtml(v.example)}
                    </div>` : ''}

                  ${v.part ? `<div style="margin-top:8px"><span style="font-size:11px;color:#94a3b8;background:#f1f5f9;padding:2px 8px;border-radius:10px">Part ${v.part}</span></div>` : ''}
                </div>`
            }).join('')}
          </div>
        `}
      </div>`
  }

  // ── Flashcard mode ────────────────────────────────────────────────────────
  function renderFlash(filtered) {
    if (!filtered.length) return `<div style="flex:1;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:14px">Không có từ vựng</div>`

    const safeIdx = Math.min(cardIdx, filtered.length - 1)
    const v = filtered[safeIdx]
    const isLearned = learned.has(v.id)
    const progress = Math.round((learned.size / filtered.length) * 100)

    return `
      <div style="max-width:600px;margin:auto;padding:32px 24px">

        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">
          <span style="font-size:13px;color:#64748b">${safeIdx+1} / ${filtered.length} từ</span>
          <div style="flex:1;margin:0 16px;height:4px;background:#f1f5f9;border-radius:4px;overflow:hidden">
            <div style="height:100%;background:#2563eb;border-radius:4px;width:${progress}%;transition:width .4s"></div>
          </div>
          <span style="font-size:13px;color:#16a34a;font-weight:600">${learned.size} đã học</span>
        </div>

        <!-- Card -->
        <div onclick="vocabFlipCard()" style="background:white;border-radius:20px;border:2px solid ${isLearned?'#86efac':'#e2e8f0'};padding:40px 32px;text-align:center;cursor:pointer;min-height:220px;display:flex;flex-direction:column;align-items:center;justify-content:center;transition:all .2s;box-shadow:0 4px 20px rgba(0,0,0,0.06)"
          onmouseover="this.style.boxShadow='0 8px 30px rgba(0,0,0,0.1)'"
          onmouseout="this.style.boxShadow='0 4px 20px rgba(0,0,0,0.06)'">

          <span style="background:#fef3c7;color:#92400e;font-size:22px;font-weight:700;padding:6px 20px;border-radius:24px;margin-bottom:10px;display:inline-block">
            ${escapeHtml(v.word)}
          </span>

          <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
            <span id="flash-ipa" style="font-size:14px;color:#6366f1;font-style:italic">${dictCache.get(v.word)?.ipa || ''}</span>
            <button onclick="vocabPlayAudio('${escapeHtml(v.word)}','flash-ipa')"
              style="padding:5px 14px;border-radius:20px;border:1px solid #e2e8f0;background:white;cursor:pointer;font-size:13px;color:#6366f1;display:flex;align-items:center;gap:5px">
              🔊 Nghe
            </button>
          </div>

          ${flipped ? `
            <div style="border-top:1px solid #f1f5f9;width:100%;padding-top:20px;margin-top:4px">
              <div style="font-size:16px;color:#0f172a;font-weight:500;line-height:1.6;margin-bottom:${v.example?12:0}px">${escapeHtml(v.meaning||'')}</div>
              ${v.example ? `<div style="font-size:13px;color:#64748b;font-style:italic;line-height:1.7;background:#f8faff;padding:10px 14px;border-radius:10px;border-left:3px solid #fde68a">${escapeHtml(v.example)}</div>` : ''}
            </div>
          ` : `
            <div style="font-size:13px;color:#94a3b8;display:flex;align-items:center;gap:6px">
              <span>Nhấp để xem nghĩa</span>
              <span style="font-size:16px">👆</span>
            </div>
          `}
        </div>

        <!-- Card actions -->
        <div style="display:flex;gap:10px;margin-top:16px;justify-content:center">
          ${flipped ? `
            <button onclick="vocabToggleLearned('${v.id}')"
              style="padding:10px 24px;border-radius:12px;border:1.5px solid ${isLearned?'#86efac':'#e2e8f0'};background:${isLearned?'#f0fdf4':'white'};cursor:pointer;font-size:14px;font-weight:600;color:${isLearned?'#16a34a':'#64748b'}">
              ${isLearned ? '✓ Đã học' : '○ Đánh dấu đã học'}
            </button>
          ` : ''}
        </div>

        <!-- Navigation -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:24px">
          <button onclick="vocabPrev()" ${safeIdx===0?'disabled':''}
            style="padding:12px 24px;border-radius:12px;border:1.5px solid #e2e8f0;background:white;cursor:${safeIdx===0?'default':'pointer'};color:#64748b;font-size:14px;opacity:${safeIdx===0?.4:1}">
            ← Trước
          </button>

          <div style="display:flex;gap:5px">
            ${filtered.slice(Math.max(0,safeIdx-2), Math.min(filtered.length, safeIdx+3)).map((_,i)=>{
              const realIdx = Math.max(0,safeIdx-2) + i
              return `<button onclick="vocabGoCard(${realIdx})"
                style="width:${realIdx===safeIdx?24:8}px;height:8px;border-radius:4px;border:none;cursor:pointer;background:${realIdx===safeIdx?'#2563eb':'#e2e8f0'};padding:0;transition:all .2s"></button>`
            }).join('')}
          </div>

          <button onclick="vocabNext()" ${safeIdx>=filtered.length-1?'disabled':''}
            style="padding:12px 24px;border-radius:12px;border:none;background:#2563eb;cursor:${safeIdx>=filtered.length-1?'default':'pointer'};color:white;font-size:14px;font-weight:600;opacity:${safeIdx>=filtered.length-1?.4:1}">
            Tiếp →
          </button>
        </div>

        <div style="text-align:center;margin-top:16px;font-size:12px;color:#94a3b8">
          <span style="background:#f1f5f9;padding:2px 7px;border-radius:4px;font-family:monospace">←→</span> điều hướng &nbsp;•&nbsp;
          <span style="background:#f1f5f9;padding:2px 7px;border-radius:4px;font-family:monospace">Space</span> lật thẻ &nbsp;•&nbsp;
          <span style="background:#f1f5f9;padding:2px 7px;border-radius:4px;font-family:monospace">P</span> nghe &nbsp;•&nbsp;
          <span style="background:#f1f5f9;padding:2px 7px;border-radius:4px;font-family:monospace">Enter</span> đánh dấu đã học
        </div>
      </div>`
  }

  // ── Handlers ──────────────────────────────────────────────────────────────
  function supabaseAudioUrl(word) {
    const slug = word.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z-]/g, '')
    const { data } = supabase.storage.from('pronunciation').getPublicUrl(`words/${slug}-uk-v2.mp3`)
    return data.publicUrl
  }

  async function playWithFallback(word) {
    // 1. Supabase Storage (Oxford quality)
    const sbUrl = supabaseAudioUrl(word)
    const sbAudio = new Audio(sbUrl)
    const sbOk = await new Promise(resolve => {
      sbAudio.oncanplaythrough = () => resolve(true)
      sbAudio.onerror = () => resolve(false)
      setTimeout(() => resolve(false), 2000)
    })
    if (sbOk) { sbAudio.play().catch(() => {}); return }

    // 2. Free Dictionary API
    const data = await fetchDictData(word)
    if (data?.audio) { new Audio(data.audio).play().catch(() => {}); return }

    // 3. Web Speech fallback
    const utt = new SpeechSynthesisUtterance(word)
    utt.lang = 'en-US'
    speechSynthesis.speak(utt)
  }

  // ── Game mode ────────────────────────────────────────────────────────────
  function initGame(filtered) {
    const pool = filtered.slice().sort(() => Math.random() - 0.5).slice(0, 8)
    gameCards = []
    pool.forEach(v => {
      gameCards.push({ key: 'en-' + v.id, id: v.id, type: 'en', text: v.word })
      gameCards.push({ key: 'vi-' + v.id, id: v.id, type: 'vi', text: v.meaning })
    })
    gameCards.sort(() => Math.random() - 0.5)
    gameSelected = null
    gameMatched  = new Set()
    gameWrong    = null
    gameLocking  = false
  }

  function playMatchSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = ctx.createOscillator(), gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.type = 'sine'; osc.frequency.value = 880
      gain.gain.setValueAtTime(0, ctx.currentTime)
      gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.04)
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3)
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.3)
    } catch(e) {}
  }

  function renderGame(filtered) {
    if (!gameCards.length) initGame(filtered)
    const total   = gameCards.length / 2
    const done    = gameMatched.size
    const pct     = total ? Math.round(done / total * 100) : 0
    const allDone = done === total && total > 0

    if (allDone) {
      return `
        <div style="max-width:560px;margin:60px auto;text-align:center;padding:24px">
          <div style="font-size:64px;margin-bottom:16px">🎉</div>
          <h2 style="font-family:'Space Grotesk',sans-serif;font-size:26px;color:#0f172a;margin:0 0 8px">Xuất sắc!</h2>
          <p style="color:#64748b;font-size:14px;margin:0 0 28px">Bạn đã ghép đúng tất cả ${total} cặp từ</p>
          <button onclick="vocabGameNew()"
            style="padding:12px 32px;background:#2563eb;color:white;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer">
            🔄 Chơi lại
          </button>
        </div>`
    }

    return `
      <style>
        @keyframes gShake{0%,100%{transform:translateX(0) rotate(0)}15%{transform:translateX(-7px) rotate(-2deg)}30%{transform:translateX(7px) rotate(2deg)}45%{transform:translateX(-5px)}60%{transform:translateX(5px)}75%{transform:translateX(-3px)}}
        @keyframes gPop{0%{transform:scale(1)}50%{transform:scale(1.12)}100%{transform:scale(1)}}
      </style>
      <div style="max-width:760px;margin:auto;padding:28px 24px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;gap:16px">
          <div style="flex:1;height:6px;background:#f1f5f9;border-radius:6px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:#16a34a;border-radius:6px;transition:width .4s"></div>
          </div>
          <span style="font-size:13px;color:#64748b;flex-shrink:0">${done}/${total} cặp</span>
          <button onclick="vocabGameNew()"
            style="padding:6px 14px;border:1px solid #e2e8f0;border-radius:8px;background:white;cursor:pointer;font-size:12px;color:#64748b;flex-shrink:0">
            🔄 Bộ mới
          </button>
        </div>

        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px">
          ${gameCards.map(c => {
            if (gameMatched.has(c.id)) return `<div style="height:76px;border-radius:12px;background:#f0fdf4;border:2px solid #bbf7d0"></div>`
            const sel   = gameSelected?.key === c.key
            const wrong = gameWrong?.a.key === c.key || gameWrong?.b.key === c.key
            const isEN  = c.type === 'en'
            return `
              <div onclick="vocabGameSelect('${c.key}')"
                style="height:76px;border-radius:12px;padding:10px 8px;cursor:pointer;display:flex;align-items:center;justify-content:center;text-align:center;
                  border:2px solid ${wrong?'#ef4444':sel?'#2563eb':'#e2e8f0'};
                  background:${wrong?'#fef2f2':sel?'#eff6ff':isEN?'white':'#f8faff'};
                  box-shadow:${sel?'0 0 0 3px rgba(37,99,235,.15)':'none'};
                  animation:${wrong?'gShake .45s ease':sel?'gPop .2s ease':'none'};
                  transition:border-color .15s,background .15s">
                <span style="font-size:12px;font-weight:${isEN?700:500};color:${wrong?'#dc2626':sel?'#1d4ed8':isEN?'#0f172a':'#374151'};line-height:1.4;word-break:break-word">
                  ${c.text}
                </span>
              </div>`
          }).join('')}
        </div>

        <p style="text-align:center;font-size:12px;color:#94a3b8;margin-top:16px">Click chọn một từ tiếng Anh và nghĩa tiếng Việt tương ứng</p>
      </div>`
  }

  window.vocabGameSelect = key => {
    if (gameLocking) return
    const card = gameCards.find(c => c.key === key)
    if (!card || gameMatched.has(card.id)) return

    if (!gameSelected) {
      gameSelected = card; render(); return
    }
    if (gameSelected.key === key) {
      gameSelected = null; render(); return
    }

    if (gameSelected.id === card.id && gameSelected.type !== card.type) {
      // Correct match
      gameMatched.add(card.id)
      gameSelected = null
      playMatchSound()
      render()
      const filtered = search ? vocab.filter(v => v.word.toLowerCase().includes(search.toLowerCase()) || (v.meaning||'').toLowerCase().includes(search.toLowerCase())) : vocab
      if (gameMatched.size === gameCards.length / 2) {
        setTimeout(() => { playSuccessSound(); launchConfetti() }, 200)
      }
    } else {
      // Wrong
      gameLocking = true
      gameWrong = { a: gameSelected, b: card }
      gameSelected = null
      render()
      setTimeout(() => { gameWrong = null; gameLocking = false; render() }, 800)
    }
  }

  window.vocabGameNew = () => {
    const filtered = search ? vocab.filter(v => v.word.toLowerCase().includes(search.toLowerCase()) || (v.meaning||'').toLowerCase().includes(search.toLowerCase())) : vocab
    initGame(filtered)
    render()
  }

  window.vocabPlayAudio = async (word, ipaElId) => {
    playWithFallback(word)
    if (ipaElId) {
      const data = await fetchDictData(word)
      if (data?.ipa) {
        const el = document.getElementById(ipaElId)
        if (el) el.textContent = data.ipa
      }
    }
  }

  window.vocabYear  = async y => { selYear = y; selTestId = allTests.find(t=>t.year===y)?.id; await loadVocab() }
  window.vocabTest  = async id => { selTestId = id; await loadVocab() }
  window.vocabPart  = async p => { selPart = p; await loadVocab() }
  window.vocabMode  = m => {
    if (m === 'flash') { requireAuth(() => { mode = m; cardIdx = 0; flipped = false; render() }); return }
    if (m === 'game')  { gameCards = []; gameSelected = null; gameMatched = new Set(); gameWrong = null; gameLocking = false }
    mode = m; cardIdx = 0; flipped = false; render()
  }
  window.vocabSearch = val => { search = val; cardIdx = 0; render() }

  // ── Celebration ─────────────────────────────────────────────────────────
  function playSuccessSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const notes = [523.25, 659.25, 783.99, 1046.50]
      notes.forEach((freq, i) => {
        const osc  = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination)
        osc.type = 'sine'; osc.frequency.value = freq
        const t = ctx.currentTime + i * 0.12
        gain.gain.setValueAtTime(0, t)
        gain.gain.linearRampToValueAtTime(0.25, t + 0.05)
        gain.gain.linearRampToValueAtTime(0, t + 0.45)
        osc.start(t); osc.stop(t + 0.5)
      })
    } catch(e) {}
  }

  function launchConfetti() {
    const canvas = document.createElement('canvas')
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999'
    canvas.width = window.innerWidth; canvas.height = window.innerHeight
    document.body.appendChild(canvas)
    const c = canvas.getContext('2d')
    const colors = ['#2563eb','#f59e0b','#16a34a','#ef4444','#8b5cf6','#ec4899','#06b6d4','#f97316']
    const ps = Array.from({length:160}, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height * -1,
      w: Math.random() * 10 + 5,
      h: Math.random() * 5 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 5,
      vy: Math.random() * 3 + 2,
      rot: Math.random() * Math.PI * 2,
      rv: (Math.random() - 0.5) * 0.15,
      alpha: 1,
    }))
    let frame = 0
    const draw = () => {
      c.clearRect(0, 0, canvas.width, canvas.height)
      ps.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.rot += p.rv; p.vy += 0.08
        if (frame > 90) p.alpha -= 0.018
        c.save(); c.globalAlpha = Math.max(0, p.alpha)
        c.translate(p.x, p.y); c.rotate(p.rot)
        c.fillStyle = p.color; c.fillRect(-p.w/2, -p.h/2, p.w, p.h)
        c.restore()
      })
      if (++frame < 160) requestAnimationFrame(draw)
      else canvas.remove()
    }
    draw()

    // Toast
    const toast = document.createElement('div')
    toast.textContent = '🎉 Bạn đã học xong tất cả từ vựng!'
    toast.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);background:#16a34a;color:white;padding:14px 28px;border-radius:14px;font-size:16px;font-weight:700;z-index:10000;box-shadow:0 8px 24px rgba(22,163,74,.35);transition:opacity .5s'
    document.body.appendChild(toast)
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 500) }, 3000)
  }

  window.vocabToggleLearned = id => {
    requireAuth(async () => {
      if (learned.has(id)) {
        learned.delete(id)
        await supabase.from('user_vocab_learned')
          .delete()
          .eq('user_id', currentUserId)
          .eq('vocab_id', id)
      } else {
        learned.add(id)
        await supabase.from('user_vocab_learned')
          .upsert({ user_id: currentUserId, vocab_id: id })
        // Also enroll in SRS (due today, first review)
        await supabase.from('user_vocab_srs').upsert({
          user_id:     currentUserId,
          vocab_id:    id,
          interval:    1,
          ease_factor: 2.5,
          repetitions: 0,
          due_date:    new Date().toISOString().split('T')[0],
        }, { onConflict: 'user_id,vocab_id', ignoreDuplicates: true })

        // Check if all visible words are now learned
        const filtered = search
          ? vocab.filter(v => v.word.toLowerCase().includes(search.toLowerCase()) || (v.meaning||'').toLowerCase().includes(search.toLowerCase()))
          : vocab
        if (filtered.length > 0 && filtered.every(v => learned.has(v.id))) {
          playSuccessSound()
          launchConfetti()
        }
      }
      render()
    })
  }

  window.vocabResetLearned = async () => {
    requireAuth(async () => {
      learned = new Set()
      await supabase.from('user_vocab_learned')
        .delete()
        .eq('user_id', currentUserId)
      render()
    })
  }

  window.vocabFlipCard = () => { flipped = !flipped; render() }
  window.vocabPrev     = () => { if (cardIdx > 0) { cardIdx--; flipped = false; render() } }
  window.vocabNext     = () => { cardIdx++; flipped = false; render() }
  window.vocabGoCard   = i => { cardIdx = i; flipped = false; render() }

  // Keyboard shortcuts
  const onKey = e => {
    if (!document.getElementById('vocab-search') && mode !== 'list') {
      document.removeEventListener('keydown', onKey); return
    }
    if (e.target.tagName === 'INPUT') return
    if (mode === 'flash') {
      if (e.key === 'ArrowLeft')  { window.vocabPrev(); e.preventDefault() }
      if (e.key === 'ArrowRight') { window.vocabNext(); e.preventDefault() }
      if (e.key === ' ')          { window.vocabFlipCard(); e.preventDefault() }
      if (e.key === 'p' || e.key === 'P') {
        const filt = search ? vocab.filter(v=>v.word.toLowerCase().includes(search.toLowerCase())||(v.meaning||'').toLowerCase().includes(search.toLowerCase())) : vocab
        const cv = filt[Math.min(cardIdx, filt.length-1)]
        if (cv) window.vocabPlayAudio(cv.word, 'flash-ipa')
        e.preventDefault()
      }
      if (e.key === 'Enter') {
        const filtered = search ? vocab.filter(v=>v.word.toLowerCase().includes(search.toLowerCase())||(v.meaning||'').toLowerCase().includes(search.toLowerCase())) : vocab
        const v = filtered[Math.min(cardIdx, filtered.length-1)]
        if (v) window.vocabToggleLearned(v.id)
        e.preventDefault()
      }
    }
  }
  document.addEventListener('keydown', onKey)

  render()
}
