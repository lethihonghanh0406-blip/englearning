import { supabase }     from '../supabase/client.js'
import { requireAuth } from '../utils/auth.js'

export default async function toeicLR(app) {
  let currentYear = 2026
  const years = [2026, 2025, 2024, 2023]
  let tests = []
  let progressMap = {}
  let attemptMap  = {}

  function loading() {
    app.innerHTML = `<div style="min-height:100vh;background:#f8faff;display:flex;align-items:center;justify-content:center"><div style="color:#94a3b8;font-size:14px">Đang tải...</div></div>`
  }

  async function load() {
    loading()

    const { data: testsData } = await supabase
      .from('tests')
      .select('*')
      .eq('year', currentYear)
      .order('test_number')

    tests = testsData || []

    progressMap = {}
    attemptMap  = {}
    const { data: { session } } = await supabase.auth.getSession()
    if (session && tests.length) {
      const ids = tests.map(t => t.id)

      const { data: answers } = await supabase
        .from('user_answers')
        .select('test_id, is_correct')
        .eq('user_id', session.user.id)
        .in('test_id', ids)

      for (const a of (answers || [])) {
        if (!progressMap[a.test_id]) progressMap[a.test_id] = { answered: 0, correct: 0, wrong: 0 }
        progressMap[a.test_id].answered++
        if (a.is_correct) progressMap[a.test_id].correct++
        else progressMap[a.test_id].wrong++
      }

      const { data: attempts } = await supabase
        .from('user_tests')
        .select('test_id')
        .eq('user_id', session.user.id)
        .in('test_id', ids)

      for (const a of (attempts || [])) {
        attemptMap[a.test_id] = (attemptMap[a.test_id] || 0) + 1
      }
    }

    render()
  }

  function render() {
    app.innerHTML = `
      <div style="min-height:100vh;background:#f8faff">

        <!-- Header -->
        <div style="background:white;border-bottom:1px solid #e2e8f0;padding:20px 40px">
          <div style="max-width:1100px;margin:auto;display:flex;align-items:center;justify-content:space-between">
            <div>
              <h1 style="font-size:22px;font-weight:700;color:#0f172a;margin:0 0 2px;font-family:'Space Grotesk',sans-serif">TOEIC Full Test L&R</h1>
              <p style="margin:0;font-size:13px;color:#64748b">Luyện thi TOEIC Listening & Reading — 200 câu • 120 phút</p>
            </div>
            <div style="display:flex;gap:6px">
              <button onclick="navigate('/toeic')" style="background:none;border:1px solid #e2e8f0;padding:7px 14px;border-radius:10px;cursor:pointer;font-size:12px;color:#64748b">🎯 4 Kỹ năng</button>
              <button onclick="navigate('/toeic/vocabulary')" style="background:none;border:1px solid #e2e8f0;padding:7px 14px;border-radius:10px;cursor:pointer;font-size:12px;color:#64748b">📚 Từ vựng</button>
            </div>
          </div>
        </div>

        <!-- Body -->
        <div style="max-width:1100px;margin:auto;padding:28px 40px">

          <!-- Year tabs -->
          <div style="display:flex;gap:8px;margin-bottom:24px">
            ${years.map(y => `
              <button onclick="lrYear(${y})"
                style="padding:8px 20px;border-radius:20px;border:none;cursor:pointer;font-size:14px;font-weight:${y===currentYear?600:400};background:${y===currentYear?'#2563eb':'white'};color:${y===currentYear?'white':'#64748b'};box-shadow:0 1px 3px rgba(0,0,0,0.07);transition:all .15s">
                ${y}
              </button>
            `).join('')}
          </div>

          <!-- Grid -->
          ${!tests.length ? `
            <div style="text-align:center;padding:60px 20px;color:#94a3b8">
              <div style="font-size:40px;margin-bottom:12px">📭</div>
              <p style="font-size:15px">Chưa có đề thi nào cho năm ${currentYear}</p>
            </div>
          ` : `
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px">
              ${tests.map((t, idx) => {
                const testNum  = t.test_number ?? (idx + 1)
                const p        = progressMap[t.id]
                const answered = p?.answered || 0
                const correct  = p?.correct  || 0
                const wrong    = p?.wrong    || 0
                const pct      = answered ? Math.round(answered / 200 * 100) : 0
                const attempts = attemptMap[t.id] || 0

                return `
                  <div style="background:white;border-radius:16px;padding:20px;box-shadow:0 1px 4px rgba(0,0,0,0.06);border:1px solid #e2e8f0">

                    <!-- Top row: title + icons -->
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
                      <span style="font-size:18px;font-weight:700;color:#2563eb">Test ${testNum}</span>
                      <div style="display:flex;align-items:center;gap:6px">
                        ${answered > 0 ? `
                          <button onclick="lrDeleteAllHistory('${t.id}',${testNum})" title="Xóa toàn bộ lịch sử"
                            style="width:30px;height:30px;border-radius:8px;border:1px solid #fee2e2;background:#fef2f2;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center">
                            🗑️
                          </button>` : ''}
                        <div style="position:relative">
                          <button onclick="lrHistory('${t.id}',${testNum})" title="Lịch sử làm bài"
                            style="width:30px;height:30px;border-radius:8px;border:1px solid ${attempts?'#bfdbfe':'#e2e8f0'};background:${attempts?'#eff6ff':'white'};cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center">
                            🕐
                          </button>
                          ${attempts > 0 ? `
                            <span style="position:absolute;top:-5px;right:-5px;background:#ef4444;color:white;font-size:10px;font-weight:700;border-radius:10px;padding:0 4px;min-width:16px;height:16px;display:flex;align-items:center;justify-content:center;line-height:1;pointer-events:none">
                              ${attempts}
                            </span>` : ''}
                        </div>
                      </div>
                    </div>

                    <!-- Info row -->
                    <div style="display:flex;gap:14px;margin-bottom:14px">
                      <span style="font-size:13px;color:#64748b">📋 200 câu</span>
                      <span style="font-size:13px;color:#64748b">⏱ 120 phút</span>
                    </div>

                    <!-- Progress -->
                    <div style="margin-bottom:16px;min-height:38px">
                      ${answered > 0 ? `
                        <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
                          <span style="font-size:14px;font-weight:600;color:#0f172a">${answered}/200</span>
                          <span style="font-size:13px;color:#16a34a;font-weight:600">✓ ${correct}</span>
                          <span style="font-size:13px;color:#dc2626;font-weight:600">× ${wrong}</span>
                        </div>
                        <div style="height:4px;background:#f1f5f9;border-radius:4px;overflow:hidden">
                          <div style="height:100%;background:#2563eb;border-radius:4px;width:${pct}%;transition:width .4s"></div>
                        </div>
                      ` : `
                        <div style="font-size:13px;color:#94a3b8">Chưa làm bài</div>
                      `}
                    </div>

                    <!-- Main buttons -->
                    <div style="display:flex;gap:8px">
                      <button onclick="lrTest('${t.id}',${testNum},'exam')"
                        style="flex:1;padding:10px;border:1.5px solid #e2e8f0;border-radius:10px;background:white;cursor:pointer;font-size:13px;font-weight:500;color:#374151;transition:all .15s">
                        ▷ Thi thử
                      </button>
                      <button onclick="lrTest('${t.id}',${testNum},'practice')"
                        style="flex:1;padding:10px;border:none;border-radius:10px;background:#16a34a;cursor:pointer;font-size:13px;font-weight:600;color:white;transition:all .15s">
                        📖 Luyện tập
                      </button>
                    </div>

                    ${wrong > 0 ? `
                    <div style="margin-top:8px">
                      <button onclick="lrRetry('${t.id}',${testNum})"
                        style="width:100%;padding:10px;border:1.5px solid #fecaca;border-radius:10px;background:#fef2f2;cursor:pointer;font-size:13px;font-weight:600;color:#dc2626;transition:all .15s">
                        × Làm lại ${wrong} câu sai
                      </button>
                    </div>` : ''}

                  </div>
                `
              }).join('')}
            </div>
          `}

        </div>
      </div>
    `
  }

  window.lrYear = async (year) => { currentYear = year; await load() }

  window.lrTest = (testId, testNum, tab) => {
    requireAuth(() => navigate(`/test?test_id=${testId}&year=${currentYear}&test=${testNum}&tab=${tab}`))
  }

  window.lrRetry = (testId, testNum) => {
    requireAuth(() => navigate(`/quiz?test_id=${testId}&year=${currentYear}&test=${testNum}&parts=1,2,3,4,5,6,7&mode=retry`))
  }

  window.lrDeleteAllHistory = async (testId, testNum) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    if (!confirm(`Xóa toàn bộ lịch sử Test ${testNum}? Hành động này không thể hoàn tác.`)) return
    await supabase.from('user_tests').delete().eq('test_id', testId).eq('user_id', session.user.id)
    await supabase.from('user_answers').delete().eq('test_id', testId).eq('user_id', session.user.id)
    await load()
  }

  window.lrHistory = async (testId, testNum) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { showHistoryModal(testNum, testId, []); return }
    const { data: history } = await supabase
      .from('user_tests')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('test_id', testId)
      .order('completed_at', { ascending: false })
    showHistoryModal(testNum, testId, history || [])
  }

  window.lrDeleteHistory = async (historyId, testId, testNum) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await supabase.from('user_tests').delete().eq('id', historyId).eq('user_id', session.user.id)
    lrHistory(testId, testNum)
  }

  window.lrReviewHistory = (testId, testNum, parts, historyId) => {
    document.getElementById('lr-history-modal')?.remove()
    const utParam = historyId ? `&user_test_id=${historyId}` : ''
    navigate(`/quiz?test_id=${testId}&year=${currentYear}&test=${testNum}&parts=${parts}&mode=review${utParam}`)
  }

  window.lrRetryHistory = (testId, testNum, parts) => {
    document.getElementById('lr-history-modal')?.remove()
    navigate(`/quiz?test_id=${testId}&year=${currentYear}&test=${testNum}&parts=${parts}&mode=retry`)
  }

  function showHistoryModal(testNum, testId, history) {
    const existing = document.getElementById('lr-history-modal')
    if (existing) existing.remove()

    const modeLabel = {
      'exam-full': 'Full Test',
      'exam-part': 'Theo Part',
      'practice':  'Luyện tập',
      'retry':     'Làm lại câu sai',
      'review':    'Xem lại',
    }

    const rows = history.length ? history.map(h => {
      const wrong = h.total - h.score
      const date  = new Date(h.completed_at).toLocaleString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })
      const parts = h.parts || '1,2,3,4,5,6,7'
      const partTags = parts === '1,2,3,4,5,6,7' ? '' : parts.split(',').map(p =>
        `<span style="background:#eff6ff;color:#2563eb;font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px">P${p}</span>`
      ).join('')

      return `
        <div style="background:white;border:1px solid #e2e8f0;border-radius:14px;padding:14px;margin-bottom:10px">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px">
            <div style="display:flex;flex-wrap:wrap;gap:5px;align-items:center">
              <span style="background:#f1f5f9;color:#475569;font-size:12px;font-weight:600;padding:3px 10px;border-radius:20px">${modeLabel[h.mode] || h.mode}</span>
              ${partTags}
            </div>
            <div style="display:flex;align-items:center;gap:10px;flex-shrink:0;margin-left:8px">
              <span style="font-size:13px;font-weight:700;color:#16a34a">${h.score} câu đúng</span>
              ${wrong > 0 ? `<span style="font-size:13px;font-weight:600;color:#dc2626">${wrong} câu sai</span>` : ''}
              <button onclick="lrDeleteHistory('${h.id}','${testId}',${testNum})"
                style="background:none;border:none;cursor:pointer;color:#cbd5e1;font-size:14px;padding:0;line-height:1" title="Xóa">✕</button>
            </div>
          </div>
          <div style="font-size:12px;color:#94a3b8;margin-bottom:12px">📄 ${date}</div>
          <div style="display:flex;gap:8px">
            <button onclick="lrReviewHistory('${testId}',${testNum},'${parts}','${h.id}')"
              style="flex:1;padding:9px;border:1.5px solid #e2e8f0;border-radius:10px;background:white;cursor:pointer;font-size:13px;font-weight:500;color:#374151;display:flex;align-items:center;justify-content:center;gap:6px">
              👁 Xem lại
            </button>
            ${wrong > 0 ? `
              <button onclick="lrRetryHistory('${testId}',${testNum},'${parts}')"
                style="flex:1;padding:9px;border:1.5px solid #fecaca;border-radius:10px;background:#fef2f2;cursor:pointer;font-size:13px;font-weight:600;color:#dc2626;display:flex;align-items:center;justify-content:center;gap:6px">
                🔄 Làm lại sai (${wrong})
              </button>` : ''}
          </div>
        </div>`
    }).join('') : `<p style="text-align:center;color:#94a3b8;font-size:14px;padding:20px 0">Chưa có lịch sử làm bài</p>`

    const modal = document.createElement('div')
    modal.id = 'lr-history-modal'
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px'
    modal.onclick = e => { if (e.target === modal) modal.remove() }
    modal.innerHTML = `
      <div style="background:#f8faff;border-radius:18px;width:100%;max-width:460px;overflow:hidden;box-shadow:0 24px 64px rgba(0,0,0,0.2)">
        <div style="background:white;padding:16px 20px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:16px">🕐</span>
            <span style="font-size:16px;font-weight:700;color:#0f172a">Lịch sử — Test ${testNum}</span>
          </div>
          <button onclick="document.getElementById('lr-history-modal').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#94a3b8;line-height:1">×</button>
        </div>
        <div style="padding:14px;max-height:65vh;overflow-y:auto">${rows}</div>
      </div>`
    document.body.appendChild(modal)
  }

  await load()
}
