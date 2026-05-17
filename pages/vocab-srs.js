import { supabase }    from '../supabase/client.js'
import { requireAuth } from '../utils/auth.js'

// ── SM-2 Algorithm ────────────────────────────────────────────────────────────
// quality: 0=quên, 1=khó, 2=ok, 3=dễ
function sm2(quality, { interval, ease_factor, repetitions }) {
  const q = [0, 2, 4, 5][quality]        // map sang thang 0-5

  let newInterval, newEF = ease_factor, newReps

  if (q < 3) {
    newInterval = 1
    newReps = 0
  } else {
    newReps = repetitions + 1
    if (repetitions === 0)      newInterval = 1
    else if (repetitions === 1) newInterval = 6
    else                        newInterval = Math.round(interval * ease_factor)
    newEF = Math.max(1.3, ease_factor + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  }

  const due = new Date()
  due.setDate(due.getDate() + newInterval)

  return {
    interval:         newInterval,
    ease_factor:      Math.round(newEF * 100) / 100,
    repetitions:      newReps,
    due_date:         due.toISOString().split('T')[0],
    last_reviewed_at: new Date().toISOString(),
  }
}

export default async function vocabSrsPage(app) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) { requireAuth(() => {}); return }
  const uid = session.user.id

  app.innerHTML = `
    <div style="min-height:100vh;background:#f8faff;display:flex;align-items:center;justify-content:center">
      <div style="text-align:center;color:#64748b">
        <div style="font-size:36px;margin-bottom:12px">📚</div>
        <p style="font-size:14px">Đang tải thẻ ôn tập...</p>
      </div>
    </div>`

  const today = new Date().toISOString().split('T')[0]

  // Load TOEIC + Chinese SRS cards in parallel
  const [{ data: srsRows }, { data: chineseRows }] = await Promise.all([
    supabase.from('user_vocab_srs')
      .select('id, interval, ease_factor, repetitions, due_date, vocab_id, word, meaning')
      .eq('user_id', uid).lte('due_date', today).order('due_date'),
    supabase.from('chinese_srs')
      .select('id, interval, ease_factor, repetitions, due_date, chinese_vocab_id')
      .eq('user_id', uid).lte('due_date', today).order('due_date'),
  ])

  if (!srsRows?.length && !chineseRows?.length) { renderEmpty(app); return }

  // Build TOEIC cards
  const vocabIds = (srsRows || []).filter(r => r.vocab_id).map(r => r.vocab_id)
  const vocabMap = {}
  if (vocabIds.length) {
    const { data: vocabRows } = await supabase
      .from('question_vocab').select('id, word, meaning').in('id', vocabIds)
    for (const v of (vocabRows || [])) vocabMap[v.id] = v
  }
  const toeicCards = (srsRows || [])
    .map(r => ({ ...r, source: 'toeic', vocab: r.vocab_id ? vocabMap[r.vocab_id] : (r.word ? { word: r.word, meaning: r.meaning } : null) }))
    .filter(r => r.vocab)

  // Build Chinese cards
  const cvIds = (chineseRows || []).map(r => r.chinese_vocab_id)
  const cvMap = {}
  if (cvIds.length) {
    const { data: cvRows } = await supabase
      .from('chinese_vocab').select('id, char, pinyin, vi').in('id', cvIds)
    for (const v of (cvRows || [])) cvMap[v.id] = v
  }
  const chineseCards = (chineseRows || [])
    .map(r => {
      const cv = cvMap[r.chinese_vocab_id]
      if (!cv) return null
      return { ...r, source: 'chinese', vocab: { word: cv.char, pinyin: cv.pinyin, meaning: cv.vi } }
    })
    .filter(Boolean)

  const cards = [...toeicCards, ...chineseCards].sort((a, b) => a.due_date.localeCompare(b.due_date))
  if (!cards.length) { renderEmpty(app); return }

  // ── State ──────────────────────────────────────────────────────────────────
  let idx = 0
  let flipped = false
  let doneCount = 0

  // ── Render card ────────────────────────────────────────────────────────────
  function render() {
    if (idx >= cards.length) { renderDone(app, doneCount); return }

    const c    = cards[idx]
    const v    = c.vocab
    const pct  = Math.round(idx / cards.length * 100)
    const left = cards.length - idx

    app.innerHTML = `
      <div style="min-height:100vh;background:#f8faff;display:flex;flex-direction:column">

        <!-- Top bar -->
        <div style="background:white;border-bottom:1px solid #e2e8f0;padding:14px 24px;display:flex;align-items:center;gap:16px;position:sticky;top:0;z-index:10">
          <button onclick="history.back()" style="background:none;border:none;cursor:pointer;color:#64748b;font-size:14px;padding:0">← Thoát</button>
          <div style="flex:1;background:#f1f5f9;border-radius:6px;height:8px;overflow:hidden">
            <div style="height:100%;background:#2563eb;width:${pct}%;transition:width .5s;border-radius:6px"></div>
          </div>
          <span style="font-size:14px;font-weight:700;color:#374151;white-space:nowrap;font-family:'Space Grotesk',sans-serif">${idx + 1}<span style="color:#94a3b8;font-weight:500">/${cards.length}</span></span>
          <span style="font-size:12px;background:#fef9c3;color:#92400e;padding:4px 12px;border-radius:20px;font-weight:700">📋 ${left} thẻ còn lại</span>
        </div>

        <!-- Card area -->
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px 20px">

          <!-- Card -->
          <div onclick="srsFlip()"
            style="background:white;border-radius:28px;border:1.5px solid #e2e8f0;width:100%;max-width:520px;
              min-height:320px;padding:52px 44px;text-align:center;cursor:${flipped?'default':'pointer'};
              box-shadow:0 12px 40px rgba(0,0,0,.08);display:flex;flex-direction:column;
              align-items:center;justify-content:center;gap:16px;transition:box-shadow .2s,border-color .2s;
              ${flipped?'border-color:#2563eb;box-shadow:0 12px 40px rgba(37,99,235,.12)':''}">

            ${!flipped ? `
              <div style="font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:1.2px;text-transform:uppercase">${c.source === 'chinese' ? 'Tiếng Trung' : 'Từ vựng'}</div>
              <div style="font-size:${c.source === 'chinese' ? 72 : 54}px;font-weight:800;color:#0f172a;font-family:'Space Grotesk',sans-serif;line-height:1.05;letter-spacing:-1px">
                ${v.word}
              </div>
              <div style="display:flex;align-items:center;gap:6px;margin-top:6px;color:#94a3b8;font-size:14px;font-weight:500">
                <span>Nhớ nghĩa rồi nhấn để lật</span>
                <span style="font-size:17px">👆</span>
              </div>
            ` : `
              <div style="font-size:${c.source === 'chinese' ? 48 : 36}px;font-weight:800;color:#0f172a;font-family:'Space Grotesk',sans-serif;letter-spacing:-.5px">${v.word}</div>
              ${c.source === 'chinese' && v.pinyin ? `<div style="font-size:20px;color:#f97316;font-weight:700;margin:2px 0">${v.pinyin}</div>` : ''}
              <div style="width:48px;height:3px;background:#2563eb;border-radius:2px"></div>
              <div style="font-size:22px;font-weight:600;color:#1d4ed8;line-height:1.5;font-family:'Inter',sans-serif">${v.meaning || '(chưa có nghĩa)'}</div>
              ${c.interval > 1 ? `
                <div style="font-size:12px;color:#94a3b8;margin-top:2px;font-weight:500">Đã ôn: ${c.interval} ngày trước</div>
              ` : ''}
            `}
          </div>

          <!-- Rating buttons — chỉ hiện sau khi lật -->
          ${flipped ? `
            <div style="width:100%;max-width:520px;margin-top:22px">
              <div style="font-size:11px;font-weight:700;color:#94a3b8;text-align:center;margin-bottom:14px;letter-spacing:1px;text-transform:uppercase">Bạn nhớ từ này ở mức nào?</div>
              <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">
                ${[
                  { q:0, ic:'❌', lb:'Quên',   sub:'Ôn lại ngay',  bg:'#fef2f2', tc:'#dc2626', border:'#fecaca' },
                  { q:1, ic:'😕', lb:'Khó',    sub:'Ngày mai',     bg:'#fffbeb', tc:'#d97706', border:'#fde68a' },
                  { q:2, ic:'🙂', lb:'OK',     sub:'Vài ngày',     bg:'#f0fdf4', tc:'#16a34a', border:'#bbf7d0' },
                  { q:3, ic:'✅', lb:'Dễ',     sub:'Lâu hơn',      bg:'#eff6ff', tc:'#2563eb', border:'#bfdbfe' },
                ].map(r => `
                  <button onclick="srsRate(${r.q})"
                    style="padding:18px 8px;border:2px solid ${r.border};border-radius:16px;background:${r.bg};
                      cursor:pointer;transition:all .15s;display:flex;flex-direction:column;align-items:center;gap:6px"
                    onmouseover="this.style.transform='translateY(-3px)';this.style.boxShadow='0 6px 16px rgba(0,0,0,.12)'"
                    onmouseout="this.style.transform='';this.style.boxShadow=''">
                    <span style="font-size:26px">${r.ic}</span>
                    <span style="font-size:14px;font-weight:700;color:${r.tc};font-family:'Space Grotesk',sans-serif">${r.lb}</span>
                    <span style="font-size:11px;color:${r.tc};opacity:.75;font-weight:500">${r.sub}</span>
                  </button>`).join('')}
              </div>
            </div>
          ` : `
            <div style="width:100%;max-width:520px;margin-top:18px;display:grid;grid-template-columns:repeat(4,1fr);gap:12px;opacity:.2;pointer-events:none">
              ${['❌ Quên','😕 Khó','🙂 OK','✅ Dễ'].map(lb=>`
                <div style="padding:18px 8px;border:2px solid #e2e8f0;border-radius:16px;background:#f8faff;text-align:center;font-size:14px;color:#94a3b8;font-weight:600">${lb}</div>`).join('')}
            </div>
          `}

        </div>
      </div>`
  }

  // ── Handlers ───────────────────────────────────────────────────────────────
  window.srsFlip = () => {
    if (flipped) return
    flipped = true
    render()
  }

  window.srsRate = async (quality) => {
    const c = cards[idx]
    const updated = sm2(quality, c)
    if (c.source === 'chinese') {
      await supabase.from('chinese_srs').update(updated).eq('id', c.id)
    } else {
      await supabase.from('user_vocab_srs').update(updated).eq('id', c.id)
    }
    doneCount++
    idx++
    flipped = false
    render()
  }

  render()
}

