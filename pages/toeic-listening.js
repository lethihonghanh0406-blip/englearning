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

  app.innerHTML = `<div style="min-height:100vh;background:#f1f5f9;display:flex;align-items:center;justify-content:center"><div style="color:#94a3b8;font-size:14px">Đang tải...</div></div>`

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

  // Cache-buster: fixed per page session — refresh page to pick up newly uploaded files
  const _audioCb = Date.now()

  // ── Audio URL per sentence ─────────────────────────────────────────────────
  function buildAudioUrl(g, sIdx) {
    const test = allTests.find(t => t.id === selTestId)
    if (!test) return ''
    const year2  = String(test.year).slice(-2)
    const letter = String.fromCharCode(97 + (sIdx || 0))
    return `https://trehfvxlqfshfhcapqca.supabase.co/storage/v1/object/public/audio_dictation/${g.group_order}_audio_${year2}_t${test.test_number}_p${selPart}_${g.group_order}_${letter}.mp3?cb=${_audioCb}`
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
    const totalDone = [...doneSentences].length

    // ── Sidebar ───────────────────────────────────────────────────────────
    const sidebar = `
      <div style="width:220px;min-width:220px;background:white;border-right:1px solid #e2e8f0;display:flex;flex-direction:column;overflow:hidden">

        <!-- Year pills -->
        <div style="padding:10px 10px 6px">
          <div style="display:flex;gap:4px;flex-wrap:wrap">
            ${years.map(y => `
              <button onclick="listenYear(${y})"
                style="padding:4px 10px;border-radius:20px;border:none;cursor:pointer;font-size:11px;font-weight:700;
                  background:${y===selYear?'#2563eb':'#f1f5f9'};color:${y===selYear?'white':'#64748b'};letter-spacing:.3px">
                ETS ${y}
              </button>`).join('')}
          </div>
        </div>

        <!-- Test grid -->
        <div style="padding:0 10px 8px">
          <div style="display:flex;gap:3px;flex-wrap:wrap">
            ${testsForYear.map(t => `
              <button onclick="listenTest('${t.id}')"
                style="padding:4px 0;border-radius:7px;border:none;cursor:pointer;font-size:11px;font-weight:${t.id===selTestId?700:500};
                  background:${t.id===selTestId?'#0f172a':'#f1f5f9'};color:${t.id===selTestId?'white':'#475569'};
                  min-width:46px;text-align:center">
                Test ${t.test_number}
              </button>`).join('')}
          </div>
        </div>

        <!-- Part tabs -->
        <div style="padding:0 10px 10px">
          <div style="display:flex;background:#f1f5f9;border-radius:9px;padding:3px;gap:2px">
            ${[1,2,3,4].map(p => `
              <button onclick="listenPart(${p})"
                style="flex:1;padding:5px 0;border-radius:6px;border:none;cursor:pointer;font-size:12px;font-weight:${p===selPart?700:500};
                  background:${p===selPart?'white':'transparent'};color:${p===selPart?'#1d4ed8':'#64748b'};
                  box-shadow:${p===selPart?'0 1px 3px rgba(0,0,0,.12)':'none'}">
                P${p}
              </button>`).join('')}
          </div>
        </div>

        <!-- Test summary -->
        <div style="padding:8px 12px 10px;border-top:1px solid #f1f5f9;border-bottom:1px solid #f1f5f9;background:#f8faff">
          <div style="font-size:13px;font-weight:700;color:#0f172a;letter-spacing:.2px">TEST ${selTest?.test_number} · ${selTest?.year}</div>
          <div style="margin-top:4px;display:flex;align-items:center;gap:6px">
            <div style="flex:1;height:4px;background:#e2e8f0;border-radius:2px;overflow:hidden">
              <div style="height:100%;width:${totalSentences?Math.round(totalDone/totalSentences*100):0}%;background:#2563eb;border-radius:2px;transition:width .3s"></div>
            </div>
            <span style="font-size:11px;color:#64748b;white-space:nowrap">${totalDone}/${totalSentences}</span>
          </div>
        </div>

        <!-- Groups list -->
        <div style="flex:1;overflow-y:auto;padding:6px">
          ${!groups.length
            ? `<div style="padding:24px;text-align:center;color:#94a3b8;font-size:13px">Chưa có dữ liệu</div>`
            : groups.map((gr, i) => {
                const isExp    = expandedGroups.has(gr.id)
                const isActive = gr.id === selGroupId
                const doneCnt  = gr.sentences.filter((_,si) => doneSentences.has(`${gr.id}-${si}`)).length
                const allDoneG = doneCnt === gr.sentences.length
                return `
                  <div style="margin-bottom:2px">
                    <div onclick="listenToggleGroup('${gr.id}')"
                      style="display:flex;align-items:center;gap:6px;padding:8px 10px;border-radius:10px;cursor:pointer;
                        background:${isActive?'#eff6ff':'transparent'};transition:background .15s"
                      onmouseover="if('${gr.id}'!='${selGroupId}')this.style.background='#f8faff'"
                      onmouseout="if('${gr.id}'!='${selGroupId}')this.style.background='transparent'">
                      <span style="font-size:15px;line-height:1">🎧</span>
                      <span style="font-size:13px;font-weight:${isActive?700:500};color:${isActive?'#1d4ed8':'#374151'};flex:1">Bài ${i+1}</span>
                      <span style="font-size:11px;color:${allDoneG?'#16a34a':'#94a3b8'};font-weight:600;min-width:28px;text-align:right">${doneCnt}/${gr.sentences.length}</span>
                      <span style="font-size:10px;color:#cbd5e1;margin-left:2px">${isExp?'▼':'▶'}</span>
                    </div>
                    ${isExp ? gr.sentences.map((_, si) => {
                      const isDone  = doneSentences.has(`${gr.id}-${si}`)
                      const isCurr  = isActive && si === sentenceIdx
                      return `
                        <div onclick="listenSelectSentence('${gr.id}',${si})"
                          style="display:flex;align-items:center;gap:8px;padding:6px 10px 6px 28px;border-radius:8px;cursor:pointer;
                            background:${isCurr?'#dbeafe':'transparent'};margin-top:1px;transition:background .15s"
                          onmouseover="if(!${isCurr})this.style.background='#f1f5f9'"
                          onmouseout="if(!${isCurr})this.style.background='transparent'">
                          <span style="font-size:13px;flex-shrink:0;line-height:1">${isDone?'✅':isCurr?'🔵':'○'}</span>
                          <span style="font-size:12.5px;color:${isCurr?'#1d4ed8':isDone?'#16a34a':'#475569'};font-weight:${isCurr?700:400}">Câu ${si+1}</span>
                        </div>`
                    }).join('') : ''}
                  </div>`
              }).join('')}
        </div>
      </div>`

    // ── Mode tabs ─────────────────────────────────────────────────────────
    const modeTabs = `
      <div style="display:flex;background:#f1f5f9;border-radius:10px;padding:3px;gap:1px">
        ${[['check','Nghe Check'],['dictate','Nghe Chép'],['full','Nghe Full']].map(([t,lbl]) => `
          <button onclick="listenTab('${t}')"
            style="padding:6px 16px;border:none;border-radius:8px;cursor:pointer;font-size:12.5px;white-space:nowrap;
              font-weight:${tab===t?700:500};background:${tab===t?'white':'transparent'};
              color:${tab===t?'#1d4ed8':'#64748b'};box-shadow:${tab===t?'0 1px 4px rgba(0,0,0,.1)':'none'};
              transition:all .15s">
            ${lbl}
          </button>`).join('')}
      </div>`

    // ── Audio toolbar ─────────────────────────────────────────────────────
    const audioUrl = g ? buildAudioUrl(g, sentenceIdx) : ''
    const atDisPrev = !g || (sentenceIdx === 0 && groups.indexOf(g) === 0)
    const atDisNext = !g || (sentenceIdx >= sentences.length - 1 && groups.indexOf(g) >= groups.length - 1)
    const gIdx = g ? groups.indexOf(g) : -1
    const audioToolbar = `
      <div style="background:white;border-bottom:1px solid #e2e8f0;padding:10px 20px;display:flex;align-items:center;gap:12px;flex-shrink:0">
        ${g ? `<audio id="listen-audio" src="${audioUrl}" preload="metadata" style="display:none"
          ontimeupdate="listenAudioProgress()" onplay="document.getElementById('listen-play-btn').innerHTML='⏸'" onpause="document.getElementById('listen-play-btn').innerHTML='▶'" onended="document.getElementById('listen-play-btn').innerHTML='▶'"></audio>` : ''}

        <!-- Nav buttons -->
        <button onclick="listenPrevSentence()" ${atDisPrev?'disabled':''}
          style="width:32px;height:32px;border-radius:50%;border:1px solid #e2e8f0;background:white;
            cursor:${atDisPrev?'not-allowed':'pointer'};color:#374151;font-size:16px;font-weight:700;
            display:flex;align-items:center;justify-content:center;opacity:${atDisPrev?.35:1};flex-shrink:0">‹</button>

        <button onclick="listenPlayAudio()" id="listen-play-btn"
          style="width:42px;height:42px;border-radius:50%;border:none;background:#2563eb;cursor:pointer;
            color:white;font-size:16px;display:flex;align-items:center;justify-content:center;flex-shrink:0;
            box-shadow:0 2px 10px rgba(37,99,235,.35);transition:transform .1s"
          onmousedown="this.style.transform='scale(.93)'" onmouseup="this.style.transform='scale(1)'">▶</button>

        <button onclick="listenNextSentenceNav()" ${atDisNext?'disabled':''}
          style="width:32px;height:32px;border-radius:50%;border:1px solid #e2e8f0;background:white;
            cursor:${atDisNext?'not-allowed':'pointer'};color:#374151;font-size:16px;font-weight:700;
            display:flex;align-items:center;justify-content:center;opacity:${atDisNext?.35:1};flex-shrink:0">›</button>

        <!-- Progress + label -->
        <div style="flex:1;min-width:0">
          <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px">
            <span style="font-size:12px;font-weight:600;color:#374151">${g ? `Bài ${gIdx+1} · Câu ${sentenceIdx+1}` : '—'}</span>
            <span style="font-size:11px;color:#94a3b8">${sentenceIdx+1} / ${sentences.length||1}</span>
          </div>
          <div style="position:relative;height:6px;background:#e2e8f0;border-radius:3px;cursor:pointer" onclick="listenSeekClick(event,this)">
            <div id="listen-progress-bar" style="height:100%;width:0%;background:#2563eb;border-radius:3px;transition:width .1s;pointer-events:none"></div>
            <div id="listen-progress-thumb" style="position:absolute;top:50%;left:0%;transform:translate(-50%,-50%);width:12px;height:12px;background:#2563eb;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.2);pointer-events:none;opacity:0;transition:opacity .15s"></div>
          </div>
          <span id="listen-time" style="font-size:10px;color:#94a3b8;margin-top:2px;display:block">0:00</span>
        </div>

        <!-- Speed -->
        <div style="display:flex;background:#f1f5f9;border-radius:8px;padding:2px;gap:1px;flex-shrink:0">
          ${[0.5,0.75,1.0].map(s => `
            <button onclick="listenSpeed(${s})"
              style="padding:4px 9px;border-radius:6px;border:none;cursor:pointer;font-size:11px;font-weight:700;
                background:${speed===s?'white':'transparent'};color:${speed===s?'#2563eb':'#64748b'};
                box-shadow:${speed===s?'0 1px 3px rgba(0,0,0,.1)':'none'};transition:all .15s">
              ${s===1?'1x':s+'x'}
            </button>`).join('')}
        </div>

        <button onclick="listenReplay()" title="Phát lại (Ctrl)"
          style="width:32px;height:32px;border-radius:50%;border:1px solid #e2e8f0;background:white;cursor:pointer;
            color:#64748b;font-size:15px;display:flex;align-items:center;justify-content:center;flex-shrink:0">↺</button>
      </div>`

    // ── Content ───────────────────────────────────────────────────────────
    const content = !g
      ? `<div style="flex:1;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:14px">Chưa có dữ liệu cho phần này</div>`
      : tab === 'full'    ? renderFull(g, sentences, sentence)
      : tab === 'check'   ? renderCheck(sentences, sentence, words)
      :                     renderDictate(sentences, sentence, words)

    // Pause old audio before replacing DOM
    const prevAudio = document.getElementById('listen-audio')
    if (prevAudio) prevAudio.pause()

    app.innerHTML = `
      <div style="min-height:100vh;background:#f1f5f9;display:flex;flex-direction:column">

        <!-- Top bar -->
        <div style="background:white;border-bottom:1px solid #e2e8f0;height:54px;padding:0 24px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;position:sticky;top:0;z-index:20;box-shadow:0 1px 3px rgba(0,0,0,.05)">
          <button onclick="navigate('/toeic')" style="background:none;border:none;cursor:pointer;color:#64748b;font-size:13.5px;padding:0;display:flex;align-items:center;gap:5px;font-weight:500">
            ← TOEIC Hub
          </button>
          <span style="font-size:15px;font-weight:700;color:#0f172a;letter-spacing:-.2px">TOEIC Listening</span>
          ${modeTabs}
        </div>

        <div style="flex:1;display:flex;overflow:hidden;min-height:calc(100vh - 54px)">
          ${sidebar}
          <div style="flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0">
            ${audioToolbar}
            <div style="flex:1;overflow-y:auto">${content}</div>
          </div>
        </div>
      </div>`

    const audio = document.getElementById('listen-audio')
    if (audio) { audio.playbackRate = speed; audio.load() }
    // Show progress thumb on hover
    const progressEl = app.querySelector('[id="listen-progress-thumb"]')?.parentElement
    if (progressEl) {
      progressEl.addEventListener('mouseover', () => { document.getElementById('listen-progress-thumb').style.opacity = '1' })
      progressEl.addEventListener('mouseout',  () => { document.getElementById('listen-progress-thumb').style.opacity = '0' })
    }
    if (tab === 'dictate') setTimeout(() => focusActive(), 30)
  }

  // ── Nghe Full ─────────────────────────────────────────────────────────────
  function renderFull(g, sentences, sentence) {
    const viLines = g.viSentences || []
    const hasVI   = viLines.some(Boolean)
    return `
      <div style="max-width:720px;margin:0 auto;padding:24px">
        <div style="background:white;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 1px 6px rgba(0,0,0,.06)">
          <div style="padding:14px 20px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between">
            <span style="font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:1px">TRANSCRIPT</span>
            ${hasVI ? `
              <button onclick="listenToggleBilingual()"
                style="padding:4px 13px;border-radius:20px;border:1px solid ${showBilingual?'#0369a1':'#e2e8f0'};cursor:pointer;font-size:12px;font-weight:600;
                  background:${showBilingual?'#eff6ff':'white'};color:${showBilingual?'#0369a1':'#64748b'}">
                🌐 Song ngữ
              </button>` : ''}
          </div>
          <div style="padding:12px 16px">
            ${sentences.map((s,i) => `
              <div onclick="listenSelectSentence('${g.id}',${i})"
                style="padding:10px 12px;border-radius:10px;margin-bottom:2px;cursor:pointer;transition:background .15s;
                  background:${i===sentenceIdx?'#eff6ff':'transparent'};
                  border-left:3px solid ${i===sentenceIdx?'#2563eb':'transparent'}">
                <div style="font-size:14.5px;color:${i===sentenceIdx?'#1d4ed8':'#374151'};font-weight:${i===sentenceIdx?600:400};line-height:1.7">${escapeHtml(s)}</div>
                ${showBilingual && viLines[i] && !isSpeakerLine(s) && !isVISpeakerLine(viLines[i])
                  ? `<div style="font-size:13px;color:#0369a1;font-style:italic;line-height:1.6;margin-top:3px">${escapeHtml(viLines[i])}</div>` : ''}
              </div>`).join('')}
          </div>
        </div>
      </div>`
  }

  // ── Nghe Check ────────────────────────────────────────────────────────────
  function renderCheck(sentences, sentence, words) {
    const revealedCount = hiddenWordIdxs.filter(i => revealed.has(i)).length
    const display = words.length
      ? words.map((w,i) => {
          if (!hiddenWordIdxs.includes(i))
            return `<span style="font-size:17px;color:#1e293b;line-height:2">${escapeHtml(w)}</span>`
          if (revealed.has(i))
            return `<span style="background:#fef08a;border-radius:5px;padding:2px 8px;font-size:17px;font-weight:600;color:#1e293b;display:inline-block;line-height:2">${escapeHtml(w)}</span>`
          const wLen = Math.max(w.replace(/[.,!?;:'"]/g,'').length * 10, 32)
          return `<span onclick="listenRevealWord(${i})" title="Nhấn để hiện từ"
            style="background:#e2e8f0;border-radius:5px;width:${wLen}px;height:26px;margin:0 2px;vertical-align:middle;
              cursor:pointer;display:inline-block;transition:background .15s"
            onmouseover="this.style.background='#cbd5e1'" onmouseout="this.style.background='#e2e8f0'"></span>`
        }).join(' ')
      : `<span style="color:#94a3b8;font-size:14px">Chọn bài từ danh sách bên trái</span>`

    return `
      <div style="max-width:720px;margin:0 auto;padding:24px">

        <!-- Main card -->
        <div style="background:white;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 1px 6px rgba(0,0,0,.06);margin-bottom:16px">
          <!-- Card header -->
          <div style="padding:12px 18px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between">
            <div style="display:flex;gap:6px">
              ${[30,50,100].map(p => `
                <button onclick="listenHidePercent(${p})"
                  style="padding:5px 13px;border-radius:20px;border:none;cursor:pointer;font-size:12px;font-weight:700;
                    background:${hidePercent===p?'#0f172a':'#f1f5f9'};color:${hidePercent===p?'white':'#64748b'};transition:all .15s">
                  ${p}%
                </button>`).join('')}
            </div>
            <span style="font-size:11px;color:#94a3b8">${revealedCount}/${hiddenWordIdxs.length} đã hiện</span>
          </div>
          <!-- Sentence -->
          <div style="padding:28px 24px;min-height:88px;display:flex;align-items:center;flex-wrap:wrap;gap:6px;line-height:2.2">
            ${display}
          </div>
        </div>

        <!-- Action row -->
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:14px">
          <div style="display:flex;gap:6px">
            ${[1,2,3].map(n => `
              <button onclick="listenReveal(${n})"
                style="padding:8px 14px;border-radius:10px;border:1px solid #e2e8f0;background:white;cursor:pointer;font-size:13px;
                  color:#374151;display:flex;align-items:center;gap:5px;box-shadow:0 1px 2px rgba(0,0,0,.04);transition:box-shadow .15s"
                onmouseover="this.style.boxShadow='0 2px 6px rgba(0,0,0,.1)'" onmouseout="this.style.boxShadow='0 1px 2px rgba(0,0,0,.04)'">
                👁 ${n} từ
              </button>`).join('')}
            <button onclick="listenRevealAll()"
              style="padding:8px 14px;border-radius:10px;border:1px solid #e2e8f0;background:white;cursor:pointer;font-size:13px;color:#374151;
                box-shadow:0 1px 2px rgba(0,0,0,.04);transition:box-shadow .15s"
              onmouseover="this.style.boxShadow='0 2px 6px rgba(0,0,0,.1)'" onmouseout="this.style.boxShadow='0 1px 2px rgba(0,0,0,.04)'">
              Tất cả
            </button>
          </div>
          <button onclick="listenReset()"
            style="padding:8px 14px;border-radius:10px;border:1px solid #e2e8f0;background:white;cursor:pointer;font-size:13px;color:#94a3b8;margin-left:auto">
            ↺ Reset
          </button>
        </div>

        <!-- Keyboard hints -->
        <div style="text-align:center;font-size:12px;color:#94a3b8;display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap">
          <span><kbd style="background:#f1f5f9;padding:2px 7px;border-radius:4px;font-family:monospace;font-size:11px;border:1px solid #e2e8f0">Ctrl</kbd> phát lại</span>
          <span style="color:#e2e8f0">·</span>
          <span><kbd style="background:#f1f5f9;padding:2px 7px;border-radius:4px;font-family:monospace;font-size:11px;border:1px solid #e2e8f0">Tab</kbd> lật từ</span>
          <span style="color:#e2e8f0">·</span>
          <span><kbd style="background:#f1f5f9;padding:2px 7px;border-radius:4px;font-family:monospace;font-size:11px;border:1px solid #e2e8f0">Enter</kbd> câu tiếp</span>
        </div>
      </div>`
  }

  // ── Nghe Chép ─────────────────────────────────────────────────────────────
  function renderDictate(sentences, sentence, words) {
    const allDone = hiddenWordIdxs.length > 0 && hiddenWordIdxs.every(i => correctWords.has(i))

    const sentenceHTML = words.map((word, wordIdx) => {
      const hiddenPos = hiddenWordIdxs.indexOf(wordIdx)
      if (hiddenPos < 0)
        return `<span style="font-size:17px;color:#1e293b;line-height:2">${escapeHtml(word)}</span>`
      if (correctWords.has(wordIdx))
        return `<span style="background:#dcfce7;color:#16a34a;font-size:17px;font-weight:600;padding:2px 8px;border-radius:6px;display:inline-block;line-height:2">${escapeHtml(word)}</span>`
      if (hiddenPos === activeHiddenIdx) {
        const bare  = word.replace(/[.,!?;:'"]/g,'')
        const punct = word.slice(bare.length)
        const w     = Math.max(bare.length * 11 + 14, 44)
        return `<span style="display:inline-flex;align-items:center;gap:1px;line-height:2">
          <input id="wi-${wordIdx}" type="text"
            value="${escapeHtml(wordInputs[wordIdx]||'')}"
            autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"
            oninput="listenWordType(${wordIdx},this.value)"
            onkeydown="listenWordKey(event,${wordIdx})"
            style="width:${w}px;border:none;border-bottom:2px solid #2563eb;outline:none;font-size:16px;text-align:center;background:transparent;color:#2563eb;font-family:inherit;padding:2px 0"
          />${punct?`<span style="font-size:17px;color:#1e293b">${escapeHtml(punct)}</span>`:''}</span>`
      }
      const bare  = word.replace(/[.,!?;:'"]/g,'')
      const dots  = '·'.repeat(bare.length)
      return `<span onclick="listenActivateHidden(${hiddenPos})"
        style="cursor:pointer;color:#94a3b8;letter-spacing:3px;font-size:10px;padding:1px 3px;
          border-bottom:2px solid #e2e8f0;vertical-align:middle;display:inline-block;line-height:2;
          transition:border-color .15s"
        onmouseover="this.style.borderColor='#94a3b8'" onmouseout="this.style.borderColor='#e2e8f0'">${dots}</span>`
    }).join(' ')

    return `
      <div style="max-width:720px;margin:0 auto;padding:24px">

        <!-- Main card -->
        <div style="background:white;border-radius:16px;border:2px solid ${allDone?'#86efac':'#e2e8f0'};overflow:hidden;
          box-shadow:${allDone?'0 0 0 4px rgba(134,239,172,.25)':'0 1px 6px rgba(0,0,0,.06)'};margin-bottom:16px;transition:all .3s">
          <div style="padding:12px 18px;border-bottom:1px solid ${allDone?'#dcfce7':'#f1f5f9'};display:flex;align-items:center;justify-content:space-between;
            background:${allDone?'#f0fdf4':'white'}">
            <div style="display:flex;gap:6px">
              ${[30,50,100].map(p => `
                <button onclick="listenHidePercent(${p})"
                  style="padding:5px 13px;border-radius:20px;border:none;cursor:pointer;font-size:12px;font-weight:700;
                    background:${hidePercent===p?'#0f172a':'#f1f5f9'};color:${hidePercent===p?'white':'#64748b'};transition:all .15s">
                  ${p}%
                </button>`).join('')}
            </div>
            ${allDone
              ? `<span style="font-size:13px;font-weight:700;color:#16a34a">✓ Hoàn thành!</span>`
              : `<span style="font-size:11px;color:#94a3b8">${correctWords.size}/${hiddenWordIdxs.length} từ</span>`}
          </div>
          <div style="padding:28px 24px;min-height:88px;display:flex;align-items:center;flex-wrap:wrap;gap:6px;line-height:2.2">
            ${words.length ? sentenceHTML : `<span style="color:#94a3b8;font-size:14px">Chọn bài từ danh sách bên trái</span>`}
          </div>
        </div>

        ${allDone && sentenceIdx < sentences.length - 1 ? `
          <div style="display:flex;justify-content:flex-end;margin-bottom:14px">
            <button onclick="listenNextSentence()"
              style="padding:10px 20px;border:none;border-radius:12px;background:#16a34a;color:white;cursor:pointer;font-size:14px;font-weight:700;
                box-shadow:0 2px 8px rgba(22,163,74,.3)">Câu tiếp →</button>
          </div>` : ''}

        <!-- Keyboard hints -->
        <div style="text-align:center;font-size:12px;color:#94a3b8;display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap;margin-bottom:6px">
          <span><kbd style="background:#f1f5f9;padding:2px 7px;border-radius:4px;font-family:monospace;font-size:11px;border:1px solid #e2e8f0">Ctrl</kbd> phát lại</span>
          <span style="color:#e2e8f0">·</span>
          <span><kbd style="background:#f1f5f9;padding:2px 7px;border-radius:4px;font-family:monospace;font-size:11px;border:1px solid #e2e8f0">Tab</kbd> gợi ý từ</span>
          <span style="color:#e2e8f0">·</span>
          <span><kbd style="background:#f1f5f9;padding:2px 7px;border-radius:4px;font-family:monospace;font-size:11px;border:1px solid #e2e8f0">Enter</kbd> câu tiếp</span>
        </div>
        <div style="text-align:center;font-size:12px;color:#f59e0b;display:flex;align-items:center;justify-content:center;gap:5px">
          <span>⚡</span> Tắt bộ gõ tiếng Việt để tự chuyển ô khi điền đúng
        </div>
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
    setTimeout(() => window.listenReplay(), 200)
  }

  window.listenPlayAudio = () => {
    const a = document.getElementById('listen-audio')
    if (!a) return
    if (a.paused) { a.currentTime = 0; a.play().catch(() => {}) }
    else a.pause()
  }

  window.listenReplay = () => {
    const a = document.getElementById('listen-audio')
    if (a) { a.currentTime = 0; a.play().catch(() => {}) }
  }

  window.listenAudioProgress = () => {
    const a = document.getElementById('listen-audio')
    if (!a || !a.duration) return
    const pct = (a.currentTime / a.duration) * 100
    const bar  = document.getElementById('listen-progress-bar')
    const thumb = document.getElementById('listen-progress-thumb')
    const time  = document.getElementById('listen-time')
    if (bar)   bar.style.width = pct + '%'
    if (thumb) thumb.style.left = pct + '%'
    if (time) {
      const s = Math.floor(a.currentTime)
      time.textContent = `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`
    }
  }

  window.listenSeekClick = (e, el) => {
    const a = document.getElementById('listen-audio')
    if (!a || !a.duration) return
    const rect = el.getBoundingClientRect()
    const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    a.currentTime = pct * a.duration
  }

  // Navigate backward
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
    setTimeout(() => window.listenReplay(), 200)
  }

  // Mark done + advance
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
    setTimeout(() => window.listenReplay(), 200)
  }

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
