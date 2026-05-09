import { requireAuth } from '../utils/auth.js'

export default function testPage(app, params) {
  const year    = params.get("year")
  const test    = params.get("test")
  const testId  = params.get("test_id")
  const initTab = params.get("tab") || 'exam'

  const PARTS = [
    { id:1, label:'Part 1', group:'LISTENING', count:6  },
    { id:2, label:'Part 2', group:'LISTENING', count:25 },
    { id:3, label:'Part 3', group:'LISTENING', count:39 },
    { id:4, label:'Part 4', group:'LISTENING', count:30 },
    { id:5, label:'Part 5', group:'READING',   count:30 },
    { id:6, label:'Part 6', group:'READING',   count:16 },
    { id:7, label:'Part 7', group:'READING',   count:54 },
  ]

  let state = {
    tab: initTab,
    selected: new Set([1,2,3,4,5,6,7]),
    examCard: 'full',
  }

  const totalQ   = () => [...state.selected].reduce((s,id) => s + (PARTS.find(p=>p.id===id)?.count||0), 0)
  const allChosen = () => state.selected.size === PARTS.length

  function indicator(on, radio) {
    if (radio) return `<div style="width:18px;height:18px;border-radius:50%;border:2px solid ${on?'#2563eb':'#d1d5db'};background:${on?'#2563eb':'white'};flex-shrink:0;display:flex;align-items:center;justify-content:center">${on?'<div style="width:7px;height:7px;border-radius:50%;background:white"></div>':''}</div>`
    return `<div style="width:20px;height:20px;border-radius:50%;border:2px solid ${on?'#2563eb':'#d1d5db'};background:${on?'#2563eb':'white'};flex-shrink:0;display:flex;align-items:center;justify-content:center">${on?'<span style="color:white;font-size:11px;font-weight:700;line-height:1">✓</span>':''}</div>`
  }

  function partItem(p, radio) {
    const on = state.selected.has(p.id)
    return `
      <div onclick="event.stopPropagation();tpToggle(${p.id})"
        style="flex:1;display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border:1px solid ${on?'#2563eb':'#e2e8f0'};border-radius:10px;cursor:pointer;background:${on?'#eff6ff':'white'}">
        <div style="display:flex;align-items:center;gap:8px">
          ${indicator(on, radio)}
          <span style="font-size:14px">${p.label}</span>
        </div>
        <span style="font-size:12px;color:#94a3b8">${p.count} câu</span>
      </div>`
  }

  function partGrid(list, radio) {
    let html = ''
    for (let i = 0; i < list.length; i += 2) {
      html += `<div style="display:flex;gap:10px;margin-bottom:8px">
        ${partItem(list[i], radio)}
        ${list[i+1] ? partItem(list[i+1], radio) : '<div style="flex:1"></div>'}
      </div>`
    }
    return html
  }

  function render() {
    const listening = PARTS.filter(p => p.group === 'LISTENING')
    const reading   = PARTS.filter(p => p.group === 'READING')
    const all       = allChosen()
    const total     = totalQ()

    app.innerHTML = `
      <div style="min-height:100vh;background:rgba(15,23,42,0.5);display:flex;align-items:center;justify-content:center;padding:20px">
        <div style="background:white;border-radius:18px;width:100%;max-width:520px;box-shadow:0 24px 64px rgba(0,0,0,0.2);overflow:hidden">

          <!-- Header -->
          <div style="padding:20px 24px 16px;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:center">
            <div>
              <h3 style="margin:0 0 2px;font-size:18px;font-weight:700;color:#0f172a">Chọn chế độ</h3>
              <p style="margin:0;font-size:13px;color:#64748b">Test ${test} • ${year}</p>
            </div>
            <button onclick="navigate('/toeic-lr')" style="background:none;border:none;font-size:24px;cursor:pointer;color:#94a3b8;line-height:1;padding:4px">×</button>
          </div>

          <!-- Tabs -->
          <div style="padding:16px 20px 0">
            <div style="display:flex;background:#f1f5f9;border-radius:12px;padding:4px;gap:0">
              <button onclick="tpTab('exam')"
                style="flex:1;border:none;border-radius:9px;padding:10px;cursor:pointer;font-size:14px;font-weight:500;background:${state.tab==='exam'?'white':'transparent'};color:${state.tab==='exam'?'#0f172a':'#64748b'};box-shadow:${state.tab==='exam'?'0 1px 4px rgba(0,0,0,0.08)':'none'}">
                📄 Luyện thi
              </button>
              <button onclick="tpTab('practice')"
                style="flex:1;border:none;border-radius:9px;padding:10px;cursor:pointer;font-size:14px;font-weight:500;background:${state.tab==='practice'?'white':'transparent'};color:${state.tab==='practice'?'#0f172a':'#64748b'};box-shadow:${state.tab==='practice'?'0 1px 4px rgba(0,0,0,0.08)':'none'}">
                🎯 Luyện tập
              </button>
            </div>
          </div>

          <!-- Body -->
          <div style="padding:16px 20px 20px;max-height:72vh;overflow-y:auto">

          ${state.tab === 'exam' ? `

            <!-- Full Test card -->
            <div style="border:2px solid ${state.examCard==='full'?'#2563eb':'#e2e8f0'};border-radius:14px;padding:18px;margin-bottom:12px;cursor:pointer" onclick="tpCard('full')">
              <div style="display:flex;align-items:center;justify-content:space-between">
                <div style="display:flex;align-items:center;gap:12px">
                  <div style="width:40px;height:40px;background:#dbeafe;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px">📋</div>
                  <div>
                    <div style="font-weight:600;font-size:15px;color:#0f172a">Full Test (200 câu)</div>
                    <div style="font-size:12px;color:#64748b;margin-top:2px">Làm đầy đủ đề thi như thi thật – 2 tiếng</div>
                  </div>
                </div>
                <button onclick="event.stopPropagation();tpStart('exam-full')"
                  style="background:#2563eb;color:white;border:none;padding:9px 16px;border-radius:10px;cursor:pointer;font-weight:600;font-size:13px;white-space:nowrap">
                  ▶ Bắt đầu
                </button>
              </div>
              <div style="display:flex;gap:8px;margin-top:12px">
                <span style="background:#eff6ff;color:#2563eb;font-size:12px;padding:4px 10px;border-radius:20px">⏱ 120 phút</span>
                <span style="background:#eff6ff;color:#2563eb;font-size:12px;padding:4px 10px;border-radius:20px">📋 200 câu</span>
              </div>
            </div>

            <!-- Thi theo Part card -->
            <div style="border:2px solid ${state.examCard==='part'?'#2563eb':'#e2e8f0'};border-radius:14px;padding:18px;cursor:pointer" onclick="tpCard('part')">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
                <div style="display:flex;align-items:center;gap:12px">
                  <div style="width:40px;height:40px;background:#dcfce7;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px">🎯</div>
                  <div>
                    <div style="font-weight:600;font-size:15px;color:#0f172a">Thi theo Part</div>
                    <div style="font-size:12px;color:#64748b;margin-top:2px">Chọn Part cụ thể để thi thử</div>
                  </div>
                </div>
                <button onclick="event.stopPropagation();tpStart('exam-part')"
                  style="background:${state.examCard==='part'&&state.selected.size>0?'#2563eb':'#94a3b8'};color:white;border:none;padding:9px 16px;border-radius:10px;cursor:pointer;font-weight:600;font-size:13px;white-space:nowrap">
                  ▶ Bắt đầu
                </button>
              </div>

              <div onclick="event.stopPropagation();tpToggleAll()"
                style="display:flex;align-items:center;justify-content:space-between;padding:11px 14px;border:1px solid ${all?'#2563eb':'#e2e8f0'};border-radius:10px;cursor:pointer;background:${all?'#eff6ff':'#f8faff'};margin-bottom:10px">
                <div style="display:flex;align-items:center;gap:8px">
                  ${indicator(all, true)}
                  <span style="font-size:14px;font-weight:500">Chọn tất cả 7 Part</span>
                </div>
                <span style="font-size:12px;color:#94a3b8">200 câu</span>
              </div>

              <div style="font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:.8px;margin-bottom:8px">LISTENING</div>
              ${partGrid(listening, true)}
              <div style="font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:.8px;margin:10px 0 8px">READING</div>
              ${partGrid(reading, true)}
            </div>

          ` : `

            <!-- Luyện tập tab -->
            <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:12px 16px;margin-bottom:14px">
              <p style="font-size:13px;color:#1d4ed8;margin:0">
                <strong>Chế độ Luyện tập:</strong> Xem đáp án và giải thích ngay sau mỗi câu/nhóm câu hỏi.
              </p>
            </div>

            <div style="border:2px solid #2563eb;border-radius:14px;padding:18px">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
                <div style="display:flex;align-items:center;gap:10px">
                  <div style="width:32px;height:32px;background:#dcfce7;border-radius:8px;display:flex;align-items:center;justify-content:center">
                    <span style="color:#16a34a;font-weight:700;font-size:16px">✓</span>
                  </div>
                  <span style="font-weight:600;font-size:15px">Chọn Part để luyện tập</span>
                </div>
                <button onclick="tpStart('practice')"
                  style="background:#2563eb;color:white;border:none;padding:9px 16px;border-radius:10px;cursor:pointer;font-weight:600;font-size:13px">
                  ▶ Bắt đầu
                </button>
              </div>

              <div onclick="tpToggleAll()"
                style="display:flex;align-items:center;justify-content:space-between;padding:11px 14px;border:1px solid ${all?'#2563eb':'#e2e8f0'};border-radius:10px;cursor:pointer;background:${all?'#eff6ff':'#f8faff'};margin-bottom:12px">
                <div style="display:flex;align-items:center;gap:8px">
                  ${indicator(all, false)}
                  <span style="font-size:14px;font-weight:500">Chọn tất cả 7 Part</span>
                </div>
                <span style="font-size:12px;color:#94a3b8">200 câu</span>
              </div>

              <div style="font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:.8px;margin-bottom:8px">LISTENING</div>
              ${partGrid(listening, false)}
              <div style="font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:.8px;margin:10px 0 8px">READING</div>
              ${partGrid(reading, false)}

              <div style="display:flex;align-items:center;gap:8px;padding-top:14px;border-top:1px solid #f1f5f9;margin-top:12px">
                <span style="background:#eff6ff;color:#2563eb;font-size:12px;font-weight:600;padding:4px 12px;border-radius:20px">📋 ${total} câu</span>
                <span style="font-size:13px;color:#64748b">Đã chọn ${state.selected.size} part</span>
              </div>
            </div>
          `}

          </div>
        </div>
      </div>
    `
  }

  window.tpTab        = tab  => { state.tab = tab; render() }
  window.tpCard       = card => { state.examCard = card; render() }
  window.tpToggle     = id   => { state.selected.has(id) ? state.selected.delete(id) : state.selected.add(id); render() }
  window.tpToggleAll  = ()   => { allChosen() ? state.selected.clear() : PARTS.forEach(p => state.selected.add(p.id)); render() }
  window.tpStart      = mode => {
    if (state.selected.size === 0 && mode !== 'exam-full') return
    const parts = mode === 'exam-full' ? '1,2,3,4,5,6,7' : [...state.selected].sort().join(',')
    requireAuth(() => navigate(`/quiz?test_id=${testId}&year=${year}&test=${test}&parts=${parts}&mode=${mode}`))
  }

  render()
}