// ── Empty / Done screens ──────────────────────────────────────────────────────
function renderEmpty(app) {
  app.innerHTML = `
    <div style="min-height:100vh;background:#f8faff;display:flex;align-items:center;justify-content:center;padding:20px">
      <div style="background:white;border-radius:22px;padding:48px 36px;max-width:420px;width:100%;text-align:center;box-shadow:0 16px 48px rgba(0,0,0,.08)">
        <div style="font-size:56px;margin-bottom:16px">✨</div>
        <h2 style="font-size:22px;font-weight:700;color:#0f172a;margin:0 0 8px;font-family:'Space Grotesk',sans-serif">Không có thẻ nào hôm nay!</h2>
        <p style="font-size:14px;color:#64748b;margin:0 0 28px;line-height:1.6">
          Bạn đã ôn tập đủ rồi. Hãy học thêm từ mới để mở rộng vốn từ nhé!
        </p>
        <button onclick="navigate('/toeic/vocabulary')"
          style="width:100%;padding:13px;background:#2563eb;color:white;border:none;border-radius:12px;cursor:pointer;font-size:14px;font-weight:600;margin-bottom:10px">
          📚 Học thêm từ mới
        </button>
        <button onclick="history.back()"
          style="width:100%;padding:12px;background:#f1f5f9;color:#374151;border:none;border-radius:12px;cursor:pointer;font-size:14px">
          ← Quay lại
        </button>
      </div>
    </div>`
}

