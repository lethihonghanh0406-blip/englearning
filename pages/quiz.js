import { supabase } from '../supabase/client.js'
import { requirePro } from '../utils/auth.js'

export default async function quizPage(app, params) {
  const testId = params.get("test_id")
  const year   = params.get("year")
  const test   = params.get("test")
  const parts  = (params.get("parts") || "1,2,3,4,5,6,7").split(",").map(Number)
  const mode   = params.get("mode") || "practice"
  const isExam   = mode === 'exam-full' || mode === 'exam-part'
  const isRetry  = mode === 'retry'
  const isReview = mode === 'review'

  const PART_COUNTS = { 1:6, 2:25, 3:39, 4:30, 5:30, 6:16, 7:54 }
  const EXAM_SECONDS = mode === 'exam-full'
    ? 7200
    : Math.round(parts.reduce((s, p) => s + (PART_COUNTS[p] || 0), 0) * 36)

  const INSTRUCTIONS = {
    1: "Select the one statement that best describes what you see in the picture.",
    2: "Select the best response to the question or statement.",
    3: "Select the best response to each question.",
    4: "Select the best response to each question.",
    5: "Select the best answer to complete the sentence.",
    6: "Select the best answer to complete the text.",
    7: "Select the best answer based on the reading passage.",
  }

  // ── Loading ─────────────────────────────────────────────────────────────
  app.innerHTML = `
    <div style="min-height:100vh;background:#f5f7fa;display:flex;align-items:center;justify-content:center">
      <div style="text-align:center;color:#64748b">
        <div style="font-size:36px;margin-bottom:12px">⏳</div>
        <p style="font-size:14px">Đang tải câu hỏi...</p>
      </div>
    </div>`

  // ── Fetch ────────────────────────────────────────────────────────────────
  try {
    const { data: groups, error: gErr } = await supabase
      .from('question_groups')
      .select('*')
      .eq('test_id', testId)
      .in('part', parts)
      .order('group_order')

    if (gErr || !groups?.length) throw new Error('Không tìm thấy nhóm câu hỏi')

    const { data: rawQs, error: qErr } = await supabase
      .from('questions')
      .select('*')
      .in('group_id', groups.map(g => g.id))
      .order('question_number')

    if (qErr || !rawQs?.length) throw new Error('Không tìm thấy câu hỏi')

    const vocabMap = {}
    if (!isExam) {
      const { data: vocab } = await supabase
        .from('question_vocab')
        .select('*')
        .in('question_id', rawQs.map(q => q.id))
      for (const v of (vocab || [])) {
        if (!vocabMap[v.question_id]) vocabMap[v.question_id] = []
        vocabMap[v.question_id].push(v)
      }
    }

    const groupMap = {}
    for (const g of groups) groupMap[g.id] = g

    const processedQs = rawQs.map(q => ({
      ...q,
      part: groupMap[q.group_id]?.part,
      correctIndex: 'ABCD'.indexOf(q.correct_answer),
      options: [q.option_a, q.option_b, q.option_c, q.option_d].filter(Boolean),
      options_vi: [q.option_a_vi, q.option_b_vi, q.option_c_vi, q.option_d_vi],
      vocab: vocabMap[q.id] || [],
    }))

    const organizedGroups = groups.map(g => ({
      ...g,
      questions: processedQs.filter(q => q.group_id === g.id)
    })).filter(g => g.questions.length > 0)

    let finalGroups = organizedGroups
    if (isRetry) {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const { data: wrongAnswers } = await supabase
          .from('user_answers')
          .select('question_id')
          .eq('user_id', session.user.id)
          .eq('test_id', testId)
          .eq('is_correct', false)
        const wrongIds = new Set((wrongAnswers || []).map(a => a.question_id))
        finalGroups = organizedGroups.filter(g => g.questions.some(q => wrongIds.has(q.id)))
        if (!finalGroups.length) throw new Error('Không có câu sai nào — bạn đã làm đúng hết rồi! 🎉')
      }
    }
    // Review mode: pre-load saved answers from DB (filter by specific session if available)
    let savedAnswers = {}
    if (isReview) {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const userTestId = params.get('user_test_id')
        let query = supabase
          .from('user_answers')
          .select('question_id, selected_answer')
          .eq('user_id', session.user.id)
          .eq('test_id', testId)
        if (userTestId) query = query.eq('user_test_id', userTestId)
        const { data: rows } = await query
        for (const r of (rows || [])) {
          const idx = 'ABCD'.indexOf(r.selected_answer)
          if (idx >= 0) savedAnswers[r.question_id] = idx
        }
      }
    }

    startQuiz(finalGroups, savedAnswers)
  } catch (err) {
    app.innerHTML = `
      <div style="padding:60px;text-align:center;color:#64748b">
        <div style="font-size:36px;margin-bottom:12px">⚠️</div>
        <p>${err.message}</p>
        <button onclick="history.back()" style="margin-top:16px;padding:10px 24px;background:#2563eb;color:white;border:none;border-radius:10px;cursor:pointer;font-size:14px">← Quay lại</button>
      </div>`
  }

  // ── Quiz ─────────────────────────────────────────────────────────────────
  function startQuiz(organizedGroups, savedAnswers = {}) {
    const totalGroups = organizedGroups.length
    const totalQs     = organizedGroups.reduce((s, g) => s + g.questions.length, 0)

    let reviewSession = false

    let state = {
      groupIdx:        0,
      answers:         { ...savedAnswers },   // questionId → answerIndex
      showScript:      false,
      passageView:     'en',                  // 'en' | 'bilingual' | 'vi'
      showPassageVI:   false,
      timerVal:        EXAM_SECONDS,
      timerInterval:   null,
    }

    // ── Timer ──────────────────────────────────────────────────────────────
    function clearTimer() {
      if (state.timerInterval) { clearInterval(state.timerInterval); state.timerInterval = null }
    }
    function fmt(sec) {
      return `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`
    }
    function escapeHtml(s) {
      return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
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
      return /^[A-Z][\w\s]+[\(\[]\d{1,2}:\d{2}/.test(v || '')
    }

    // ── Auto passage renderer ──────────────────────────────────────────────
    function autoRenderPassage(raw) {
      if (!raw) return ''
      if (raw.trimStart().startsWith('<')) return raw  // already HTML

      const lines   = raw.split('\n')
      const trimmed = lines.map(l => l.trim())
      const nonEmpty = trimmed.filter(Boolean)

      // Email: must have To: or From: near top (not just Date:/Subject: alone)
      if (trimmed.slice(0, 8).some(l => /^(To|From)\s*:/i.test(l))) {
        return autoEmail(trimmed, nonEmpty)
      }

      // Chat/text thread: 2+ lines matching "Name (H:MM A.M./P.M.)" or "Name [H:MM A.M.]"
      const chatHeaders = nonEmpty.filter(l => /^[\w][\w\s,\.]+[\(\[]\d{1,2}:\d{2}\s*[AP]\.M\.[\)\]]/.test(l))
      if (chatHeaders.length >= 2) {
        return autoChat(nonEmpty)
      }

      // Receipt: 3+ lines ending with $price, no pipes
      const receiptLines = nonEmpty.filter(l => /[£$€¥]\s*[\d,.]+\s*$/.test(l) && !l.includes('|'))
      if (receiptLines.length >= 3) {
        return autoReceipt(trimmed, nonEmpty)
      }

      // Multi-column table: 3+ lines with 2+ pipes (3+ columns)
      const multiPipes = trimmed.filter(l => (l.match(/\|/g) || []).length >= 2)
      if (multiPipes.length >= 3) {
        return autoTable(trimmed, multiPipes)
      }

      // 2-column form table: 3+ lines with exactly 1 pipe (label | value)
      const singlePipes = trimmed.filter(l => (l.match(/\|/g) || []).length === 1 && l.trim() !== '|')
      if (singlePipes.length >= 3) {
        return autoFormTable(trimmed, singlePipes)
      }

      // Memo/Notice: starts with MEMO/MEMORANDUM/NOTICE
      const first = nonEmpty[0] || ''
      if (/^(MEMO|MEMORANDUM|NOTICE|ANNOUNCEMENT|ADVERTISEMENT)/i.test(first)) {
        return autoMemo(nonEmpty)
      }

      // Report/Form: 3+ "Key: Value" lines (structured doc with labeled fields)
      const kvCount = nonEmpty.filter(l => /^\w[\w\s\/]+:\s+\S/.test(l)).length
      if (kvCount >= 3) {
        return autoReport(nonEmpty)
      }

      // Article with title
      return autoArticle(nonEmpty)
    }

    function autoEmail(trimmed, nonEmpty) {
      const meta = {}
      let bodyStart = 0
      for (let i = 0; i < Math.min(trimmed.length, 12); i++) {
        const m = trimmed[i].match(/^(To|From|CC|Date|Subject)\s*:\s*(.+)/i)
        if (m) { meta[m[1].toLowerCase()] = m[2]; bodyStart = i + 1 }
      }

      // Build body HTML — detect embedded pipe tables
      const bodyLines = trimmed.slice(bodyStart)
      let bodyHTML = ''
      let i = 0
      while (i < bodyLines.length) {
        const isPipe = l => (l.match(/\|/g)||[]).length >= 2
        if (isPipe(bodyLines[i])) {
          // Collect consecutive pipe lines → embedded table
          const tLines = []
          while (i < bodyLines.length && isPipe(bodyLines[i])) { tLines.push(bodyLines[i]); i++ }
          const hdrs = tLines[0].split('|').map(h => h.trim()).filter(Boolean)
          const dRows = tLines.slice(1)
          bodyHTML += `<div style="margin:12px 0;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0">
            <table style="width:100%;border-collapse:collapse;font-size:13px">
              <thead><tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0">
                ${hdrs.map(h=>`<th style="padding:8px 10px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:#64748b">${escapeHtml(h)}</th>`).join('')}
              </tr></thead>
              <tbody>
                ${dRows.map(row=>`<tr style="border-bottom:1px solid #f1f5f9">
                  ${row.split('|').map(c=>`<td style="padding:8px 10px;color:#334155">${escapeHtml(c.trim())}</td>`).join('')}
                </tr>`).join('')}
              </tbody>
            </table>
          </div>`
        } else {
          // Collect paragraph
          let para = []
          while (i < bodyLines.length && !isPipe(bodyLines[i])) {
            const l = bodyLines[i]
            if (!l) { if (para.length) { bodyHTML += `<p style="margin:0 0 12px">${para.join(' ')}</p>`; para = [] } }
            else para.push(escapeHtml(l))
            i++
          }
          if (para.length) bodyHTML += `<p style="margin:0 0 12px">${para.join(' ')}</p>`
        }
      }

      const metaRows = [['To','to'],['From','from'],['CC','cc'],['Date','date'],['Subject','subject']]
        .filter(([,k]) => meta[k])
        .map(([l,k]) => `
          <tr style="border-bottom:1px solid #f1f5f9">
            <td style="padding:8px 14px;width:68px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#64748b;background:#f8fafc">${l}</td>
            <td style="padding:8px 14px;font-size:13px;color:#1e293b">${k==='subject'?`<strong>${escapeHtml(meta[k])}</strong>`:escapeHtml(meta[k])}</td>
          </tr>`).join('')

      return `
        <div style="background:white;border-radius:14px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.06)">
          <table style="width:100%;border-collapse:collapse">${metaRows}</table>
          <div style="padding:16px 18px 20px;font-size:13.5px;line-height:1.8;color:#334155;border-top:2px solid #e2e8f0">${bodyHTML}</div>
        </div>`
    }

    function autoReceipt(lines, nonEmpty) {
      // Split: header (before date/first price), date line, items, footer
      const isDateLine = l => /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/i.test(l)
      const isPriceLine = l => /[£$€¥]\s*[\d,.]+\s*$/.test(l)
      const isFooterLine = l => /^\*\*\*|^credit card|^customer name|^card:/i.test(l)

      let headerEnd = nonEmpty.findIndex((l, i) => i > 0 && (isDateLine(l) || isPriceLine(l)))
      if (headerEnd < 0) headerEnd = 1
      const headerLines = nonEmpty.slice(0, headerEnd)
      const title = headerLines[0] || ''
      const subLines = headerLines.slice(1)

      const dateLine = nonEmpty.find(isDateLine)
      const dateIdx  = dateLine ? nonEmpty.indexOf(dateLine) : headerEnd - 1
      const bodyStart = dateLine ? dateIdx + 1 : headerEnd
      const footerStart = nonEmpty.findIndex((l, i) => i >= bodyStart && isFooterLine(l))
      const itemLines = nonEmpty.slice(bodyStart, footerStart < 0 ? undefined : footerStart)
      const footerLines = footerStart >= 0 ? nonEmpty.slice(footerStart) : []

      const isTotalLine = l => /^(subtotal|tax|total|tip|amount due|balance)/i.test(l)
      const isBoldTotal = l => /^total paid|^total owed|^amount due|^balance due/i.test(l)

      const itemsHTML = itemLines.map(line => {
        const m = line.match(/^(.+?)\s{2,}([£$€¥]\s*[\d,.]+)\s*$/) ||
                  line.match(/^(.+?):\s+([£$€¥]\s*[\d,.]+)\s*$/) ||
                  line.match(/^(.+?)\s+([£$€¥]\s*[\d,.]+)\s*$/)
        if (m) {
          const bold   = isBoldTotal(m[1])
          const subtle = isTotalLine(m[1]) && !bold
          return `<div style="display:flex;justify-content:space-between;align-items:baseline;padding:${bold?'8px 0 4px':'3px 0'};${bold?'font-weight:700;border-top:1.5px solid #334155;margin-top:6px':subtle?'color:#475569':''}">
            <span style="font-size:${bold?14:13}px">${escapeHtml(m[1].replace(/:$/,''))}</span>
            <span style="font-size:${bold?14:13}px">${escapeHtml(m[2])}</span>
          </div>`
        }
        if (!line.trim()) return ''
        return `<div style="font-size:12px;color:#64748b;padding:2px 0">${escapeHtml(line)}</div>`
      }).join('')

      return `
        <div style="background:white;border-radius:14px;border:2px solid #e2e8f0;max-width:360px;margin:0 auto;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.06)">
          <div style="text-align:center;padding:18px 20px 14px;border-bottom:2px dashed #cbd5e1">
            <div style="font-size:18px;font-weight:800;color:#0f172a">${escapeHtml(title)}</div>
            ${subLines.map(l=>`<div style="font-size:12px;color:#64748b;margin-top:3px;line-height:1.5">${escapeHtml(l)}</div>`).join('')}
          </div>
          ${dateLine ? `<div style="text-align:center;padding:7px 20px;font-size:12px;color:#64748b;border-bottom:1px solid #f1f5f9;font-style:italic">${escapeHtml(dateLine)}</div>` : ''}
          <div style="padding:14px 20px;font-family:'Courier New',monospace">${itemsHTML}</div>
          ${footerLines.length ? `
            <div style="border-top:2px dashed #cbd5e1;padding:10px 20px;text-align:center">
              ${footerLines.map(l=>`<div style="font-size:12px;color:#64748b;margin-bottom:3px">${escapeHtml(l)}</div>`).join('')}
            </div>` : ''}
        </div>`
    }

    // Shared helper: render "Key: Value" field lines (bold key, value)
    function renderKVFields(arr) {
      return arr.map(line => {
        const parts = line.split(/\s{2,}/)
        return `<div style="display:flex;gap:20px;flex-wrap:wrap;margin-bottom:6px">
          ${parts.map(p => {
            const m = p.match(/^(.+?):\s*(.+)$/)
            return m
              ? `<div style="font-size:13px"><strong style="color:#374151">${escapeHtml(m[1])}:</strong> <span style="color:#0f172a">${escapeHtml(m[2])}</span></div>`
              : `<div style="font-size:13px">${escapeHtml(p)}</div>`
          }).join('')}
        </div>`
      }).join('')
    }

    function autoFormTable(lines, singlePipes) {
      // 2-column form: "Label | Value" rows
      const firstPipeIdx = lines.findIndex(l => (l.match(/\|/g)||[]).length === 1)
      const preLines = lines.slice(0, firstPipeIdx).filter(Boolean)
      let lastPipeIdx = 0
      for (let i = lines.length - 1; i >= 0; i--) { if ((lines[i].match(/\|/g)||[]).length === 1) { lastPipeIdx = i; break } }
      const postLines = lines.slice(lastPipeIdx + 1).filter(Boolean)

      const title    = preLines[0] || ''
      const subtitle = (preLines[1] && preLines[1].length < 60 && !/\w[\w\s]+:\s+\S/.test(preLines[1])) ? preLines[1] : ''
      const intro = [], fields = []
      for (const l of preLines.slice(subtitle ? 2 : 1)) {
        if (/\w[\w\s\/]+:\s+\S/.test(l)) fields.push(l)
        else if (l.trim()) intro.push(l)
      }

      const rows = singlePipes.map(l => { const [k, ...rest] = l.split('|'); return [k.trim(), rest.join('|').trim()] })

      return `
        <div style="background:white;border-radius:14px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.06)">
          ${title ? `<div style="background:#f8fafc;color:#0f172a;text-align:center;padding:14px 20px;border-bottom:2px solid #e2e8f0">
            <div style="font-size:15px;font-weight:700">${escapeHtml(title)}</div>
            ${subtitle ? `<div style="font-size:12px;opacity:.75;margin-top:3px">${escapeHtml(subtitle)}</div>` : ''}
          </div>` : ''}
          ${(intro.length || fields.length) ? `<div style="padding:12px 16px;border-bottom:1px solid #e2e8f0">
            ${intro.map(l=>`<p style="margin:0 0 8px;font-size:13px;color:#334155;line-height:1.65">${escapeHtml(l)}</p>`).join('')}
            ${renderKVFields(fields)}
          </div>` : ''}
          <table style="width:100%;border-collapse:collapse">
            ${rows.map(([k,v]) => `<tr style="border-bottom:1px solid #e2e8f0">
              <td style="padding:9px 14px;font-size:12px;font-weight:600;color:#64748b;vertical-align:top;white-space:nowrap;background:#f8fafc;border-right:1px solid #e2e8f0;min-width:80px">${escapeHtml(k)}</td>
              <td style="padding:9px 14px;font-size:13px;color:#1e293b;line-height:1.6">${escapeHtml(v)}</td>
            </tr>`).join('')}
          </table>
          ${postLines.length ? `<div style="padding:10px 16px;font-size:12px;color:#64748b;background:#f8fafc;border-top:1px solid #e2e8f0">${postLines.map(escapeHtml).join('<br>')}</div>` : ''}
        </div>`
    }

    function autoTable(lines, pipeLines) {
      const firstPipeIdx = lines.findIndex(l => (l.match(/\|/g)||[]).length >= 2)
      const preLines = lines.slice(0, firstPipeIdx).filter(Boolean)
      const headers  = pipeLines[0].split('|').map(h => h.trim()).filter(Boolean)
      const dataRows = pipeLines.slice(1).filter(l => l.trim() && !/^[-|]+$/.test(l))
      let lastPipeIdx = 0
      for (let i = lines.length - 1; i >= 0; i--) { if ((lines[i].match(/\|/g)||[]).length >= 2) { lastPipeIdx = i; break } }
      const postLines = lines.slice(lastPipeIdx + 1).filter(Boolean)

      const title    = preLines[0] || ''
      // Second line is subtitle if short and not a Key:Value field
      const subtitle = (preLines[1] && preLines[1].length < 60 && !/\w[\w\s\/]+:\s+\S/.test(preLines[1])) ? preLines[1] : ''
      const intro = [], fields = []
      for (const l of preLines.slice(subtitle ? 2 : 1)) {
        if (/\w[\w\s\/]+:\s+\S/.test(l)) fields.push(l)
        else if (l.trim()) intro.push(l)
      }

      const footnotes = postLines.filter(l => l.startsWith('*') && !/\$/.test(l))
      const sigLines  = postLines.filter(l => /\w[\w ]+:\s+\S/.test(l))
      const isTotalRow = cells => cells.filter(Boolean).length <= 2 && cells.some(c => /^total/i.test(c))

      return `
        <div style="background:white;border-radius:14px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.06)">
          ${title ? `<div style="background:#f8fafc;color:#0f172a;text-align:center;padding:14px 20px;border-bottom:2px solid #e2e8f0">
            <div style="font-size:15px;font-weight:800;line-height:1.4">${escapeHtml(title)}</div>
            ${subtitle ? `<div style="font-size:12px;font-weight:500;opacity:.75;margin-top:3px;text-transform:uppercase;letter-spacing:.8px">${escapeHtml(subtitle)}</div>` : ''}
          </div>` : ''}
          ${(intro.length || fields.length) ? `<div style="padding:12px 16px;border-bottom:1px solid #e2e8f0">
            ${intro.map(l=>`<p style="margin:0 0 8px;font-size:13px;color:#334155;line-height:1.65">${escapeHtml(l)}</p>`).join('')}
            ${renderKVFields(fields)}
          </div>` : ''}
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead><tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0">
              ${headers.map((h,i) => `<th style="padding:9px 10px;text-align:${i===headers.length-1?'right':'left'};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:#64748b">${escapeHtml(h)}</th>`).join('')}
            </tr></thead>
            <tbody>
              ${dataRows.map(row => {
                const cells = row.split('|').map(c => c.trim())
                if (!cells.some(c => c)) return ''
                const isTotal = isTotalRow(cells)
                return `<tr style="border-bottom:1px solid #f1f5f9${isTotal?';border-top:2px solid #e2e8f0;background:#f8fafc':''}">
                  ${cells.map((c,ci) => `<td style="padding:${isTotal?'10px':'8px'} 10px;vertical-align:top;${
                    ci===cells.length-1 ? `text-align:right;font-weight:${isTotal?800:700};white-space:nowrap` :
                    ci===0 ? 'color:#374151;white-space:nowrap' : 'color:#475569'
                  }${isTotal?';font-size:14px':''}">${escapeHtml(c)}</td>`).join('')}
                </tr>`
              }).join('')}
            </tbody>
          </table>
          ${footnotes.length ? `<div style="font-size:12px;color:#dc2626;background:#fff5f5;border-top:1px solid #fee2e2;padding:8px 14px">${escapeHtml(footnotes.join(' '))}</div>` : ''}
          ${sigLines.length ? `<div style="padding:12px 16px;background:#f8fafc;border-top:1px solid #e2e8f0">${renderKVFields(sigLines)}</div>` : ''}
        </div>`
    }

    function autoChat(nonEmpty) {
      const messages = []
      let cur = null
      for (const line of nonEmpty) {
        const m = line.match(/^([\w][\w\s,\.]+?)\s*[\(\[](\d{1,2}:\d{2}\s*[AP]\.M\.)[\)\]]\s*(.*)/)
        if (m) {
          if (cur) messages.push(cur)
          cur = { speaker: m[1].trim(), time: m[2], lines: [] }
          if (m[3].trim()) cur.lines.push(m[3].trim())
        } else if (cur) {
          cur.lines.push(line)
        }
      }
      if (cur) messages.push(cur)

      const speakers = [...new Set(messages.map(m => m.speaker))]

      return `
        <div style="background:white;border-radius:14px;border:1px solid #e2e8f0;padding:18px 20px;display:flex;flex-direction:column;gap:14px;box-shadow:0 2px 12px rgba(0,0,0,.06)">
          ${messages.map((msg, i) => {
            const isFirst = speakers.indexOf(msg.speaker) === 0
            return `
            <div style="${i > 0 ? 'border-top:1px solid #f1f5f9;padding-top:14px' : ''}">
              <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:5px">
                ${escapeHtml(msg.speaker)}
                <span style="font-weight:400;color:#94a3b8;font-size:12px;margin-left:4px">(${escapeHtml(msg.time)})</span>
              </div>
              <div style="font-size:13.5px;color:#334155;line-height:1.7">
                ${msg.lines.map(l => escapeHtml(l)).join(' ')}
              </div>
            </div>`
          }).join('')}
        </div>`
    }

    function autoReport(nonEmpty) {
      const title = nonEmpty[0] || ''
      // Parse into sections: a section is started by a line ending with ":"
      // or by the implicit first section (before any section header)
      const sections = []
      let cur = { label: null, rows: [], paras: [] }

      for (let i = 1; i < nonEmpty.length; i++) {
        const line = nonEmpty[i]
        const sectionHeader = line.match(/^(.+?):\s*$/)  // "Results:"
        const kvMatch       = line.match(/^(.+?):\s+(.+)$/) // "Key: Value"

        if (sectionHeader) {
          if (cur.rows.length || cur.paras.length) sections.push(cur)
          cur = { label: sectionHeader[1], rows: [], paras: [] }
        } else if (kvMatch) {
          const [, key, val] = kvMatch
          // Long value → paragraph with bold key; short → table row
          if (val.length > 80 || /^(The |This |All |Please |Due to )/i.test(val)) {
            cur.paras.push({ key, val })
          } else {
            cur.rows.push([key, val])
          }
        } else if (line.trim()) {
          cur.paras.push({ key: null, val: line })
        }
      }
      if (cur.rows.length || cur.paras.length) sections.push(cur)

      const renderSec = sec => {
        let h = ''
        if (sec.label !== null) {
          h += `<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#64748b;padding:9px 16px 7px;background:#f8fafc;border-top:2px solid #e2e8f0">${escapeHtml(sec.label)}</div>`
        }
        if (sec.rows.length) {
          h += `<table style="width:100%;border-collapse:collapse">
            ${sec.rows.map(([k,v],ri) => `<tr style="border-bottom:1px solid #f1f5f9">
              <td style="padding:8px 16px;width:170px;font-size:13px;font-weight:700;color:#374151;vertical-align:top;white-space:nowrap">${escapeHtml(k)}</td>
              <td style="padding:8px 16px;font-size:13px;color:#1e293b">${escapeHtml(v)}</td>
            </tr>`).join('')}
          </table>`
        }
        if (sec.paras.length) {
          h += `<div style="padding:10px 16px 12px">${sec.paras.map(({key,val}) =>
            `<p style="margin:0 0 8px;font-size:13px;color:#334155;line-height:1.7">${
              key ? `<strong style="color:#0f172a">${escapeHtml(key)}:</strong> ` : ''
            }${escapeHtml(val)}</p>`
          ).join('')}</div>`
        }
        return h
      }

      return `
        <div style="background:white;border-radius:14px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.06)">
          <div style="background:#f8fafc;color:#0f172a;padding:14px 18px;border-bottom:2px solid #e2e8f0">
            <div style="font-size:15px;font-weight:700;line-height:1.4">${escapeHtml(title)}</div>
          </div>
          ${sections.map(renderSec).join('')}
        </div>`
    }

    function autoMemo(nonEmpty) {
      const title = nonEmpty[0] || ''
      const meta = []; let bodyStart = 1
      for (let i = 1; i < nonEmpty.length; i++) {
        const m = nonEmpty[i].match(/^(To|From|Date|Re|Subject)\s*:\s*(.+)/i)
        if (m) { meta.push([m[1], m[2]]); bodyStart = i + 1 }
        else { bodyStart = i; break }
      }
      const bodyLines = nonEmpty.slice(bodyStart)
      const bodyHTML = bodyLines.map(l =>
        /^[•\-\*]/.test(l)
          ? `<div style="display:flex;gap:8px;margin-bottom:6px"><span style="color:#2563eb;flex-shrink:0">•</span><span>${escapeHtml(l.replace(/^[•\-\*]\s*/,''))}</span></div>`
          : `<p style="margin:0 0 10px">${escapeHtml(l)}</p>`
      ).join('')

      return `
        <div style="background:white;border-radius:14px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.06)">
          <div style="background:#f8fafc;color:#0f172a;text-align:center;padding:14px 20px;border-bottom:2px solid #e2e8f0">
            <div style="font-size:17px;font-weight:800">${escapeHtml(title)}</div>
          </div>
          ${meta.length ? `<table style="width:100%;border-collapse:collapse;border-bottom:2px solid #e2e8f0">
            ${meta.map(([l,v])=>`<tr style="border-bottom:1px solid #f1f5f9">
              <td style="padding:7px 14px;width:68px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#64748b;background:#f8fafc">${l}</td>
              <td style="padding:7px 14px;font-size:13px;color:#1e293b">${escapeHtml(v)}</td>
            </tr>`).join('')}
          </table>` : ''}
          <div style="padding:16px 18px 20px;font-size:13.5px;line-height:1.8;color:#334155">${bodyHTML}</div>
        </div>`
    }

    function autoArticle(nonEmpty) {
      const title = nonEmpty[0] || ''
      const body  = nonEmpty.slice(1)
      const bodyHTML = body.map(l =>
        /^[•\-\*]/.test(l)
          ? `<div style="display:flex;gap:8px;margin-bottom:6px"><span style="color:#2563eb;flex-shrink:0">•</span><span>${escapeHtml(l.replace(/^[•\-\*]\s*/,''))}</span></div>`
          : `<p style="margin:0 0 10px">${escapeHtml(l)}</p>`
      ).join('')
      return `
        <div style="background:white;border-radius:14px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.06)">
          ${title ? `<div style="background:#f8fafc;color:#0f172a;padding:14px 18px;border-bottom:2px solid #e2e8f0"><div style="font-size:15px;font-weight:700">${escapeHtml(title)}</div></div>` : ''}
          <div style="padding:16px 18px 20px;font-size:13.5px;line-height:1.8;color:#334155">${bodyHTML}</div>
        </div>`
    }
    function highlightText(text, highlights) {
      if (!text) return ''
      const safe = escapeHtml(text)
      if (!highlights) return safe
      try {
        // highlights = { "qNum": [{ text, source|type }], ... }
        const obj = typeof highlights === 'string' ? JSON.parse(highlights) : highlights
        if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return safe
        const terms = Object.values(obj).flat().map(h => h && h.text).filter(Boolean)
        if (!terms.length) return safe
        const regex = new RegExp(
          `(${terms.map(t => escapeHtml(t).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')})`,
          'gi'
        )
        return safe.replace(regex, '<mark style="background:#fef08a;padding:0 2px;border-radius:2px;font-weight:600">$1</mark>')
      } catch (e) {
        return safe
      }
    }
    // Apply highlights to already-rendered HTML without escaping tags
    function highlightInHTML(html, highlights) {
      if (!html || !highlights) return html
      try {
        const obj = typeof highlights === 'string' ? JSON.parse(highlights) : highlights
        if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return html
        const terms = Object.values(obj).flat().map(h => h && h.text).filter(Boolean)
        if (!terms.length) return html
        const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const regex = new RegExp(`(${terms.map(esc).join('|')})`, 'gi')
        return html.replace(/(<[^>]*>|[^<]+)/g, m =>
          m.startsWith('<') ? m : m.replace(regex, '<mark style="background:#fef08a;padding:0 2px;border-radius:2px;font-weight:600">$1</mark>')
        )
      } catch(e) { return html }
    }
    function startTimer() {
      if (isReview || reviewSession || !isExam || state.timerInterval) return
      state.timerInterval = setInterval(() => {
        state.timerVal = Math.max(0, state.timerVal - 1)
        const el = document.getElementById('quiz-timer')
        if (el) { el.textContent = fmt(state.timerVal); el.style.color = state.timerVal < 300 ? '#ef4444' : '#0f172a' }
        if (state.timerVal === 0) { clearTimer(); showSummary() }
      }, 1000)
    }

    // ── Save ───────────────────────────────────────────────────────────────
    async function saveAnswers() {
      if (isReview || reviewSession) return
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const uid  = session.user.id
      const allQs  = organizedGroups.flatMap(g => g.questions)
      const correct = allQs.filter(q => state.answers[q.id] === q.correctIndex).length

      // Insert test record first → get its id
      const { data: testRecord, error: tErr } = await supabase
        .from('user_tests')
        .insert({ user_id: uid, test_id: testId, score: correct, total: totalQs, mode, parts: parts.join(','), completed_at: new Date().toISOString() })
        .select('id').single()
      if (tErr) console.error('[quiz] user_tests error:', tErr)

      // Insert per-answer rows linked to this session
      const rows = allQs
        .filter(q => state.answers[q.id] !== undefined)
        .map(q => ({
          user_id: uid, question_id: q.id, test_id: testId,
          user_test_id: testRecord?.id ?? null,
          selected_answer: 'ABCD'[state.answers[q.id]],
          is_correct: state.answers[q.id] === q.correctIndex, mode,
        }))
      if (rows.length) {
        const { error: aErr } = await supabase.from('user_answers').insert(rows)
        if (aErr) console.error('[quiz] user_answers error:', aErr)
      }
    }

    // ── Submit confirm modal ───────────────────────────────────────────────
    function showSubmitConfirm(onConfirm) {
      const overlay = document.createElement('div')
      overlay.id = 'quiz-submit-overlay'
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.5);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px'
      overlay.innerHTML = `
        <div style="background:white;border-radius:20px;padding:36px 28px;max-width:320px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.2)">
          <div style="font-size:44px;margin-bottom:14px">📋</div>
          <h3 style="font-size:18px;font-weight:700;color:#0f172a;margin:0 0 8px;font-family:'Space Grotesk',sans-serif">Nộp bài?</h3>
          <p style="font-size:14px;color:#64748b;margin:0 0 24px;line-height:1.6">Bạn chắc chắn muốn kết thúc và xem kết quả?</p>
          <div style="display:flex;gap:10px">
            <button id="quiz-cancel-btn" style="flex:1;padding:12px;border:1.5px solid #e2e8f0;border-radius:10px;background:white;cursor:pointer;font-size:14px;color:#374151;font-weight:500">Hủy</button>
            <button id="quiz-confirm-btn" style="flex:1;padding:12px;border:none;border-radius:10px;background:#2563eb;cursor:pointer;font-size:14px;font-weight:600;color:white">✓ Nộp bài</button>
          </div>
        </div>`
      document.body.appendChild(overlay)
      overlay.onclick = e => { if (e.target === overlay) overlay.remove() }
      document.getElementById('quiz-cancel-btn').onclick  = () => overlay.remove()
      document.getElementById('quiz-confirm-btn').onclick = () => { overlay.remove(); onConfirm() }
    }

    // ── Summary ────────────────────────────────────────────────────────────
    function showSummary() {
      clearTimer()
      saveAnswers()
      const allQs     = organizedGroups.flatMap(g => g.questions)
      const correct   = allQs.filter(q => state.answers[q.id] === q.correctIndex).length
      const pct       = Math.round((correct / totalQs) * 100)
      const wrongCount = allQs.filter(q => state.answers[q.id] !== undefined && state.answers[q.id] !== q.correctIndex).length

      app.innerHTML = `
        <div style="min-height:100vh;background:#f5f7fa;padding:40px 20px">
          <div style="max-width:680px;margin:auto">
            <div style="background:white;border-radius:20px;padding:40px;border:1px solid #e2e8f0;text-align:center">
              <div style="font-size:52px;margin-bottom:12px">${pct >= 70 ? '🎉' : '📚'}</div>
              <h2 style="font-size:24px;font-weight:700;color:#0f172a;margin:0 0 6px;font-family:'Space Grotesk',sans-serif">Kết quả bài thi</h2>
              <p style="margin:0 0 28px;font-size:14px;color:#64748b">Test ${test} • ${year} • ${isExam ? 'Thi thử' : 'Luyện tập'}</p>

              <div style="display:flex;gap:16px;justify-content:center;margin-bottom:28px;flex-wrap:wrap">
                <div style="background:#f8faff;border-radius:16px;padding:20px 32px">
                  <div style="font-size:36px;font-weight:700;color:#2563eb;font-family:'Space Grotesk',sans-serif">${correct}/${totalQs}</div>
                  <div style="font-size:13px;color:#64748b;margin-top:4px">câu đúng</div>
                </div>
                <div style="background:${pct>=70?'#f0fdf4':'#fef3c7'};border-radius:16px;padding:20px 32px">
                  <div style="font-size:36px;font-weight:700;color:${pct>=70?'#16a34a':'#d97706'};font-family:'Space Grotesk',sans-serif">${pct}%</div>
                  <div style="font-size:12px;color:#64748b;margin-top:4px">tỉ lệ đúng</div>
                </div>
              </div>

              <div style="background:#f8faff;border-radius:12px;padding:4px 0;text-align:left;max-height:320px;overflow-y:auto;margin-bottom:24px">
                ${allQs.map((q, i) => {
                  const ua = state.answers[q.id]
                  const ok = ua === q.correctIndex
                  return `
                    <div style="display:flex;align-items:center;gap:10px;padding:9px 16px;border-bottom:${i<allQs.length-1?'1px solid #f1f5f9':'none'}">
                      <span style="width:22px;height:22px;border-radius:50%;background:${ok?'#dcfce7':'#fee2e2'};color:${ok?'#16a34a':'#dc2626'};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0">${ok?'✓':'✗'}</span>
                      <span style="font-size:13px;color:#374151;flex:1">Câu ${q.question_number} — Part ${q.part}</span>
                      ${!ok?`<span style="font-size:12px;color:#94a3b8">Đúng: <strong style="color:#16a34a">${q.correct_answer}</strong>${ua!==undefined?` | Chọn: <strong style="color:#dc2626">${'ABCD'[ua]}</strong>`:' | Bỏ qua'}</span>`:''}
                    </div>`
                }).join('')}
              </div>

              <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
                <button onclick="navigate('/toeic-lr')" style="background:white;border:1px solid #e2e8f0;padding:12px 24px;border-radius:10px;cursor:pointer;font-size:14px">← Danh sách đề</button>
                ${!isReview ? `<button onclick="quizRestart()" style="background:#2563eb;color:white;border:none;padding:12px 24px;border-radius:10px;cursor:pointer;font-weight:600;font-size:14px">🔁 Làm lại</button>` : ''}
                ${!isReview ? `<button onclick="quizShowReview()" style="background:white;border:1.5px solid #2563eb;color:#2563eb;padding:12px 24px;border-radius:10px;cursor:pointer;font-weight:600;font-size:14px">📖 Xem lại bài thi</button>` : ''}
                ${!isExam && !isReview && wrongCount > 0 ? `<button onclick="navigate('/quiz?test_id=${testId}&year=${year}&test=${test}&parts=1,2,3,4,5,6,7&mode=retry')" style="background:#fee2e2;color:#dc2626;border:1px solid #fecaca;padding:12px 24px;border-radius:10px;cursor:pointer;font-weight:600;font-size:14px">✗ Làm lại ${wrongCount} câu sai</button>` : ''}
              </div>
            </div>
          </div>
        </div>`
    }

    // ── Render question card ───────────────────────────────────────────────
    function renderQuestion(q, qi, isLast) {
      const part       = q.part
      const audioOnly  = part <= 2       // Part 1, 2: không hiện text đáp án trước khi trả lời
      const answered   = state.answers[q.id]
      const isAnswered = isReview || answered !== undefined
      const showText   = !audioOnly || isAnswered  // Sau khi trả lời thì hiện text

      const examStyle = isExam && !reviewSession
      const opts = q.options.map((opt, i) => {
        let bg = 'white', border = '#e2e8f0', tc = '#374151'
        if (examStyle) {
          if (i === answered) { bg = '#eff6ff'; border = '#2563eb'; tc = '#1d4ed8' }
        } else if (isAnswered) {
          if (i === q.correctIndex)                { bg = '#f0fdf4'; border = '#16a34a'; tc = '#15803d' }
          else if (i === answered)                 { bg = '#fef2f2'; border = '#ef4444'; tc = '#dc2626' }
        }

        if (audioOnly && !isAnswered) {
          // Chỉ hiện chữ cái, bố cục ngang
          return `
            <div onclick="quizAnswer('${q.id}',${i})"
              style="display:flex;align-items:center;justify-content:center;width:56px;height:44px;border:2px solid ${border};border-radius:10px;cursor:pointer;background:${bg};transition:all .15s">
              <span style="font-size:15px;font-weight:700;color:${tc}">(${['A','B','C','D'][i]})</span>
            </div>`
        }

        return `
          <div onclick="quizAnswer('${q.id}',${i})"
            style="display:flex;align-items:center;gap:12px;padding:11px 14px;border:2px solid ${border};border-radius:10px;cursor:${isAnswered&&!examStyle?'default':'pointer'};background:${bg};transition:all .15s">
            <span style="width:28px;height:28px;border-radius:50%;border:2px solid ${border};background:${bg==='white'?'#f8faff':bg};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:${tc};flex-shrink:0">${['A','B','C','D'][i]}</span>
            <div style="flex:1;min-width:0">
              <div style="font-size:14px;color:${tc};line-height:1.5">${opt}</div>
              ${state.passageView==='bilingual'&&q.options_vi[i] ? `<div style="font-size:12px;color:${tc==='#15803d'?'#166534':tc==='#dc2626'?'#dc2626':'#3b82f6'};line-height:1.5;margin-top:2px;font-style:italic">${q.options_vi[i]}</div>` : ''}
            </div>
            ${!examStyle&&isAnswered&&i===q.correctIndex?'<span style="color:#16a34a;font-size:13px">✓</span>':''}
            ${!examStyle&&isAnswered&&i===answered&&i!==q.correctIndex?'<span style="color:#ef4444;font-size:13px">✗</span>':''}
          </div>`
      }).join('')

      // Badge đúng/sai
      const badge = (!examStyle && isAnswered)
        ? answered === undefined
          ? `<span style="font-size:12px;font-weight:600;color:#64748b;background:#f1f5f9;padding:2px 10px;border-radius:20px">⊙ Bỏ qua</span>`
          : answered === q.correctIndex
            ? `<span style="font-size:12px;font-weight:600;color:#16a34a;background:#dcfce7;padding:2px 10px;border-radius:20px">⊙ Đúng</span>`
            : `<span style="font-size:12px;font-weight:600;color:#dc2626;background:#fee2e2;padding:2px 10px;border-radius:20px">⊙ Sai</span>`
        : ''

      // Panel giải thích (practice / review)
      let explain = ''
      if (!examStyle && isAnswered) {
        const hasVI = q.question_vi || q.options_vi.some(Boolean)
        if (hasVI) {
          explain += `
            <div style="margin-top:12px;background:#eff6ff;border-radius:12px;padding:14px;border:1px solid #bfdbfe">
              <div style="display:flex;align-items:center;gap:6px;font-size:13px;font-weight:700;color:#1d4ed8;margin-bottom:10px">
                📖 Dịch nghĩa câu hỏi
              </div>
              ${q.question_vi ? `<p style="margin:0 0 10px;font-size:13px;color:#1e3a8a;font-weight:500;line-height:1.6">${q.question_vi}</p>` : ''}
              <div style="display:flex;flex-direction:column;gap:4px">
                ${q.options.map((_, i) => {
                  const isCorr = i === q.correctIndex
                  const isWrong = i === answered && !isCorr
                  return `<div style="padding:8px 12px;border-radius:8px;font-size:13px;line-height:1.5;
                    background:${isCorr?'#dcfce7':isWrong?'#fee2e2':'transparent'};
                    color:${isCorr?'#15803d':isWrong?'#dc2626':'#475569'};
                    font-weight:${isCorr||isWrong?600:400}">
                    <strong>(${['A','B','C','D'][i]})</strong> ${q.options_vi[i]||q.options[i]}
                  </div>`
                }).join('')}
              </div>
            </div>`
        }
        if (q.explanation) {
          explain += `
            <div style="margin-top:8px;background:#fdf4ff;border-radius:12px;padding:14px;border:1px solid #e9d5ff">
              <div style="display:flex;align-items:center;gap:6px;font-size:13px;font-weight:700;color:#7c3aed;margin-bottom:8px">
                ✦ Giải thích (Câu ${q.question_number})
              </div>
              <div style="font-size:13px;color:#374151;line-height:1.7">${q.explanation}</div>
            </div>`
        }
        if (q.vocab.length) {
          explain += `
            <div style="margin-top:8px;background:#fefce8;border-radius:12px;padding:14px;border:1px solid #fde68a">
              <div style="display:flex;align-items:center;gap:6px;font-size:13px;font-weight:700;color:#92400e;margin-bottom:10px">
                📖 Từ vựng nên học (Câu ${q.question_number})
              </div>
              <div style="display:flex;flex-wrap:wrap;gap:8px">
                ${q.vocab.map(v => `
                  <div style="background:white;border:1px solid #fde68a;border-radius:8px;padding:6px 12px;font-size:12px;display:flex;gap:5px;align-items:center">
                    <strong style="color:#92400e">${escapeHtml(v.word)}</strong>
                    <span style="color:#64748b">${escapeHtml(v.meaning)}</span>
                  </div>`).join('')}
              </div>
            </div>`
        }
      }

      return `
        <div style="padding-bottom:${!isLast?'24px;border-bottom:1px solid #f1f5f9':0}">
          <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:12px;flex-wrap:wrap">
            ${badge}
            <div style="flex:1;min-width:0">
              <div style="font-size:15px;font-weight:600;color:#0f172a;line-height:1.5">${q.question_number}.${audioOnly&&!isAnswered?'':' '+q.question}</div>
              ${state.passageView==='bilingual'&&q.question_vi ? `<div style="font-size:13px;color:#1d4ed8;line-height:1.6;margin-top:4px;font-style:italic">${q.question_vi}</div>` : ''}
            </div>
          </div>
          <div style="${audioOnly&&!isAnswered?'display:flex;gap:10px;flex-wrap:wrap':'display:flex;flex-direction:column;gap:8px'}">
            ${opts}
          </div>
          ${explain}
        </div>`
    }

    // ── Main render ────────────────────────────────────────────────────────
    function render() {
      const g        = organizedGroups[state.groupIdx]
      const part     = g.part
      const qs       = g.questions
      const isLast   = state.groupIdx === totalGroups - 1
      const doneCount = Object.keys(state.answers).length
      const examStyle  = isExam && !reviewSession
      const groupDone  = isReview || reviewSession || qs.every(q => state.answers[q.id] !== undefined)

      const qNums   = qs.map(q => q.question_number)
      const qMin    = Math.min(...qNums)
      const qMax    = Math.max(...qNums)
      const qRange  = qs.length > 1 ? `${qMin}–${qMax}` : `${qMin}`

      // ── Left panel ────────────────────────────────────────────────────────
      let leftHTML = `
        <p style="font-size:13px;color:#2563eb;font-weight:500;margin:0 0 16px;line-height:1.6">${INSTRUCTIONS[part] || ''}</p>

        ${g.audio_url ? `
          <div style="background:white;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;margin-bottom:14px">
            <audio controls controlsList="nodownload noplaybackrate" style="width:100%;display:block" preload="metadata"
              src="${g.audio_url}"
              onerror="this.parentElement.innerHTML='<div style=\\'padding:12px 16px;font-size:13px;color:#ef4444\\'>⚠️ Không tải được audio: ${g.audio_url}</div>'">
            </audio>
          </div>` : ''}

        ${g.image_url ? `
          <div style="border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;margin-bottom:14px;aspect-ratio:4/3;background:#f1f5f9">
            <img src="${g.image_url}" style="width:100%;height:100%;object-fit:contain;display:block" referrerpolicy="no-referrer">
          </div>` : ''}

        ${part > 4 && g.passage_a ? `
          <div style="background:#f8fafc;border-radius:12px;padding:16px;border:1px solid #e2e8f0;max-height:calc(100vh - 280px);overflow-y:auto">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;gap:8px;flex-wrap:wrap">
              <div style="font-size:11px;color:#94a3b8;font-weight:700;letter-spacing:.8px">BÀI ĐỌC</div>
              ${!examStyle && (g.passage_a_vi||g.passage_b_vi||g.passage_c_vi) ? `
                <div style="display:flex;gap:2px;background:#f1f5f9;padding:3px;border-radius:9px">
                  ${[['en','EN'],['bilingual','🌐 Song ngữ'],['vi','VI']].map(([v,lbl])=>`
                    <button onclick="quizSetPassageViewGated('${v}')"
                      style="padding:5px 11px;border:none;border-radius:6px;cursor:pointer;font-size:11px;font-weight:${state.passageView===v?700:500};background:${state.passageView===v?'white':'transparent'};color:${state.passageView===v?'#0f172a':'#64748b'};box-shadow:${state.passageView===v?'0 1px 2px rgba(0,0,0,.1)':'none'};transition:all .15s;position:relative">
                      ${lbl}${v==='bilingual'?'<span style="position:absolute;top:-5px;right:-4px;font-size:9px;background:#f59e0b;color:white;border-radius:4px;padding:0 3px;font-weight:700;line-height:14px">PRO</span>':''}
                    </button>`).join('')}
                </div>` : ''}
            </div>
            ${[['passage_a','passage_a_vi'],['passage_b','passage_b_vi'],['passage_c','passage_c_vi']].filter(([k])=>g[k]).map(([eK,vK],idx)=>{
              const en = g[eK], vi = g[vK]
              const view = state.passageView || 'en'
              const isHTML = en.trimStart().startsWith('<')
              let body
              if (view === 'vi' && vi && !isHTML) {
                body = `<div style="white-space:pre-wrap">${escapeHtml(vi)}</div>`
              } else if (view === 'bilingual' && vi && !isHTML) {
                const enAll = en.split('\n').map(s => s.trim()).filter(Boolean)
                const viAll = vi.split('\n').map(s => s.trim())
                const pairs = enAll.map((eL, i) => ({ en: eL, vi: viAll[i] || '' }))
                const isChatSpk = s => /^[A-Z][\w\s,\.]*[\(\[]\d{1,2}:\d{2}/.test(s)
                const hasChatTurns = pairs.some(p => isChatSpk(p.en))
                const viCard = (vL) => vL && !isSpeakerLine(vL) ? `<div style="padding:8px 14px;background:#eff6ff;border-top:1px solid #dde8fa;display:flex;gap:8px;align-items:flex-start"><span style="flex-shrink:0;margin-top:2px;font-size:10px;font-weight:700;letter-spacing:.4px;color:#1d4ed8;background:#dbeafe;border-radius:4px;padding:1px 6px;line-height:16px">VI</span><div style="font-size:13px;color:#1d4ed8;line-height:1.7">${escapeHtml(vL)}</div></div>` : ''
                const wrap = (inner) => `<div style="border-radius:10px;overflow:hidden;margin-bottom:8px;border:1px solid #dde8fa;box-shadow:0 1px 3px rgba(37,99,235,.06)">${inner}</div>`
                let html = ''
                if (hasChatTurns) {
                  let ci = 0
                  while (ci < pairs.length) {
                    if (isChatSpk(pairs[ci].en)) {
                      const spk = pairs[ci].en
                      const msgs = []
                      let cj = ci + 1
                      while (cj < pairs.length && !isSpeakerLine(pairs[cj].en)) { msgs.push(pairs[cj]); cj++ }
                      ci = cj
                      const enH = msgs.map(p => groupDone ? highlightText(p.en, g.highlights) : escapeHtml(p.en)).join('<br>')
                      const viH = msgs.map(p => p.vi).filter(v => v && !isSpeakerLine(v)).join(' ')
                      html += wrap(`<div style="padding:5px 14px 4px;background:#f1f5f9;border-bottom:1px solid #e2e8f0;font-size:11px;font-weight:700;color:#475569">${escapeHtml(spk)}</div>${enH ? `<div style="padding:10px 14px;background:white;font-size:13px;color:#1e293b;line-height:1.75">${enH}</div>` : ''}${viH ? `<div style="padding:8px 14px;background:#eff6ff;border-top:1px solid #dde8fa;display:flex;gap:8px;align-items:flex-start"><span style="flex-shrink:0;margin-top:2px;font-size:10px;font-weight:700;letter-spacing:.4px;color:#1d4ed8;background:#dbeafe;border-radius:4px;padding:1px 6px;line-height:16px">VI</span><div style="font-size:13px;color:#1d4ed8;line-height:1.7">${escapeHtml(viH)}</div></div>` : ''}`)
                    } else {
                      const { en: eL, vi: vL } = pairs[ci++]
                      html += wrap(`<div style="padding:10px 14px;background:white;font-size:13px;color:#1e293b;line-height:1.75">${groupDone ? highlightText(eL, g.highlights) : escapeHtml(eL)}</div>${viCard(vL)}`)
                    }
                  }
                } else {
                  for (const { en: eL, vi: vL } of pairs) {
                    html += wrap(`<div style="padding:10px 14px;background:white;font-size:13px;color:#1e293b;line-height:1.75">${groupDone ? highlightText(eL, g.highlights) : escapeHtml(eL)}</div>${viCard(vL)}`)
                  }
                }
                body = html
              } else {
                body = groupDone ? highlightInHTML(autoRenderPassage(en), g.highlights) : autoRenderPassage(en)
              }
              return `${idx > 0 ? '<div style="margin:14px 0;height:1px;background:#e2e8f0"></div>' : ''}${body}`
            }).join('')}

            ${(g.passage_a_vi || g.passage_b_vi || g.passage_c_vi) && state.passageView === 'en' ? `
              <div style="border-top:1px solid #f1f5f9;margin-top:12px;padding-top:4px">
                <button onclick="quizTogglePassageVI()"
                  style="display:flex;align-items:center;gap:6px;padding:8px 10px;background:none;border:none;cursor:pointer;color:#2563eb;font-size:12px;font-weight:600;border-radius:8px;width:100%;text-align:left">
                  🇻🇳 Dịch nghĩa đoạn văn
                  <span style="margin-left:auto;color:#94a3b8;font-size:11px">${state.showPassageVI ? '▲' : '▼'}</span>
                </button>
                ${state.showPassageVI ? `
                  <div style="padding:12px 4px 4px;display:flex;flex-direction:column;gap:10px">
                    ${[['passage_a','passage_a_vi'],['passage_b','passage_b_vi'],['passage_c','passage_c_vi']].filter(([,vK])=>g[vK]).map(([,vK],idx)=>`
                      ${idx > 0 ? '<hr style="border:none;border-top:1px solid #e0eaff;margin:0">' : ''}
                      <div style="font-size:13px;color:#1e3a8a;line-height:1.9;white-space:pre-wrap;background:#eff6ff;border-radius:10px;padding:12px 14px;border:1px solid #dbeafe">${escapeHtml(g[vK])}</div>`).join('')}
                  </div>` : ''}
              </div>` : ''}
          </div>` : ''}

        ${part <= 4 && !examStyle && groupDone ? qs.filter(q => q.question_vi || q.options_vi.some(Boolean)).map(q => {
          const ans = state.answers[q.id]
          return `
            <div style="background:#eff6ff;border-radius:12px;padding:14px;border:1px solid #bfdbfe;margin-top:10px">
              <div style="font-size:12px;font-weight:700;color:#1d4ed8;margin-bottom:8px">📖 Dịch nghĩa${qs.length > 1 ? ` — Câu ${q.question_number}` : ''}</div>
              ${q.question_vi ? `<p style="font-size:13px;color:#1e3a8a;margin:0 0 8px;font-weight:500;line-height:1.5">${q.question_vi}</p>` : ''}
              <div style="display:flex;flex-direction:column;gap:3px">
                ${q.options.map((_, i) => {
                  const isCorr  = i === q.correctIndex
                  const isWrong = ans !== undefined && i === ans && !isCorr
                  return `<div style="font-size:12px;padding:5px 10px;border-radius:7px;
                    background:${isCorr?'#dcfce7':isWrong?'#fee2e2':'transparent'};
                    color:${isCorr?'#15803d':isWrong?'#dc2626':'#475569'};
                    font-weight:${isCorr||isWrong?600:400}">
                    (${['A','B','C','D'][i]}) ${escapeHtml(q.options_vi[i]||q.options[i])}
                  </div>`
                }).join('')}
              </div>
            </div>`
        }).join('') : ''}

        ${part <= 4 && !examStyle && g.passage_a ? (
          !groupDone
            ? `<div style="background:#fef9ec;border-radius:10px;padding:12px 16px;border:1px solid #fde68a;font-size:13px;color:#92400e">
                💡 Nghe audio và chọn đáp án. Script xuất hiện sau khi hoàn thành nhóm câu.
               </div>`
            : `<div style="background:white;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden">
                <button onclick="quizToggleScript()" style="width:100%;padding:12px 16px;background:none;border:none;cursor:pointer;display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:#2563eb;text-align:left">
                  <span>${state.showScript?'📖':'📄'}</span>
                  ${state.showScript?'Ẩn script':'Xem script & Dịch nghĩa'}
                  <span style="margin-left:auto;color:#94a3b8;font-size:11px">${state.showScript?'▲':'▼'}</span>
                </button>
                ${state.showScript ? `
                  <div style="padding:0 16px 16px;border-top:1px solid #f1f5f9;max-height:340px;overflow-y:auto">
                    <div style="font-size:11px;color:#94a3b8;font-weight:700;letter-spacing:.8px;margin:14px 0 8px">SCRIPT</div>
                    <div style="font-size:13px;color:#1e293b;line-height:1.9;white-space:pre-wrap">${highlightText(g.passage_a, g.highlights)}</div>
                    ${g.passage_a_vi?`
                      <div style="font-size:11px;color:#94a3b8;font-weight:700;letter-spacing:.8px;margin:14px 0 8px">DỊCH NGHĨA</div>
                      <div style="font-size:13px;color:#64748b;line-height:1.8;white-space:pre-wrap">${escapeHtml(g.passage_a_vi)}</div>
                    `:''}
                  </div>` : ''}
              </div>`
        ) : ''}
      `

      // ── Right panel ───────────────────────────────────────────────────────
      const rightHTML = `
        ${!examStyle && state.groupIdx > 0 ? `
          <button onclick="quizPrevGroup()"
            style="width:100%;margin-bottom:12px;background:white;color:#374151;border:1.5px solid #e2e8f0;padding:11px 14px;border-radius:12px;cursor:pointer;font-weight:500;font-size:14px;text-align:left">
            ← Nhóm câu trước
          </button>` : ''}
        <div style="background:white;border-radius:14px;border:1px solid #e2e8f0;overflow:hidden">
          <div style="padding:14px 20px;background:#f8faff;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;gap:10px">
            <span style="font-size:14px;font-weight:700;color:#0f172a">Question</span>
            ${qs.length > 1 ? `<span style="font-size:12px;color:#64748b;background:white;border:1px solid #e2e8f0;padding:3px 12px;border-radius:20px">Nhóm câu ${qRange} (${qs.length} câu hỏi)</span>` : ''}
          </div>
          <div style="padding:20px;display:flex;flex-direction:column;gap:24px">
            ${qs.map((q, i) => renderQuestion(q, i, i === qs.length - 1)).join('')}
          </div>
        </div>

        ${groupDone ? `
          <button onclick="quizNextGroup()"
            style="width:100%;margin-top:14px;background:#2563eb;color:white;border:none;padding:14px;border-radius:12px;cursor:pointer;font-weight:600;font-size:15px;box-shadow:0 4px 12px rgba(37,99,235,.25)">
            ${isLast && (reviewSession || isReview) ? '← Thoát' : isLast ? '📊 Xem kết quả' : 'Nhóm câu tiếp theo →'}
          </button>` : ''}
      `

      // ── Full page ─────────────────────────────────────────────────────────
      app.innerHTML = `
        <div style="min-height:100vh;background:#f5f7fa;display:flex;flex-direction:column">

          <!-- Top bar -->
          <div style="background:white;border-bottom:1px solid #e2e8f0;height:56px;padding:0 24px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:30;flex-shrink:0">
            <button onclick="quizBack()" style="background:none;border:none;cursor:pointer;color:#64748b;font-size:14px;padding:0">← Thoát</button>
            <div style="display:flex;align-items:center;gap:14px">
              ${examStyle?`<span id="quiz-timer" style="font-size:18px;font-weight:700;font-family:'Space Grotesk',sans-serif;color:#0f172a">${fmt(state.timerVal)}</span>`:''}
              <span style="font-size:12px;font-weight:500;color:#64748b;background:#f1f5f9;padding:4px 12px;border-radius:20px">${isReview||reviewSession?'👁 Xem lại':examStyle?'📄 Thi thử':isRetry?'🔁 Làm lại câu sai':'🎯 Luyện tập'} • Part ${part}</span>
            </div>
            <div style="text-align:right">
              <div style="font-size:13px;font-weight:600;color:#0f172a">Nhóm ${state.groupIdx+1}/${totalGroups}</div>
              <div style="font-size:11px;color:#94a3b8">${doneCount}/${totalQs} câu</div>
            </div>
          </div>

          <!-- Progress bar -->
          <div style="height:3px;background:#e2e8f0;flex-shrink:0">
            <div style="height:100%;background:#2563eb;width:${(doneCount/totalQs)*100}%;transition:width .4s"></div>
          </div>

          <!-- Content: 2 columns -->
          <div style="flex:1;display:grid;grid-template-columns:1fr 1fr;min-height:calc(100vh - 59px)">

            <!-- Left: sticky -->
            <div style="border-right:1px solid #e2e8f0;background:#f8faff;padding:24px;overflow-y:auto;max-height:calc(100vh - 59px);position:sticky;top:59px;align-self:start">
              ${leftHTML}
            </div>

            <!-- Right: scrollable -->
            <div style="padding:24px;overflow-y:auto">
              ${rightHTML}
            </div>

          </div>
        </div>`

      if (examStyle && !state.timerInterval) startTimer()
    }

    // ── Event handlers ─────────────────────────────────────────────────────
    window.quizAnswer = (qId, i) => {
      if (isReview || reviewSession || state.answers[qId] !== undefined) return
      state.answers[qId] = i
      render()
    }

    window.quizShowReview = () => {
      reviewSession = true
      clearTimer()
      state.groupIdx = 0
      state.showScript = false
      state.passageView = 'en'; state.showPassageVI = false
      render()
    }

    window.quizNextGroup = () => {
      if (state.groupIdx >= totalGroups - 1) {
        if (reviewSession || isReview) { history.back(); return }
        showSubmitConfirm(() => showSummary())
      } else {
        state.groupIdx++
        state.showScript = false
        state.passageView = 'en'; state.showPassageVI = false
        window.scrollTo(0, 0)
        render()
      }
    }

    window.quizPrevGroup = () => {
      if (state.groupIdx > 0) {
        state.groupIdx--
        state.showScript = false
        state.passageView = 'en'; state.showPassageVI = false
        window.scrollTo(0, 0)
        render()
      }
    }

    window.quizToggleScript       = () => { state.showScript = !state.showScript; render() }
    window.quizTogglePassageVI    = () => { state.showPassageVI = !state.showPassageVI; render() }
    window.quizSetPassageView     = view => { state.passageView = view; render() }
    window.quizSetPassageViewGated = view => {
      if (view !== 'bilingual') { state.passageView = view; render(); return }
      requirePro(() => { state.passageView = view; render() })
    }
    window.quizBack         = () => { clearTimer(); history.back() }
    window.quizRestart      = () => {
      clearTimer()
      state = { groupIdx: 0, answers: {}, showScript: false, passageView: 'en', timerVal: EXAM_SECONDS, timerInterval: null }
      render()
    }

    render()
  }
}
