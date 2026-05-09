import { supabase } from '../supabase/client.js'

export default async function toeicListening(app) {
  let allTests  = []
  let groups    = []   // groups for current selTestId + selPart

  let selYear   = null
  let selTestId = null
  let selPart   = 1
  let selGroupId = null
  let sentenceIdx = 0
  let tab       = 'full'     // 'check' | 'dictate' | 'full'
  let revealed  = new Set()  // word indices revealed in Nghe Check
  let speed     = 1.0
  let showScript    = true
  let showBilingual = false

  // Nghe Chép state
  let hidePercent    = 50
  let hiddenWordIdxs = []   // word indices that are blanked
  let wordInputs     = {}   // wordIdx → typed string
  let correctWords   = new Set()
  let activeHiddenIdx = 0   // index into hiddenWordIdxs

  function escapeHtml(s) {
    return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  }

  // ── Loading ───────────────────────────────────────────────────────────────
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
    // Remove "M: ", "W: ", "Man: ", "Woman: ", "Narrator: " etc.
    return s.replace(/^[A-Za-z]{1,10}\s*:\s*/, '').trim()
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

    // Groups that lack passage_a need question options as fallback (Part 1 & 2)
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
      // Always prefer passage_a (strip speaker labels like M:, W:, A:, etc.)
      const pasSentences = (g.passage_a || '').split('\n')
        .map(s => stripSpeaker(s.trim()))
        .filter(Boolean)
      if (pasSentences.length) {
        const viSentences = (g.passage_a_vi || '').split('\n').map(s => s.trim()).filter(Boolean)
        return { ...g, sentences: pasSentences, viSentences }
      }

      // Fallback for Part 1 & 2 without passage_a: use question options
      const gqs = qByGroup[g.id] || []
      const sentences = []
      const viSentences = []
      for (const q of gqs) {
        if (g.part === 2 && q.question) {
          sentences.push(q.question)
          viSentences.push(q.question_vi || '')
        }
        const opts   = [q.option_a,    q.option_b,    q.option_c,    q.option_d   ]
        const optsVI = [q.option_a_vi, q.option_b_vi, q.option_c_vi, q.option_d_vi]
        opts.forEach((s, i) => { if (s) { sentences.push(s); viSentences.push(optsVI[i] || '') } })
      }
      return { ...g, sentences, viSentences }
    }).filter(g => g.sentences.length)

    selGroupId  = groups[0]?.id ?? null
    sentenceIdx = 0
    resetDict()
    render()
  }

  function computeHiddenWords(words) {
    const eligible = words.map((w,i)=>i).filter(i=>words[i].replace(/[.,!?;:'"]/g,'').length > 1)
    if (!eligible.length) { hiddenWordIdxs = []; return }
    if (hidePercent === 100) {
      hiddenWordIdxs = [...eligible]
    } else {
      const count = Math.max(1, Math.round(eligible.length * hidePercent / 100))
      const step   = eligible.length / count
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

  function getGroup()  { return groups.find(g => g.id === selGroupId) || null }

  // ── Main render ───────────────────────────────────────────────────────────
  function render() {
    const g         = getGroup()
    const sentences = g?.sentences || []
    const sentence  = sentences[sentenceIdx] || ''
    const words     = sentence.split(/\s+/).filter(Boolean)
    const testsForYear = allTests.filter(t => t.year === selYear)

    // ── Sidebar ───────────────────────────────────────────────────────────
    const sidebar = `
      <div style="width:240px;min-width:240px;background:white;border-right:1px solid #e2e8f0;display:flex;flex-direction:column;overflow:hidden">

        <div style="padding:12px 14px;border-bottom:1px solid #f1f5f9">
          <div style="display:flex;gap:5px;flex-wrap:wrap">
            ${years.map(y => `
              <button onclick="listenYear(${y})"
                style="padding:4px 11px;border-radius:14px;border:none;cursor:pointer;font-size:12px;font-weight:${y===selYear?600:400};background:${y===selYear?'#2563eb':'#f1f5f9'};color:${y===selYear?'white':'#64748b'}">
                ETS ${y}
              </button>`).join('')}
          </div>
        </div>

        <div style="padding:10px 14px;border-bottom:1px solid #f1f5f9">
          <div style="display:flex;gap:5px;flex-wrap:wrap">
            ${testsForYear.map(t => `
              <button onclick="listenTest('${t.id}')"
                style="padding:4px 11px;border-radius:14px;border:none;cursor:pointer;font-size:12px;font-weight:${t.id===selTestId?600:400};background:${t.id===selTestId?'#0f172a':'#f1f5f9'};color:${t.id===selTestId?'white':'#64748b'}">
                Test ${t.test_number}
              </button>`).join('')}
          </div>
        </div>

        <div style="padding:10px 14px;border-bottom:1px solid #f1f5f9">
          <div style="display:flex;gap:5px">
            ${[1,2,3,4].map(p => `
              <button onclick="listenPart(${p})"
                style="flex:1;padding:6px 2px;border-radius:8px;border:none;cursor:pointer;font-size:12px;font-weight:${p===selPart?600:400};background:${p===selPart?'#2563eb':'#f1f5f9'};color:${p===selPart?'white':'#64748b'}">
                P${p}
              </button>`).join('')}
          </div>
        </div>

        <div style="flex:1;overflow-y:auto;padding:8px">
          ${!groups.length
            ? `<div style="padding:20px;text-align:center;color:#94a3b8;font-size:13px">Chưa có dữ liệu</div>`
            : groups.map((gr, i) => {
                const active = gr.id === selGroupId
                return `
                  <div onclick="listenGroup('${gr.id}')"
                    style="padding:10px 12px;border-radius:10px;cursor:pointer;margin-bottom:3px;background:${active?'#eff6ff':'transparent'};border:1px solid ${active?'#bfdbfe':'transparent'}">
                    <div style="font-size:13px;font-weight:${active?600:500};color:${active?'#1d4ed8':'#374151'}">Bài ${i+1}</div>
                    <div style="font-size:11px;color:#94a3b8;margin-top:1px">${gr.sentences.length} câu</div>
                  </div>`
              }).join('')}
        </div>
      </div>`

    // ── Mode tabs ─────────────────────────────────────────────────────────
    const tabs = `
      <div style="display:flex;gap:2px;background:#f1f5f9;border-radius:10px;padding:3px">
        ${[['check','Nghe Check'],['dictate','Nghe Chép'],['full','Nghe Full']].map(([t,lbl]) => `
          <button onclick="listenTab('${t}')"
            style="padding:6px 18px;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:${tab===t?600:400};background:${tab===t?'white':'transparent'};color:${tab===t?'#0f172a':'#64748b'};box-shadow:${tab===t?'0 1px 3px rgba(0,0,0,.1)':'none'}">
            ${lbl}
          </button>`).join('')}
      </div>`

    // ── Content ───────────────────────────────────────────────────────────
    const content = !g
      ? `<div style="flex:1;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:14px">Chưa có dữ liệu cho phần này</div>`
      : tab === 'full'    ? renderFull(g, sentences, sentence)
      : tab === 'check'   ? renderCheck(g, sentences, sentence, words)
      :                     renderDictate(g, sentences, sentence, words)

    app.innerHTML = `
      <div style="min-height:100vh;background:#f8faff;display:flex;flex-direction:column">

        <div style="background:white;border-bottom:1px solid #e2e8f0;height:56px;padding:0 24px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;position:sticky;top:0;z-index:20">
          <button onclick="navigate('/toeic')" style="background:none;border:none;cursor:pointer;color:#64748b;font-size:14px;padding:0">← TOEIC Hub</button>
          <span style="font-size:15px;font-weight:700;color:#0f172a;font-family:'Space Grotesk',sans-serif">TOEIC Listening</span>
          ${tabs}
        </div>

        <div style="flex:1;display:flex;overflow:hidden;min-height:calc(100vh - 56px)">
          ${sidebar}
          <div style="flex:1;overflow-y:auto">${content}</div>
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
      <div style="max-width:700px;margin:auto;padding:28px 24px">

        <div style="background:white;border-radius:16px;border:1px solid #e2e8f0;padding:20px;margin-bottom:18px">
          <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:16px">
            <button onclick="listenPrevSentence()" ${sentenceIdx===0?'disabled':''}
              style="width:34px;height:34px;border-radius:50%;border:1px solid #e2e8f0;background:white;cursor:${sentenceIdx===0?'default':'pointer'};color:#64748b;font-size:14px;display:flex;align-items:center;justify-content:center;opacity:${sentenceIdx===0?.4:1}">⏮</button>
            <audio id="listen-audio" controls controlsList="nodownload noplaybackrate" style="height:38px" src="${escapeHtml(g.audio_url||'')}"></audio>
            <button onclick="listenNextSentence()" ${sentenceIdx>=sentences.length-1?'disabled':''}
              style="width:34px;height:34px;border-radius:50%;border:1px solid #e2e8f0;background:white;cursor:${sentenceIdx>=sentences.length-1?'default':'pointer'};color:#64748b;font-size:14px;display:flex;align-items:center;justify-content:center;opacity:${sentenceIdx>=sentences.length-1?.4:1}">⏭</button>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">
            <div style="display:flex;align-items:center;gap:6px">
              <button onclick="listenToggleScript()" style="background:none;border:none;cursor:pointer;font-size:12px;color:#64748b">
                ${showScript?'👁 Ẩn script':'👁 Hiện script'}
              </button>
              ${hasVI ? `
                <button onclick="listenToggleBilingual()"
                  style="padding:4px 10px;border-radius:7px;border:none;cursor:pointer;font-size:12px;font-weight:600;background:${showBilingual?'#0369a1':'#f1f5f9'};color:${showBilingual?'white':'#64748b'}">
                  🌐 Song ngữ
                </button>` : ''}
            </div>
            <span style="font-size:12px;color:#94a3b8">Câu ${sentenceIdx+1} / ${sentences.length}</span>
            <div style="display:flex;gap:4px">
              ${[0.5,0.75,1.0].map(s=>`
                <button onclick="listenSpeed(${s})"
                  style="padding:4px 10px;border-radius:7px;border:none;cursor:pointer;font-size:12px;font-weight:600;background:${speed===s?'#2563eb':'#f1f5f9'};color:${speed===s?'white':'#64748b'}">
                  ${s===1?'1x':s+'x'}
                </button>`).join('')}
            </div>
          </div>
        </div>

        ${showScript ? `
          <div style="background:white;border-radius:16px;border:1px solid #e2e8f0;padding:20px;margin-bottom:14px">
            <div style="font-size:10px;color:#94a3b8;font-weight:700;letter-spacing:.8px;margin-bottom:12px">TRANSCRIPT</div>
            ${sentences.map((s,i)=>`
              <div onclick="listenGoSentence(${i})"
                style="padding:8px 12px;border-radius:8px;margin-bottom:5px;cursor:pointer;background:${i===sentenceIdx?'#eff6ff':'transparent'};border:1px solid ${i===sentenceIdx?'#bfdbfe':'transparent'}">
                <div style="font-size:14px;color:${i===sentenceIdx?'#1d4ed8':'#374151'};font-weight:${i===sentenceIdx?500:400};line-height:1.7">${escapeHtml(s)}</div>
                ${showBilingual && viLines[i] ? `<div style="font-size:12.5px;color:#0369a1;font-style:italic;line-height:1.6;margin-top:3px">${escapeHtml(viLines[i])}</div>` : ''}
              </div>`).join('')}
          </div>` : ''}

        ${sentences.length>1 ? `
          <div style="display:flex;gap:5px;justify-content:center;margin-top:20px;flex-wrap:wrap">
            ${sentences.map((_,i)=>`
              <button onclick="listenGoSentence(${i})"
                style="width:${i===sentenceIdx?24:8}px;height:8px;border-radius:4px;border:none;cursor:pointer;background:${i===sentenceIdx?'#2563eb':'#e2e8f0'};transition:all .2s;padding:0">
              </button>`).join('')}
          </div>` : ''}
      </div>`
  }

  // ── Nghe Check ────────────────────────────────────────────────────────────
  function renderCheck(g, sentences, sentence, words) {
    const sentenceDisplay = words.length
      ? words.map((w,i) => revealed.has(i)
          ? `<span style="display:inline-block;background:#fef08a;border-radius:4px;padding:2px 7px;margin:3px 2px;font-size:15px;font-weight:500;color:#1e293b">${escapeHtml(w)}</span>`
          : `<span onclick="listenRevealWord(${i})" title="Nhấn để hiện từ"
              style="display:inline-block;background:#e2e8f0;border-radius:4px;width:${Math.max(w.length*9,28)}px;height:22px;margin:3px 2px;vertical-align:middle;cursor:pointer;transition:background .15s"
              onmouseover="this.style.background='#cbd5e1'"
              onmouseout="this.style.background='#e2e8f0'"></span>`
        ).join('')
      : `<span style="color:#94a3b8;font-size:14px">Chọn bài từ danh sách bên trái</span>`

    return `
      <div style="max-width:700px;margin:auto;padding:28px 24px">

        <div style="background:white;border-radius:16px;border:1px solid #e2e8f0;padding:18px;margin-bottom:18px">
          <audio id="listen-audio" controls controlsList="nodownload noplaybackrate" style="width:100%;display:block;margin-bottom:12px" src="${escapeHtml(g.audio_url||'')}"></audio>
          <div style="display:flex;align-items:center;justify-content:space-between">
            <span style="font-size:12px;color:#64748b">Câu ${sentenceIdx+1} / ${sentences.length}</span>
            <div style="display:flex;gap:4px">
              ${[0.3,0.5,1.0].map(s=>`
                <button onclick="listenSpeed(${s})"
                  style="padding:5px 12px;border-radius:8px;border:none;cursor:pointer;font-size:12px;font-weight:600;background:${speed===s?'#1d4ed8':'#f1f5f9'};color:${speed===s?'white':'#64748b'}">
                  ${s===1?'100%':s===0.5?'50%':'30%'}
                </button>`).join('')}
            </div>
          </div>
        </div>

        <div style="background:white;border-radius:16px;border:1px solid #e2e8f0;padding:22px;margin-bottom:14px;min-height:72px;display:flex;align-items:center;flex-wrap:wrap;line-height:2.2">
          ${sentenceDisplay}
        </div>

        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">
          ${[1,2,3].map(n=>`
            <button onclick="listenReveal(${n})"
              style="padding:9px 18px;border-radius:10px;border:1px solid #e2e8f0;background:white;cursor:pointer;font-size:13px;color:#374151">
              👁 ${n} từ
            </button>`).join('')}
          <button onclick="listenRevealAll()"
            style="padding:9px 18px;border-radius:10px;border:1px solid #e2e8f0;background:white;cursor:pointer;font-size:13px;color:#374151">
            Tất cả
          </button>
          <button onclick="listenReset()"
            style="padding:9px 18px;border-radius:10px;border:1px solid #e2e8f0;background:white;cursor:pointer;font-size:13px;color:#64748b;margin-left:auto">
            ↺ Reset
          </button>
        </div>

        <div style="text-align:center;font-size:12px;color:#94a3b8;margin-bottom:18px">
          <span style="background:#f1f5f9;padding:2px 8px;border-radius:4px;font-family:monospace">Ctrl</span> phát lại &nbsp;•&nbsp;
          <span style="background:#f1f5f9;padding:2px 8px;border-radius:4px;font-family:monospace">Tab</span> lật từ &nbsp;•&nbsp;
          <span style="background:#f1f5f9;padding:2px 8px;border-radius:4px;font-family:monospace">Enter</span> câu tiếp theo
        </div>

        ${sentences.length>1 ? `
          <div style="display:flex;gap:8px;justify-content:space-between">
            <button onclick="listenPrevSentence()" ${sentenceIdx===0?'disabled':''}
              style="padding:10px 20px;border-radius:10px;border:1px solid #e2e8f0;background:white;cursor:${sentenceIdx===0?'default':'pointer'};color:#64748b;opacity:${sentenceIdx===0?.4:1}">
              ← Câu trước
            </button>
            <button onclick="listenNextSentence()" ${sentenceIdx>=sentences.length-1?'disabled':''}
              style="padding:10px 20px;border-radius:10px;border:none;background:#2563eb;cursor:${sentenceIdx>=sentences.length-1?'default':'pointer'};color:white;font-weight:600;opacity:${sentenceIdx>=sentences.length-1?.4:1}">
              Câu tiếp →
            </button>
          </div>` : ''}
      </div>`
  }

  // ── Nghe Chép ─────────────────────────────────────────────────────────────
  function renderDictate(g, sentences, sentence, words) {
    const strip = s => s.toLowerCase().replace(/[.,!?;:'"]/g,'').trim()
    const allDone = hiddenWordIdxs.length > 0 && hiddenWordIdxs.every(i => correctWords.has(i))

    const sentenceHTML = words.map((word, wordIdx) => {
      const hiddenPos = hiddenWordIdxs.indexOf(wordIdx)
      if (hiddenPos < 0) {
        return `<span style="font-size:16px;color:#374151">${escapeHtml(word)}</span>`
      }
      const isCorrect = correctWords.has(wordIdx)
      const isActive  = hiddenPos === activeHiddenIdx
      const bare      = word.replace(/[.,!?;:'"]/g,'')
      const punct     = word.slice(bare.length)
      const dots      = '•'.repeat(bare.length)

      if (isCorrect) {
        return `<span style="display:inline-block;background:#dcfce7;color:#16a34a;font-size:16px;font-weight:500;padding:1px 6px;border-radius:5px">${escapeHtml(word)}</span>`
      }
      if (isActive) {
        const w = Math.max(bare.length * 11 + 14, 40)
        return `<span style="display:inline-flex;align-items:center;gap:1px"><input id="wi-${wordIdx}" type="text"
          value="${escapeHtml(wordInputs[wordIdx]||'')}"
          autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"
          oninput="listenWordType(${wordIdx},this.value)"
          onkeydown="listenWordKey(event,${wordIdx})"
          style="width:${w}px;border:none;border-bottom:2px solid #2563eb;outline:none;font-size:15px;text-align:center;background:transparent;color:#1d4ed8;font-family:inherit;padding:2px 0"
        />${punct?`<span style="font-size:16px;color:#374151">${escapeHtml(punct)}</span>`:''}</span>`
      }
      return `<span onclick="listenActivateHidden(${hiddenPos})"
        style="display:inline-block;cursor:pointer;color:#94a3b8;letter-spacing:2px;font-size:11px;padding:1px 3px;border-bottom:1px solid #cbd5e1;vertical-align:middle">${dots}${punct?`<span style="color:#374151;font-size:16px;letter-spacing:0">${escapeHtml(punct)}</span>`:''}</span>`
    }).join(' ')

    return `
      <div style="max-width:700px;margin:auto;padding:28px 24px">

        <div style="background:white;border-radius:16px;border:1px solid #e2e8f0;padding:18px;margin-bottom:18px">
          <audio id="listen-audio" controls controlsList="nodownload noplaybackrate" style="width:100%;display:block;margin-bottom:12px" src="${escapeHtml(g.audio_url||'')}"></audio>
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
            <div style="display:flex;align-items:center;gap:8px">
              <span style="font-size:12px;color:#64748b">Ẩn từ:</span>
              ${[30,50,100].map(p=>`
                <button onclick="listenHidePercent(${p})"
                  style="padding:4px 10px;border-radius:7px;border:none;cursor:pointer;font-size:12px;font-weight:600;background:${hidePercent===p?'#1d4ed8':'#f1f5f9'};color:${hidePercent===p?'white':'#64748b'}">
                  ${p}%
                </button>`).join('')}
            </div>
            <div style="display:flex;align-items:center;gap:8px">
              <span style="font-size:12px;color:#94a3b8">Câu ${sentenceIdx+1}/${sentences.length}</span>
              ${[0.5,1.0].map(s=>`
                <button onclick="listenSpeed(${s})"
                  style="padding:4px 10px;border-radius:7px;border:none;cursor:pointer;font-size:12px;font-weight:600;background:${speed===s?'#1d4ed8':'#f1f5f9'};color:${speed===s?'white':'#64748b'}">
                  ${s===1?'1x':'0.5x'}
                </button>`).join('')}
            </div>
          </div>
        </div>

        <div style="background:white;border-radius:16px;border:2px solid ${allDone?'#86efac':'#e2e8f0'};padding:24px;margin-bottom:14px;min-height:72px;display:flex;align-items:center;flex-wrap:wrap;gap:6px;line-height:2.4;transition:border-color .3s">
          ${words.length ? sentenceHTML : `<span style="color:#94a3b8;font-size:14px">Chọn bài từ danh sách bên trái</span>`}
        </div>

        ${allDone ? `
          <div style="background:#f0fdf4;border-radius:12px;padding:12px 18px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between">
            <span style="font-size:14px;font-weight:600;color:#16a34a">✓ Hoàn thành!</span>
            ${sentenceIdx<sentences.length-1?`<button onclick="listenNextSentence()" style="padding:8px 20px;border:none;border-radius:8px;background:#16a34a;color:white;cursor:pointer;font-size:13px;font-weight:600">Câu tiếp →</button>`:''}
          </div>` : ''}

        <div style="text-align:center;font-size:12px;color:#94a3b8;margin-bottom:6px">
          <span style="background:#f1f5f9;padding:2px 7px;border-radius:4px;font-family:monospace">Ctrl</span> phát lại &nbsp;•&nbsp;
          <span style="background:#f1f5f9;padding:2px 7px;border-radius:4px;font-family:monospace">Tab</span> gợi ý từ &nbsp;•&nbsp;
          <span style="background:#f1f5f9;padding:2px 7px;border-radius:4px;font-family:monospace">Enter</span> câu tiếp theo
        </div>
        <div style="text-align:center;font-size:12px;color:#f59e0b;margin-bottom:18px">⚡ Tắt bộ gõ tiếng Việt để tự chuyển ô khi điền đúng</div>

        ${sentences.length>1 ? `
          <div style="display:flex;gap:8px;justify-content:space-between">
            <button onclick="listenPrevSentence()" ${sentenceIdx===0?'disabled':''}
              style="padding:10px 20px;border-radius:10px;border:1px solid #e2e8f0;background:white;cursor:${sentenceIdx===0?'default':'pointer'};color:#64748b;opacity:${sentenceIdx===0?.4:1}">← Câu trước</button>
            <button onclick="listenNextSentence()"
              style="padding:10px 20px;border-radius:10px;border:none;background:#2563eb;cursor:pointer;color:white;font-weight:600">Câu tiếp →</button>
          </div>` : ''}
      </div>`
  }

  // ── Handlers ──────────────────────────────────────────────────────────────
  window.listenYear  = async y => { selYear = y; selTestId = allTests.find(t=>t.year===y)?.id; await loadGroups() }
  window.listenTest  = async id => { selTestId = id; await loadGroups() }
  window.listenPart  = async p => { selPart = p; await loadGroups() }
  window.listenGroup = id => { selGroupId = id; sentenceIdx = 0; resetDict(); render() }
  window.listenTab   = t => { tab = t; resetDict(); render() }

  window.listenGoSentence   = i => { sentenceIdx = i; resetDict(); render() }
  window.listenPrevSentence = () => { if (sentenceIdx>0) { sentenceIdx--; resetDict(); render() } }
  window.listenNextSentence = () => {
    const g = getGroup()
    if (g && sentenceIdx < g.sentences.length-1) { sentenceIdx++; resetDict(); render() }
  }

  window.listenToggleScript    = () => { showScript    = !showScript;    render() }
  window.listenToggleBilingual = () => { showBilingual = !showBilingual; render() }
  window.listenSpeed = s => {
    speed = s
    const a = document.getElementById('listen-audio')
    if (a) a.playbackRate = s
    render()
  }

  window.listenRevealWord = i => { revealed.add(i); render() }

  window.listenReveal = n => {
    const g = getGroup(); if (!g) return
    const words = (g.sentences[sentenceIdx]||'').split(/\s+/).filter(Boolean)
    const hidden = words.map((_,i)=>i).filter(i=>!revealed.has(i))
    for (let i=0; i<Math.min(n,hidden.length); i++) revealed.add(hidden[i])
    render()
  }
  window.listenRevealAll = () => {
    const g = getGroup(); if (!g) return
    const words = (g.sentences[sentenceIdx]||'').split(/\s+/).filter(Boolean)
    words.forEach((_,i)=>revealed.add(i)); render()
  }
  window.listenReset = () => { revealed = new Set(); render() }

  window.listenHidePercent = p => {
    hidePercent = p
    const g = getGroup(); if (!g) return
    const ws = (g.sentences[sentenceIdx]||'').split(/\s+/).filter(Boolean)
    computeHiddenWords(ws); wordInputs = {}; correctWords = new Set(); activeHiddenIdx = 0
    render(); setTimeout(() => focusActive(), 30)
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
      const a = document.getElementById('listen-audio')
      if (a) { a.currentTime = 0; a.play() }
      e.preventDefault(); return
    }
    // Allow normal typing in dictate inputs — only intercept Tab/Enter when not in input
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
