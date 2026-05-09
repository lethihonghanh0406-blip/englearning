export default function toeicWriting(app) {

  const parts = [
    {
      id: 1, label: 'Part 1 – Write a Sentence', desc: 'Viết 1 câu có nghĩa sử dụng cả 2 từ gợi ý', time: 90,
      tasks: [
        { scene: '🖼️ Ảnh: Một người phụ nữ đang ngồi trước máy tính trong văn phòng hiện đại.', words: ['report', 'complete'], example: 'The woman is completing the report at her desk.' },
        { scene: '🖼️ Ảnh: Hai người đàn ông đang bắt tay trong một buổi gặp gỡ kinh doanh.', words: ['agreement', 'sign'], example: 'The businessmen sign an agreement after a productive meeting.' },
        { scene: '🖼️ Ảnh: Một nhóm người đang ngồi xung quanh bàn hội nghị.', words: ['discuss', 'project'], example: 'The team gathers to discuss their new project in the conference room.' },
        { scene: '🖼️ Ảnh: Một người đàn ông đang đứng trước màn hình chiếu.', words: ['presentation', 'deliver'], example: 'The manager delivers a presentation on the company\'s quarterly results.' },
        { scene: '🖼️ Ảnh: Các nhân viên đang ăn trưa tại căng-tin công ty.', words: ['lunch', 'colleagues'], example: 'The employees enjoy lunch with their colleagues in the company cafeteria.' },
      ]
    },
    {
      id: 2, label: 'Part 2 – Respond to a Written Request', desc: 'Viết email phản hồi chuyên nghiệp (100–150 từ)', time: 600,
      tasks: [
        {
          prompt: `From: sarah.johnson@globaltech.com\nSubject: Request for Product Catalog\n\nDear Sales Team,\n\nI am Sarah Johnson, Purchasing Manager at Global Tech Solutions. We are interested in your range of ergonomic office furniture and would like to request your latest product catalog along with current pricing. We are planning a major office renovation next quarter and are evaluating several suppliers.\n\nThank you for your time.\n\nBest regards,\nSarah Johnson`,
          instruction: '✏️ Viết email phản hồi: xác nhận sẽ gửi catalog, cảm ơn sự quan tâm, đề nghị hỗ trợ thêm nếu cần.'
        },
        {
          prompt: `From: m.lee@coastalhotels.com\nSubject: Conference Room Booking Inquiry\n\nDear Sir/Madam,\n\nI am writing to inquire about booking your conference facility for a 2-day business seminar on March 20–21. We expect approximately 40 attendees. Could you provide information about room capacity, available equipment, and catering options?\n\nBest regards,\nMichael Lee\nEvent Coordinator, Coastal Hotels Group`,
          instruction: '✏️ Viết email phản hồi: xác nhận phòng hội nghị có sẵn, mô tả sơ lược thiết bị và dịch vụ, đề nghị liên lạc thêm.'
        },
      ]
    },
    {
      id: 3, label: 'Part 3 – Write an Opinion Essay', desc: 'Viết bài luận ý kiến (mục tiêu: 300+ từ)', time: 1800,
      tasks: [
        {
          topic: '"Companies should require all employees to work from the office rather than allowing remote work."',
          instruction: 'Bạn đồng ý hay không đồng ý? Viết bài luận thể hiện quan điểm, có lý lẽ và ví dụ cụ thể.'
        }
      ]
    },
  ]

  let state = {
    partIdx: 0, taskIdx: 0, phase: 'task',
    timerVal: 0, timerInterval: null, texts: {},
  }

  function textKey() { return `${state.partIdx}_${state.taskIdx}` }

  function clearTimer() {
    if (state.timerInterval) { clearInterval(state.timerInterval); state.timerInterval = null }
  }

  function fmt(sec) {
    return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
  }

  function wordCount(text) {
    return text.trim() === '' ? 0 : text.trim().split(/\s+/).length
  }

  function updateLive() {
    const ta = document.getElementById('write-area')
    const timerEl = document.getElementById('write-timer')
    const countEl = document.getElementById('write-count')
    if (ta) state.texts[textKey()] = ta.value
    if (timerEl) {
      timerEl.textContent = fmt(state.timerVal)
      timerEl.style.color = state.timerVal < 30 ? '#ef4444' : '#0f172a'
    }
    if (countEl && ta) countEl.textContent = wordCount(ta.value)
  }

  function startTimer() {
    clearTimer()
    state.timerVal = parts[state.partIdx].time
    state.timerInterval = setInterval(() => {
      state.timerVal = Math.max(0, state.timerVal - 1)
      updateLive()
    }, 1000)
  }

  function render() {
    const part = parts[state.partIdx]
    const task = part.tasks[state.taskIdx]
    const currentText = state.texts[textKey()] || ''
    const wc = wordCount(currentText)
    const isLast = state.taskIdx === part.tasks.length - 1

    if (state.phase === 'submitted') {
      const timeUsed = part.time - state.timerVal
      clearTimer()
      app.innerHTML = `
        <div style="min-height:100vh;background:#f8faff">
          <div style="max-width:760px;margin:auto;padding:40px 24px">

            <button onclick="writeBack()" style="background:none;border:none;cursor:pointer;color:#64748b;font-size:14px;margin-bottom:24px;padding:0">← TOEIC Hub</button>

            <div style="background:white;border-radius:20px;padding:32px;border:1px solid #e2e8f0;margin-bottom:20px">
              <h3 style="font-family:'Space Grotesk',sans-serif;margin:0 0 20px;font-size:20px;color:#0f172a">✅ Đã nộp bài</h3>
              <div style="display:flex;gap:16px;margin-bottom:20px;flex-wrap:wrap">
                <div style="background:#f8faff;border-radius:12px;padding:16px 22px;text-align:center;min-width:90px">
                  <div style="font-size:28px;font-weight:700;color:#2563eb;font-family:'Space Grotesk',sans-serif">${wc}</div>
                  <div style="font-size:12px;color:#64748b;margin-top:4px">từ đã viết</div>
                </div>
                <div style="background:#f8faff;border-radius:12px;padding:16px 22px;text-align:center;min-width:90px">
                  <div style="font-size:28px;font-weight:700;color:#7c3aed;font-family:'Space Grotesk',sans-serif">${fmt(timeUsed)}</div>
                  <div style="font-size:12px;color:#64748b;margin-top:4px">thời gian dùng</div>
                </div>
                ${part.id === 3 ? `
                  <div style="background:${wc >= 300 ? '#f0fdf4' : '#fef3c7'};border-radius:12px;padding:16px 22px;text-align:center;min-width:90px">
                    <div style="font-size:28px;font-weight:700;color:${wc >= 300 ? '#16a34a' : '#d97706'};font-family:'Space Grotesk',sans-serif">${wc >= 300 ? '✓' : '!'}</div>
                    <div style="font-size:12px;color:#64748b;margin-top:4px">${wc >= 300 ? 'Đạt 300+ từ' : 'Chưa đủ 300 từ'}</div>
                  </div>` : ''}
              </div>
              <div style="background:#f8faff;border-radius:12px;padding:16px;font-size:14px;color:#374151;line-height:1.7;white-space:pre-wrap;border:1px solid #e2e8f0;max-height:300px;overflow-y:auto">${currentText || '(Không có nội dung)'}</div>
            </div>

            <div style="display:flex;gap:12px;flex-wrap:wrap">
              <button onclick="writeRedo()" style="background:white;border:1px solid #e2e8f0;padding:12px 20px;border-radius:10px;cursor:pointer">🔁 Viết lại</button>
              ${isLast
                ? `<button onclick="navigate('/toeic')" style="background:#16a34a;color:white;border:none;padding:12px 20px;border-radius:10px;cursor:pointer;font-weight:600">Hoàn thành ✓</button>`
                : `<button onclick="writeNext()" style="background:#2563eb;color:white;border:none;padding:12px 20px;border-radius:10px;cursor:pointer;font-weight:600">Bài tiếp →</button>`
              }
            </div>

          </div>
        </div>
      `
      return
    }

    let taskHTML = ''
    if (part.id === 1) {
      taskHTML = `
        <div style="background:#f8faff;border-radius:14px;padding:20px;border:1px solid #e2e8f0;margin-bottom:14px">
          <p style="font-size:14px;color:#374151;margin:0 0 12px">${task.scene}</p>
          <p style="font-size:13px;color:#64748b;margin:0">✏️ Viết 1 câu sử dụng cả 2 từ: <strong style="color:#2563eb">"${task.words[0]}"</strong> và <strong style="color:#2563eb">"${task.words[1]}"</strong></p>
        </div>
        <div style="background:#f0fdf4;border-radius:10px;padding:12px 16px;border:1px solid #bbf7d0;margin-bottom:14px;font-size:13px;color:#166534">
          💡 Ví dụ: <em>${task.example}</em>
        </div>`
    } else if (part.id === 2) {
      taskHTML = `
        <div style="background:#f8faff;border-radius:14px;padding:20px;border:1px solid #e2e8f0;margin-bottom:14px">
          <pre style="font-size:13px;color:#374151;white-space:pre-wrap;margin:0;line-height:1.7;font-family:'Inter',sans-serif">${task.prompt}</pre>
        </div>
        <div style="background:#dbeafe;border-radius:10px;padding:12px 16px;border:1px solid #bfdbfe;margin-bottom:14px;font-size:13px;color:#1e40af">${task.instruction}</div>`
    } else if (part.id === 3) {
      taskHTML = `
        <div style="background:#f8faff;border-radius:14px;padding:24px;border:1px solid #e2e8f0;margin-bottom:14px">
          <p style="font-size:16px;font-weight:500;color:#0f172a;margin:0 0 12px;line-height:1.5">${task.topic}</p>
          <p style="font-size:13px;color:#64748b;margin:0">${task.instruction}</p>
        </div>`
    }

    app.innerHTML = `
      <div style="min-height:100vh;background:#f8faff">
        <div style="max-width:760px;margin:auto;padding:40px 24px">

          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">
            <button onclick="writeBack()" style="background:none;border:none;cursor:pointer;color:#64748b;font-size:14px;padding:0">← TOEIC Hub</button>
            <span style="font-size:13px;color:#64748b">Bài ${state.taskIdx + 1} / ${part.tasks.length}</span>
          </div>

          <div style="display:flex;gap:8px;margin-bottom:24px;flex-wrap:wrap">
            ${parts.map((p, i) => `
              <button onclick="writePart(${i})"
                style="padding:8px 16px;border-radius:20px;border:1px solid ${state.partIdx === i ? '#9d174d' : '#e2e8f0'};background:${state.partIdx === i ? '#fce7f3' : 'white'};color:${state.partIdx === i ? '#9d174d' : '#475569'};cursor:pointer;font-size:13px;font-weight:${state.partIdx === i ? 600 : 400}">
                Part ${p.id}
              </button>
            `).join('')}
          </div>

          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:20px;flex-wrap:wrap">
            <div>
              <h2 style="font-size:20px;font-family:'Space Grotesk',sans-serif;margin:0 0 4px;color:#0f172a">${part.label}</h2>
              <p style="font-size:13px;color:#64748b;margin:0">${part.desc}</p>
            </div>
            <div style="text-align:right;flex-shrink:0">
              <div id="write-timer" style="font-size:26px;font-weight:700;font-family:'Space Grotesk',sans-serif;color:#0f172a">${fmt(part.time)}</div>
              <div style="font-size:11px;color:#64748b">còn lại</div>
            </div>
          </div>

          ${taskHTML}

          <textarea
            id="write-area"
            oninput="writeInput()"
            placeholder="Viết câu trả lời của bạn ở đây..."
            style="width:100%;min-height:${part.id === 3 ? '280' : '120'}px;border:2px solid #e2e8f0;border-radius:12px;padding:16px;font-size:14px;font-family:'Inter',sans-serif;resize:vertical;outline:none;line-height:1.6;box-sizing:border-box;transition:border-color .2s"
            onfocus="this.style.borderColor='#2563eb'"
            onblur="this.style.borderColor='#e2e8f0'"
          >${currentText}</textarea>

          <div style="display:flex;align-items:center;justify-content:space-between;margin-top:12px">
            <span style="font-size:13px;color:#64748b">
              <span id="write-count">${wc}</span> từ${part.id === 3 ? ' <span style="color:#d97706">(mục tiêu: 300+)</span>' : ''}
            </span>
            <button onclick="writeSubmit()" style="background:#9d174d;color:white;border:none;padding:11px 22px;border-radius:10px;cursor:pointer;font-weight:600">Nộp bài →</button>
          </div>

        </div>
      </div>
    `

    if (!state.timerInterval) startTimer()
    setTimeout(() => document.getElementById('write-area')?.focus(), 50)
  }

  window.writePart   = i  => { clearTimer(); state = { partIdx: i, taskIdx: 0, phase: 'task', timerVal: 0, timerInterval: null, texts: {} }; render() }
  window.writeInput  = () => updateLive()
  window.writeSubmit = () => {
    const ta = document.getElementById('write-area')
    if (ta) state.texts[textKey()] = ta.value
    clearTimer()
    state.phase = 'submitted'
    render()
  }
  window.writeRedo   = () => { state.phase = 'task'; state.timerInterval = null; render() }
  window.writeNext   = () => { state.taskIdx++; state.phase = 'task'; state.timerInterval = null; render() }
  window.writeBack   = () => { clearTimer(); navigate('/toeic') }

  render()
}