function renderDone(app, count) {
  app.innerHTML = `
    <div style="min-height:100vh;background:#f8faff;display:flex;align-items:center;justify-content:center;padding:20px">
      <div style="background:white;border-radius:22px;padding:48px 36px;max-width:420px;width:100%;text-align:center;box-shadow:0 16px 48px rgba(0,0,0,.08);animation:srsPop .3s ease">
        <div style="font-size:56px;margin-bottom:16px">🎉</div>
        <h2 style="font-size:22px;font-weight:700;color:#0f172a;margin:0 0 6px;font-family:'Space Grotesk',sans-serif">Hoàn thành!</h2>
        <p style="font-size:28px;font-weight:800;color:#2563eb;font-family:'Space Grotesk',sans-serif;margin:0 0 6px">${count} thẻ</p>
        <p style="font-size:14px;color:#64748b;margin:0 0 28px;line-height:1.6">
          Tuyệt vời! Hệ thống sẽ nhắc bạn ôn tập lại đúng thời điểm để nhớ lâu nhất.
        </p>
        <div style="background:#f0fdf4;border-radius:14px;padding:16px;margin-bottom:24px">
          <p style="font-size:13px;color:#15803d;margin:0;line-height:1.6">
            💡 <strong>Lặp lại ngắt quãng (SRS)</strong>: hệ thống tự động tính thời điểm ôn lại tối ưu dựa trên mức độ bạn nhớ — từ khó sẽ xuất hiện sớm hơn, từ dễ xuất hiện thưa hơn.
          </p>
        </div>
        <button onclick="navigate('/toeic/vocabulary')"
          style="width:100%;padding:13px;background:#2563eb;color:white;border:none;border-radius:12px;cursor:pointer;font-size:14px;font-weight:600;margin-bottom:10px">
          📚 Học thêm từ mới
        </button>
        <button onclick="history.back()"
          style="width:100%;padding:12px;background:#f1f5f9;color:#374151;border:none;border-radius:12px;cursor:pointer;font-size:14px">
          ← Về Dashboard
        </button>
      </div>
    </div>
    <style>@keyframes srsPop { from { opacity:0;transform:scale(.94) } to { opacity:1;transform:none } }</style>`
}
