import { supabase } from '../supabase/client.js'

export default async function toeicListening(app) {
  let allTests  = []
  let groups    = []

  let selYear    = null
  let selTestId  = null
  let selPart    = 1
  let selGroupId = null
  let sentenceIdx = 0
  let tab        = 'check'   // 'check' | 'dictate' | 'full'
  let speed      = 1.0
  let showBilingual = false

  // Shared hide state (check + dictate)
  let hidePercent    = 50
  let hiddenWordIdxs = []

  // Check mode
  let revealed = new Set()

  // Dictate mode
  let wordInputs      = {}
  let correctWords    = new Set()
  let activeHiddenIdx = 0

  // Progress / sidebar
  let expandedGroups = new Set()
  let doneSentences  = new Set()

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

  const years = [...new Set(allTests.map(t => t.year))].sort((a, b) => b - a)
  selYear   = years[0]
  selTestId = allTests.find(t => t.year === selYear)?.id

  await loadGroups()

  function stripSpeaker(s) {
    return s.replace(/^[A-Za-z]{1,10}\s*:\s*/, '').trim()
  }
  function isSpeakerLine(s) {
    if (!s) return false
    if (/^[A-Z][\w\s,\.]*[\(\[]\d{1,2}:\d{2}/.test(s)) return true
    if (s.startsWith(')')) return true
    if (/^(TO|FROM|DATE|SUBJECT|CC|BCC)\s*:/i.test(s)) return true
    if (/^[\w.\-]+@[\w.\-]+\.\w+$/.test(s.trim())) return true
    if (/^https?:\/\//.test(s.trim())) return true
    if (/^[a-z][\w-]*\.$/.test(s.trim())) return true
    return false
  }
  function isVISpeakerLine(v) {
    return /^[A-Z][\w\s]+\(\d{1,2}:\d{2}/.test(v || '')
  }

  // ── Fetch groups ──────────────────────────────────────────────────────────
  async function loadGroups() {
    if (!selTestId) { groups = []; selGroupId = null; render(); return }

    const { data: rawGroups } = await supabase
      .from('question_groups')
      .select('id, test_id, part, group_order, audio_url, passage_a, passage_a_vi')
      .eq('test_id', selTestId)
      .eq('part', selPart)
      .order('group_order')

    const rawList = rawGroups || []
    const needOptions = selPart <= 2
      ? rawList.filter(g => !(g.passage_a || '').trim())
      : []

    const qByGroup = {}
    if (needOptions.length) {
      const { data: qs } = await supabase
        .from('questions')
        .select('group_id, question, question_vi, option_a, option_b, option_c, option_d, option_a_vi, option_b_vi, option_c_vi, option_d_vi')
        .in('group_id', needOptions.map(g => g.id))
        .order('question_number')
      for (const q of (qs || [])) {
        if (!qByGroup[q.group_id]) qByGroup[q.group_id] = []
        qByGroup[q.group_id].push(q)
      }
    }

    groups = rawList.map(g => {
      const enRaw = (g.passage_a || '').split('\n').map(s => stripSpeaker(s.trim()))
      const viRaw = (g.passage_a_vi || '').split('\n').map(s => s.trim())
      const pairs = enRaw.map((en, i) => ({ en, vi: viRaw[i] || '' })).filter(p => p.en)
      if (pairs.length) {
        return { ...g, sentences: pairs.map(p => p.en), viSentences: pairs.map(p => p.vi) }
      }
      const gqs = qByGroup[g.id] || []
      const sentences = [], viSentences = []
      for (const q of gqs) {
        if (g.part === 2 && q.question) { sentences.push(q.question); viSentences.push(q.question_vi || '') }
        const opts   = [q.option_a, q.option_b, q.option_c, q.option_d]
        const optsVI = [q.option_a_vi, q.option_b_vi, q.option_c_vi, q.option_d_vi]
        opts.forEach((s, i) => { if (s) { sentences.push(s); viSentences.push(optsVI[i] || '') } })
      }
      return { ...g, sentences, viSentences }
    }).filter(g => g.sentences.length)

    // Reset progress and expand first group
    doneSentences  = new Set()
    expandedGroups = new Set()
    selGroupId     = groups[0]?.id ?? null
    sentenceIdx    = 0
    if (groups.length) expandedGroups.add(groups[0].id)
    resetDict()
    render()
  }

  // ── Audio URL per sentence ─────────────────────────────────────────────────
  function buildAudioUrl(g, sIdx) {
    const test = allTests.find(t => t.id === selTestId)
    if (!test) return ''
    const year2  = String(test.year).slice(-2)
    const letter = String.fromCharCode(97 + (sIdx || 0)) // a, b, c, d ...
    return `https://trehfvxlqfshfhcapqca.supabase.co/storage/v1/object/public/audio_dictation/${test.test_number}_audio_${year2}_t${test.test_number}_p${selPart}_${g.group_order}_${letter}.mp3`
  }

  // ── Hidden word calc ───────────────────────────────────────────────────────
  function computeHiddenWords(words) {
    const eligible = words.map((w,i)=>i).filter(i => words[i].replace(/[.,!?;:'"]/g,'').length > 1)
    if (!eligible.length) { hiddenWordIdxs = []; return }
    if (hidePercent === 100) {
      hiddenWordIdxs = [...eligible]
    } else {
      const count = Math.max(1, Math.round(eligible.length * hidePercent / 100))
      const step  = eligible.length / count
      hiddenWordIdxs = []
      for (let i = 0; i < count; i++) {
        hiddenWordIdxs.push(eligible[Math.min(Math.round(i * step), eligible.length - 1)])
      }
      hiddenWordIdxs = [...new Set(hiddenWordIdxs)].sort((a,b) => a-b)
    }
  }

  function resetDict() {
    revealed        = new Set()
    wordInputs      = {}
    correctWords    = new Set()
    activeHiddenIdx = 0
    const g = getGroup()
    if (g) {
      const ws = (g.sentences[sentenceIdx]||'').split(/\s+/).filter(Boolean)
      computeHiddenWords(ws)
    } else {
      hiddenWordIdxs = []
    }
  }

  function getGroup() { return groups.find(g => g.id === selGroupId) || null }

  function markDone() {
    if (selGroupId !== null && sentenceIdx >= 0)
      doneSentences.add(`${selGroupId}-${sentenceIdx}`)
  }

  // ── Main render ───────────────────────────────────────────────────────────
  function render() {
    const g         = getGroup()
    const sentences = g?.sentences || []
    const sentence  = sentences[sentenceIdx] || ''
    const words     = sentence.split(/\s+/).filter(Boolean)
    const testsForYear  = allTests.filter(t => t.year === selYear)
    const selTest       = allTests.find(t => t.id === selTestId)
    const totalSentences = groups.reduce((s, gr) => s + gr.sentences.length, 0)

    // ── Sidebar ───────────────────────────────────────────────────────────
    const sidebar = `
      <div style="width:228px;min-width:228px;background:white;border-right:1px solid #e2e8f0;display:flex;flex-direction:column;overflow:hidden">

        <!-- Year / Test / Part selectors -->
        <div style="padding:8px 10px;border-bottom:1px solid #f1f5f9">
          <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:5px">
            ${years.map(y => `
              <button onclick="listenYear(${y})"
                style="padding:3px 9px;border-radius:11px;border:none;cursor:pointer;font-size:11px;font-weight:${y===selYear?600:400};background:${y===selYear?'#2563eb':'#f1f5f9'};color:${y===selYear?'white':'#64748b'}">
                ETS ${y}
              </button>`).join('')}
          </div>
          <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:5px">
            ${testsForYear.map(t => `
              <button onclick="listenTest('${t.id}')"
                style="padding:3px 9px;border-radius:11px;border:none;cursor:pointer;font-size:11px;font-weight:${t.id===selTestId?600:400};background:${t.id===selTestId?'#0f172a':'#f1f5f9'};color:${t.id===selTestId?'white':'#64748b'}">
                Test ${t.test_number}
              </button>`).join('')}
          </div>
          <div style="display:flex;gap:3px">
            ${[1,2,3,4].map(p => `
              <button onclick="listenPart(${p})"
                style="flex:1;padding:5px 2px;border-radius:7px;border:none;cursor:pointer;font-size:11px;font-weight:${p===selPart?600:400};background:${p===selPart?'#2563eb':'#f1f5f9'};color:${p===selPart?'white':'#64748b'}">
                P${p}
              </button>`).join('')}
          </div>
        </div>

        <!-- Test header -->
        <div style="padding:10px 12px;border-bottom:1px solid #f1f5f9">
          <div style="font-size:13px;font-weight:700;color:#0f172a">TEST ${selTest?.test_number} ${selTest?.year}</div>
          <div style="font-size:11px;color:#94a3b8;margin-top:2px">${groups.length} bài • ${totalSentences} câu</div>
        </div>

        <!-- Groups list -->
        <div style="flex:1;overflow-y:auto;padding:6px 8px">
          ${!groups.length
            ? `<div style="padding:20px;text-align:center;color:#94a3b8;font-size:13px">Chưa có dữ liệu</div>`
            : groups.map((gr, i) => {
                const isExp    = expandedGroups.has(gr.id)
                const isActive = gr.id === selGroupId
                const doneCnt  = gr.sentences.filter((_,si) => doneSentences.has(`${gr.id}-${si}`)).length
                const allDoneG = doneCnt === gr.sentences.length
                return `
                  <div style="margin-bottom:2px">
                    <div onclick="listenToggleGroup('${gr.id}')"
                      style="display:flex;align-items:center;gap:7px;padding:8px 10px;border-radius:10px;cursor:pointer;
                        background:${isActive?'#eff6ff':'transparent'};border:1px solid ${isActive?'#bfdbfe':'transparent'}">
                      <span style="font-size:13px">🎧</span>
                      <span style="font-size:13px;font-weight:${isActive?600:500};color:${isActive?'#1d4ed8':'#374151'};flex:1">Bài ${i+1}</span>
                      <span style="font-size:11px;color:${allDoneG?'#16a34a':'#94a3b8'};font-weight:${allDoneG?600:400}">${doneCnt}/${gr.sentences.length}</span>
                      <span style="font-size:10px;color:#94a3b8">${isExp?'▼':'▶'}</span>
                    </div>
                    ${isExp ? gr.sentences.map((_, si) => {
                      const isDone  = doneSentences.has(`${gr.id}-${si}`)
                      const isCurr  = isActive && si === sentenceIdx
                      return `
                        <div onclick="listenSelectSentence('${gr.id}',${si})"
                          style="display:flex;align-items:center;gap:8px;padding:5px 10px 5px 30px;border-radius:8px;cursor:pointer;margin-top:1px;
                            background:${isCurr?'#eff6ff':'transparent'}">
                          <span style="font-size:14px;flex-shrink:0;line-height:1">${isDone?'✅':isCurr?'🔵':'○'}</span>
                          <span style="font-size:12px;color:${isCurr?'#1d4ed8':isDone?'#16a34a':'#374151'};font-weight:${isCurr?600:400}">Câu ${si+1}</span>
                        </div>`
                    }).join('') : ''}
                  </div>`
              }).join('')}
        </div>
      </div>`

    // ── Mode tabs ─────────────────────────────────────────────────────────
    const modeTabs = `
      <div style="display:flex;gap:2px;background:#f1f5f9;border-radius:10px;padding:3px">
        ${[['check','Nghe Check'],['dictate','Nghe Chép'],['full','Nghe Full']].map(([t,lbl]) => `
          <button onclick="listenTab('${t}')"
            style="padding:5px 14px;border:none;border-radius:8px;cursor:pointer;font-size:12px;
              font-weight:${tab===t?600:400};background:${tab===t?'white':'transparent'};
              color:${tab===t?'#0f172a':'#64748b'};box-shadow:${tab===t?'0 1px 3px rgba(0,0,0,.1)':'none'}">
            ${lbl}
          </button>`).join('')}
      </div>`

    // ── Audio toolbar ─────────────────────────────────────────────────────
    const audioUrl = g ? buildAudioUrl(g, sentenceIdx) : ''
    const atDisPrev = !g || sentenceIdx === 0
    const atDisNext = !g || (sentenceIdx >= sentences.length - 1 && groups.indexOf(g) >= groups.length - 1)
    const audioToolbar = `
      <div style="background:white;border-bottom:1px solid #e2e8f0;padding:10px 20px;display:flex;align-items:center;gap:10px;flex-shrink:0">
        ${g ? `<audio id="listen-audio" src="${audioUrl}" preload="metadata" style="display:none"></audio>` : ''}

        <button onclick="listenPrevSentence()" ${atDisPrev?'disabled':''}
          style="width:30px;height:30px;border-radius:50%;border:1px solid #e2e8f0;background:white;cursor:${atDisPrev?'default':'pointer'};
            color:#374151;font-size:14px;display:flex;align-items:center;justify-content:center;opacity:${atDisPrev?.35:1}">⟨</button>

        <button onclick="listenPlayAudio()"
          style="width:36px;height:36px;border-radius:50%;border:none;background:#2563eb;cursor:pointer;
            color:white;font-size:15px;display:flex;align-items:center;justify-content:center;flex-shrink:0">▷</button>

        <button onclick="listenNextSentenceNav()" ${atDisNext?'disabled':''}
          style="width:30px;height:30px;border-radius:50%;border:1px solid #e2e8f0;background:white;cursor:${atDisNext?'default':'pointer'};
            color:#374151;font-size:14px;display:flex;align-items:center;justify-content:center;opacity:${atDisNext?.35:1}">⟩</button>

        <span style="font-size:13px;color:#64748b;min-width:32px;text-align:center">${sentenceIdx+1}/${sentences.length||1}</span>

        <div style="display:flex;gap:3px">
          ${[0.5,0.75,1.0].map(s => `
            <button onclick="listenSpeed(${s})"
              style="padding:4px 9px;border-radius:7px;border:none;cursor:pointer;font-size:12px;font-weight:600;
                background:${speed===s?'#2563eb':'#f1f5f9'};color:${speed===s?'white':'#64748b'}">
              ${s===1?'1x':s+'x'}
            </button>`).join('')}
        </div>

        <button onclick="listenReplay()" title="Phát lại từ đầu"
          style="width:30px;height:30px;border-radius:50%;border:1px solid #e2e8f0;background:white;cursor:pointer;
            color:#64748b;font-size:14px;display:flex;align-items:center;justify-content:center">↺</button>
      </div>`

    // ── Content ───────────────────────────────────────────────────────────
    const content = !g
      ? `<div style="flex:1;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:14px">Chưa có dữ liệu cho phần này</div>`
      : tab === 'full'    ? renderFull(g, sentences, sentence)
      : tab === 'check'   ? renderCheck(sentences, sentence, words)
      :                     renderDictate(sentences, sentence, words)

    app.innerHTML = `
      <div style="min-height:100vh;background:#f8faff;display:flex;flex-direction:column">

        <div style="background:white;border-bottom:1px solid #e2e8f0;height:54px;padding:0 20px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;position:sticky;top:0;z-index:20">
          <button onclick="navigate('/toeic')" style="background:none;border:none;cursor:pointer;color:#64748b;font-size:14px;padding:0">← TOEIC Hub</button>
          <span style="font-size:15px;font-weight:700;color:#0f172a;font-family:'Space Grotesk',sans-serif">TOEIC Listening</span>
          ${modeTabs}
        </div>

        <div style="flex:1;display:flex;overflow:hidden;min-height:calc(100vh - 54px)">
          ${sidebar}
          <div style="flex:1;display:flex;flex-direction:column;overflow:hidden">
            ${audioToolbar}
            <div style="flex:1;overflow-y:auto">${content}</div>
          </div>
        </div>
      </div>`

    const audio = document.getElementById('listen-audio')
    if (audio) audio.playbackRate = speed
    if (tab === 'dictate') setTimeout(() => focusActive(), 30)
  }

  // ── Nghe Full ─────────────────────────────────────────────────────────────
  function renderFull(g, sentences, sentence) {
    const viLines = g.viSentences || []
    const hasVI   = viLines.some(Boolean)
    return `
      <div style="max-width:680px;margin:auto;padding:20px 24px">
        <div style="background:white;border-radius:14px;border:1px solid #e2e8f0;padding:18px">
          ${hasVI ? `
            <div style="display:flex;justify-content:flex-end;margin-bottom:10px">
              <button onclick="listenToggleBilingual()"
                style="padding:4px 12px;border-radius:7px;border:none;cursor:pointer;font-size:12px;font-weight:600;
                  background:${showBilingual?'#0369a1':'#f1f5f9'};color:${showBilingual?'white':'#64748b'}">
                🌐 Song ngữ
              </button>
            </div>` : ''}
          <div style="font-size:10px;color:#94a3b8;font-weight:700;letter-spacing:.8px;margin-bottom:10px">TRANSCRIPT</div>
          ${sentences.map((s,i) => `
            <div onclick="listenSelectSentence('${g.id}',${i})"
              style="padding:9px 12px;border-radius:8px;margin-bottom:3px;cursor:pointer;
                background:${i===sentenceIdx?'#eff6ff':'transparent'};
                border:1px solid ${i===sentenceIdx?'#bfdbfe':'transparent'}">
              <div style="font-size:14px;color:${i===sentenceIdx?'#1d4ed8':'#374151'};font-weight:${i===sentenceIdx?500:400};line-height:1.7">${escapeHtml(s)}</div>
              ${showBilingual && viLines[i] && !isSpeakerLine(s) && !isVISpeakerLine(viLines[i])
                ? `<div style="font-size:12.5px;color:#0369a1;font-style:italic;line-height:1.6;margin-top:3px">${escapeHtml(viLines[i])}</div>` : ''}
            </div>`).join('')}
        </div>
      </div>`
  }

  // ── Nghe Check ────────────────────────────────────────────────────────────
  function renderCheck(sentences, sentence, words) {
    const display = words.length
      ? words.map((w,i) => {
          if (!hiddenWordIdxs.includes(i))
            return `<span style="font-size:15px;color:#374151;margin:2px">${escapeHtml(w)}</span>`
          if (revealed.has(i))
            return `<span style="background:#fef08a;border-radius:4px;padding:2px 7px;margin:2px;font-size:15px;font-weight:500;color:#1e293b;display:inline-block">${escapeHtml(w)}</span>`
          return `<span onclick="listenRevealWord(${i})" title="Nhấn để hiện từ"
            style="background:#e2e8f0;border-radius:4px;width:${Math.max(w.length*9,28)}px;height:22px;margin:2px;vertical-align:middle;
              cursor:pointer;display:inline-block;transition:background .15s"
            onmouseover="this.style.background='#cbd5e1'" onmouseout="this.style.background='#e2e8f0'"></span>`
        }).join('')
      : `<span style="color:#94a3b8;font-size:14px">Chọn bài từ danh sách bên trái</span>`

    return `
      <div style="max-width:680px;margin:auto;padding:20px 24px">
        <div style="background:white;border-radius:14px;border:1px solid #e2e8f0;padding:18px;margin-bottom:12px">
          <div style="display:flex;gap:6px;margin-bottom:14px">
            ${[30,50,100].map(p => `
              <button onclick="listenHidePercent(${p})"
                style="padding:4px 12px;border-radius:7px;border:none;cursor:pointer;font-size:12px;font-weight:600;
                  background:${hidePercent===p?'#0f172a':'#f1f5f9'};color:${hidePercent===p?'white':'#64748b'}">
                ${p}%
              </button>`).join('')}
          </div>
          <div style="min-height:56px;display:flex;align-items:center;flex-wrap:wrap;line-height:2.4">
            ${display}
          </div>
        </div>

        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">
          ${[1,2,3].map(n => `
            <button onclick="listenReveal(${n})"
              style="padding:8px 14px;border-radius:10px;border:1px solid #e2e8f0;background:white;cursor:pointer;font-size:13px;color:#374151;display:flex;align-items:center;gap:5px">
              👁 ${n} từ
            </button>`).join('')}
          <button onclick="listenRevealAll()"
            style="padding:8px 14px;border-radius:10px;border:1px solid #e2e8f0;background:white;cursor:pointer;font-size:13px;color:#374151">
            Tất cả
          </button>
          <button onclick="listenReset()"
            style="padding:8px 14px;border-radius:10px;border:1px solid #e2e8f0;background:white;cursor:pointer;font-size:13px;color:#64748b;margin-left:auto">
            ↺ Reset
          </button>
        </div>

        <div style="text-align:center;font-size:12px;color:#94a3b8">
          <span style="background:#f1f5f9;padding:2px 7px;border-radius:4px;font-family:monospace">Ctrl</span> phát lại &nbsp;•&nbsp;
          <span style="background:#f1f5f9;padding:2px 7px;border-radius:4px;font-family:monospace">Tab</span> lật từ &nbsp;•&nbsp;
          <span style="background:#f1f5f9;padding:2px 7px;border-radius:4px;font-family:monospace">Enter</span> câu tiếp theo
        </div>
      </div>`
  }

  // ── Nghe Chép ─────────────────────────────────────────────────────────────
  function renderDictate(sentences, sentence, words) {
    const allDone = hiddenWordIdxs.length > 0 && hiddenWordIdxs.every(i => correctWords.has(i))

    const sentenceHTML = words.map((word, wordIdx) => {
      const hiddenPos = hiddenWordIdxs.indexOf(wordIdx)
      if (hiddenPos < 0)
        return `<span style="font-size:16px;color:#374151">${escapeHtml(word)}</span>`
      if (correctWords.has(wordIdx))
        return `<span style="background:#dcfce7;color:#16a34a;font-size:16px;font-weight:500;padding:1px 6px;border-radius:5px;display:inline-block">${escapeHtml(word)}</span>`
      if (hiddenPos === activeHiddenIdx) {
        const bare  = word.replace(/[.,!?;:'"]/g,'')
        const punct = word.slice(bare.length)
        const w     = Math.max(bare.length * 11 + 14, 40)
        return `<span style="display:inline-flex;align-items:center;gap:1px">
          <input id="wi-${wordIdx}" type="text"
            value="${escapeHtml(wordInputs[wordIdx]||'')}"
            autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"
            oninput="listenWordType(${wordIdx},this.value)"
            onkeydown="listenWordKey(event,${wordIdx})"
            style="width:${w}px;border:none;border-bottom:2px solid #2563eb;outline:none;font-size:15px;text-align:center;background:transparent;color:#2563eb;font-family:inherit;padding:2px 0"
          />${punct?`<span style="font-size:16px;color:#374151">${escapeHtml(punct)}</span>`:''}</span>`
      }
      const bare  = word.replace(/[.,!?;:'"]/g,'')
      const punct = word.slice(bare.length)
      const dots  = '•'.repeat(bare.length)
      return `<span onclick="listenActivateHidden(${hiddenPos})"
        style="cursor:pointer;color:#94a3b8;letter-spacing:2px;font-size:11px;padding:1px 3px;border-bottom:1px solid #cbd5e1;vertical-align:middle;display:inline-block">${dots}${punct?`<span style="color:#374151;font-size:16px;letter-spacing:0">${escapeHtml(punct)}</span>`:''}</span>`
    }).join(' ')

    return `
      <div style="max-width:680px;margin:auto;padding:20px 24px">
        <div style="background:white;border-radius:14px;border:2px solid ${allDone?'#86efac':'#e2e8f0'};padding:20px;margin-bottom:12px;transition:border-color .3s">
          <div style="display:flex;gap:6px;margin-bottom:14px">
            ${[30,50,100].map(p => `
              <button onclick="listenHidePercent(${p})"
                style="padding:4px 12px;border-radius:7px;border:none;cursor:pointer;font-size:12px;font-weight:600;
                  background:${hidePercent===p?'#0f172a':'#f1f5f9'};color:${hidePercent===p?'white':'#64748b'}">
                ${p}%
              </button>`).join('')}
          </div>
          <div style="min-height:56px;display:flex;align-items:center;flex-wrap:wrap;gap:5px;line-height:2.4">
            ${words.length ? sentenceHTML : `<span style="color:#94a3b8;font-size:14px">Chọn bài từ danh sách bên trái</span>`}
          </div>
        </div>

        ${allDone ? `
          <div style="background:#f0fdf4;border-radius:10px;padding:10px 16px;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between">
            <span style="font-size:14px;font-weight:600;color:#16a34a">✓ Hoàn thành!</span>
            ${sentenceIdx < sentences.length - 1
              ? `<button onclick="listenNextSentence()" style="padding:7px 16px;border:none;border-radius:8px;background:#16a34a;color:white;cursor:pointer;font-size:13px;font-weight:600">Câu tiếp →</button>`
              : ''}
          </div>` : ''}

        <div style="text-align:center;font-size:12px;color:#94a3b8;margin-bottom:4px">
          <span style="background:#f1f5f9;padding:2px 7px;border-radius:4px;font-family:monospace">Ctrl</span> phát lại &nbsp;•&nbsp;
          <span style="background:#f1f5f9;padding:2px 7px;border-radius:4px;font-family:monospace">Tab</span> gợi ý từ &nbsp;•&nbsp;
          <span style="background:#f1f5f9;padding:2px 7px;border-radius:4px;font-family:monospace">Enter</span> câu tiếp theo
        </div>
        <div style="text-align:center;font-size:12px;color:#f59e0b">⚡ Tắt bộ gõ tiếng Việt để tự chuyển ô khi điền đúng</div>
      </div>`
  }

  // ── Handlers ──────────────────────────────────────────────────────────────
  window.listenYear  = async y  => { selYear = y; selTestId = allTests.find(t=>t.year===y)?.id; await loadGroups() }
  window.listenTest  = async id => { selTestId = id; await loadGroups() }
  window.listenPart  = async p  => { selPart = p; await loadGroups() }
  window.listenTab   = t => { tab = t; resetDict(); render() }

  window.listenToggleGroup = id => {
    if (expandedGroups.has(id)) expandedGroups.delete(id)
    else expandedGroups.add(id)
    render()
  }

  window.listenSelectSentence = (groupId, si) => {
    if (selGroupId !== groupId) {
      selGroupId = groupId
      expandedGroups.add(groupId)
    }
    sentenceIdx = si
    resetDict()
    render()
    setTimeout(() => listenPlayAudio(), 120)
  }

  window.listenPlayAudio = () => {
    const a = document.getElementById('listen-audio')
    if (a) { a.currentTime = 0; a.play().catch(() => {}) }
  }

  window.listenReplay = () => {
    const a = document.getElementById('listen-audio')
    if (a) { a.currentTime = 0; a.play().catch(() => {}) }
  }

  // Navigate backward (toolbar ⟨)
  window.listenPrevSentence = () => {
    if (sentenceIdx > 0) {
      sentenceIdx--; resetDict(); render()
    } else {
      const gi = groups.findIndex(gr => gr.id === selGroupId)
      if (gi > 0) {
        selGroupId  = groups[gi-1].id
        expandedGroups.add(selGroupId)
        sentenceIdx = groups[gi-1].sentences.length - 1
        resetDict(); render()
      }
    }
  }

  // Mark done + advance (toolbar ⟩ and Enter shortcut)
  window.listenNextSentence = () => {
    markDone()
    const g = getGroup()
    if (g && sentenceIdx < g.sentences.length - 1) {
      sentenceIdx++; resetDict(); render()
    } else {
      const gi = groups.findIndex(gr => gr.id === selGroupId)
      const next = groups[gi + 1]
      if (next) {
        selGroupId = next.id
        expandedGroups.add(next.id)
        sentenceIdx = 0
        resetDict(); render()
      }
    }
  }

  // Toolbar ⟩ (doesn't mark done, just navigates)
  window.listenNextSentenceNav = () => window.listenNextSentence()

  window.listenSpeed = s => {
    speed = s
    const a = document.getElementById('listen-audio')
    if (a) a.playbackRate = s
    render()
  }

  window.listenToggleBilingual = () => { showBilingual = !showBilingual; render() }

  window.listenRevealWord = i => { revealed.add(i); render() }

  window.listenReveal = n => {
    const still = hiddenWordIdxs.filter(i => !revealed.has(i))
    for (let i = 0; i < Math.min(n, still.length); i++) revealed.add(still[i])
    render()
  }

  window.listenRevealAll = () => {
    hiddenWordIdxs.forEach(i => revealed.add(i)); render()
  }

  window.listenReset = () => { revealed = new Set(); render() }

  window.listenHidePercent = p => {
    hidePercent = p
    const g = getGroup(); if (!g) return
    const ws = (g.sentences[sentenceIdx]||'').split(/\s+/).filter(Boolean)
    computeHiddenWords(ws)
    revealed = new Set(); wordInputs = {}; correctWords = new Set(); activeHiddenIdx = 0
    render()
    if (tab === 'dictate') setTimeout(() => focusActive(), 30)
  }

  window.listenActivateHidden = pos => {
    activeHiddenIdx = pos; render()
    setTimeout(() => focusActive(), 20)
  }

  window.listenWordType = (wordIdx, value) => {
    wordInputs[wordIdx] = value
    const words = (getGroup()?.sentences[sentenceIdx]||'').split(/\s+/).filter(Boolean)
    const strip = s => s.toLowerCase().replace(/[.,!?;:'"]/g,'').trim()
    if (strip(value) === strip(words[wordIdx]||'')) {
      correctWords.add(wordIdx)
      const nextPos = activeHiddenIdx + 1
      if (nextPos < hiddenWordIdxs.length) activeHiddenIdx = nextPos
      render(); setTimeout(() => focusActive(), 20)
      if (hiddenWordIdxs.every(i => correctWords.has(i))) { markDone(); render() }
    }
  }

  window.listenWordKey = (e, wordIdx) => {
    if (e.key === 'Tab') {
      const words = (getGroup()?.sentences[sentenceIdx]||'').split(/\s+/).filter(Boolean)
      const bare  = (words[wordIdx]||'').replace(/[.,!?;:'"]/g,'')
      const cur   = wordInputs[wordIdx] || ''
      if (cur.length < bare.length) {
        wordInputs[wordIdx] = bare.slice(0, cur.length + 1)
        const el = document.getElementById(`wi-${wordIdx}`)
        if (el) { el.value = wordInputs[wordIdx]; el.focus() }
      }
      e.preventDefault()
    }
  }

  function focusActive() {
    const idx = hiddenWordIdxs[activeHiddenIdx]
    document.getElementById(`wi-${idx}`)?.focus()
  }

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  const onKey = e => {
    if (!document.getElementById('listen-audio')) {
      document.removeEventListener('keydown', onKey); return
    }
    if (e.ctrlKey && !e.shiftKey && !e.altKey) {
      window.listenReplay(); e.preventDefault(); return
    }
    if (e.target.tagName === 'INPUT') return
    if (e.key === 'Tab' && tab === 'check') {
      window.listenReveal(1); e.preventDefault()
    } else if (e.key === 'Enter' && !e.shiftKey) {
      window.listenNextSentence(); e.preventDefault()
    }
  }
  document.addEventListener('keydown', onKey)

  render()
}
