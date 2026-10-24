import { BASE, ROUTINE, DAILY_GOAL_MIN, getState, getRoutine, startRoutine, setRoutineStep, nextLesson,
         streak, dayMinutes, goalMet, today, setSetting } from './store.js'
import { shell, esc } from './ui.js'

const DOW = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

export default function guideView({ app, lessons }) {
  const s       = getState()
  const routine = getRoutine(s)
  let slug      = routine?.slug || nextLesson(lessons, s)?.slug
  const todayMin = dayMinutes(s)
  const step    = routine?.step ?? 0
  const allDone = routine && step >= ROUTINE.length
  const stepDone = i => routine && (i < step || routine.spent[i] >= ROUTINE[i].min * 60)

  const week = Array.from({ length: 7 }, (_, i) => {
    const off = 6 - i, [y, m, d] = today(off).split('-').map(Number)
    return { label: DOW[new Date(y, m - 1, d).getDay()], min: dayMinutes(s, off), met: goalMet(s, off), isToday: off === 0 }
  })

  shell(app, '/guide', `
    <style>
      .ee-gd{grid-template-columns:minmax(0,1fr) 320px}
      .ee-stepc{display:flex;gap:16px;padding:18px;border:1px solid var(--line);border-radius:14px;background:#fff}
      .ee-stepc.cur{border-color:#93c5fd;box-shadow:0 0 0 3px #dbeafe}
      .ee-stepc.done{background:#f8fafc}
      @media (max-width:1100px){ .ee-gd{grid-template-columns:minmax(0,1fr)} }
      @media (max-width:640px){ .ee-stepc{flex-direction:column;gap:10px} }
    </style>

    <div class="ee-card" style="background:linear-gradient(90deg,#eff6ff,#fff);margin-bottom:18px;padding:24px 28px">
      <span style="display:inline-block;border:1px solid #93c5fd;color:var(--o2);background:#fff;font-size:12px;font-weight:600;padding:3px 12px;border-radius:999px">Cách học</span>
      <div class="ee-h" style="font-size:28px;margin:10px 0 6px">${DAILY_GOAL_MIN} phút mỗi ngày · 4 bước</div>
      <div style="font-size:14px;color:var(--ink2);line-height:1.7;max-width:720px">
        Mỗi ngày học một bài theo đúng thứ tự: nghe → hiểu → trả lời → nói theo. Thời gian chỉ được tính khi bạn thật sự học
        (đang mở bài, có thao tác hoặc audio đang phát). Học đủ <b>${DAILY_GOAL_MIN} phút</b> trong ngày để giữ <b>chuỗi 🔥</b>.</div>
    </div>

    <div class="ee-grid ee-gd" style="align-items:start">
      <div class="ee-grid" style="grid-template-columns:minmax(0,1fr)">
        <div class="ee-card">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px">
            <div class="ee-h" style="font-size:18px">Lộ trình hôm nay</div>
            <label style="font-size:13px;color:var(--ink2);display:flex;align-items:center;gap:8px">Bài học
              <select id="ee-gd-lesson" ${routine ? 'disabled title="Đã bắt đầu buổi học hôm nay"' : ''}
                style="border:1px solid var(--line);border-radius:8px;padding:6px 10px;font:inherit;font-size:13px;max-width:240px">
                ${lessons.map(l => `<option value="${esc(l.slug)}" ${l.slug === slug ? 'selected' : ''}>Bài ${l.lesson_no} – ${esc(l.title)}</option>`).join('')}
              </select></label>
          </div>
          <div class="ee-grid" style="grid-template-columns:minmax(0,1fr);gap:12px">
            ${ROUTINE.map((r, i) => {
              const done = stepDone(i), cur = routine && !allDone && i === step
              const spent = Math.min(r.min, Math.floor((routine?.spent[i] || 0) / 60))
              return `
                <div class="ee-stepc ${cur ? 'cur' : ''} ${done ? 'done' : ''}">
                  <div style="width:52px;height:52px;border-radius:14px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:24px;
                    background:${done ? '#dcfce7' : 'var(--o-soft)'}">${done ? '✅' : r.icon}</div>
                  <div style="flex:1;min-width:0">
                    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                      <span style="font-size:12px;font-weight:700;color:var(--o2);background:var(--o-soft);padding:2px 8px;border-radius:6px">${r.min} phút</span>
                      <span style="font-size:16px;font-weight:700">Bước ${i + 1} — ${r.title}</span>
                    </div>
                    <div style="font-size:14px;color:var(--ink2);line-height:1.6;margin-top:6px">${r.desc}</div>
                    <div class="ee-muted" style="margin-top:4px">💡 ${r.tip}</div>
                    ${routine ? `<div style="display:flex;align-items:center;gap:10px;margin-top:10px">
                      <div class="ee-bar" style="flex:1"><div style="width:${spent / r.min * 100}%;${done ? 'background:#16a34a' : ''}"></div></div>
                      <span class="ee-muted" style="min-width:64px;text-align:right">${spent}/${r.min} phút</span></div>` : ''}
                  </div>
                  <div style="align-self:center">
                    <button class="ee-btn ${cur || (!routine && i === 0) ? '' : 'ghost'}" style="padding:8px 16px" onclick="eeGoStep(${i})">
                      ${cur ? 'Tiếp tục' : done ? 'Làm lại' : 'Bắt đầu'}</button>
                  </div>
                </div>`
            }).join('')}
          </div>
          ${allDone ? `<div style="margin-top:14px;padding:14px;border-radius:12px;background:#dcfce7;color:#166534;font-weight:600">
            🎉 Bạn đã hoàn thành lộ trình hôm nay! ${todayMin >= DAILY_GOAL_MIN ? 'Chuỗi ngày học đã được cộng.' : `Học thêm ${DAILY_GOAL_MIN - todayMin} phút nữa để giữ chuỗi.`}</div>` : ''}
        </div>

        <div class="ee-card">
          <div class="ee-h" style="font-size:16px;margin-bottom:10px">Nguyên tắc Effortless English</div>
          <div style="font-size:14px;color:var(--ink2);line-height:1.8">
            👂 <b>Nghe nhiều hơn đọc</b> — tai học trước, mắt học sau.<br>
            🧩 <b>Học cụm từ, không học từ lẻ</b> — ghi lại cả cụm như “get a good deal”.<br>
            ⚡ <b>Trả lời thật nhanh</b> — câu trả lời ngắn cũng được, quan trọng là phản xạ.<br>
            🔁 <b>Lặp lại mỗi bài nhiều ngày</b> — học một bài 5–7 ngày rồi mới sang bài mới.</div>
        </div>
      </div>

      <div class="ee-grid" style="grid-template-columns:minmax(0,1fr)">
        <div class="ee-card" style="text-align:center">
          <div class="ee-h" style="font-size:16px;margin-bottom:10px;text-align:left">Hôm nay</div>
          ${ring(todayMin, DAILY_GOAL_MIN)}
          <div style="font-size:14px;color:var(--ink2);margin-top:8px">${todayMin >= DAILY_GOAL_MIN
            ? '✅ Đã đạt mục tiêu hôm nay!' : `Còn <b>${DAILY_GOAL_MIN - todayMin} phút</b> để giữ chuỗi`}</div>
          <button class="ee-btn" style="width:100%;margin-top:14px" onclick="eeGoStep(${allDone ? 0 : step})">
            ${allDone ? 'Ôn lại từ bước 1' : routine ? `Tiếp tục bước ${step + 1}` : 'Bắt đầu buổi học hôm nay'} →</button>
        </div>

        <div class="ee-card">
          <div style="display:flex;align-items:center;gap:12px">
            <div style="font-size:34px">🔥</div>
            <div><div class="ee-h" style="font-size:24px">${streak(s)} ngày</div><div class="ee-muted">Chuỗi ngày học đủ ${DAILY_GOAL_MIN} phút</div></div>
          </div>
          <div style="display:flex;gap:6px;margin-top:16px">
            ${week.map(d => `
              <div style="flex:1;text-align:center" title="${d.min} phút">
                <div style="width:30px;height:30px;margin:0 auto;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;
                  background:${d.met ? '#f97316' : d.min ? '#ffedd5' : '#f1f5f9'};color:${d.met ? '#fff' : '#9a3412'};
                  ${d.isToday ? 'box-shadow:0 0 0 2px #fff,0 0 0 4px #fdba74' : ''}">${d.met ? '🔥' : d.min || ''}</div>
                <div style="font-size:11px;margin-top:4px;color:${d.isToday ? 'var(--o2)' : 'var(--mute)'};font-weight:${d.isToday ? 700 : 400}">${d.label}</div>
              </div>`).join('')}
          </div>
          <div class="ee-muted" style="margin-top:10px">🔥 = đủ ${DAILY_GOAL_MIN} phút · số = phút đã học</div>
        </div>
      </div>
    </div>`)

  window.eeGoStep = i => {
    slug = document.getElementById('ee-gd-lesson')?.value || slug
    if (!slug) return
    startRoutine(slug)
    setRoutineStep(i)
    if (ROUTINE[i].vi != null) setSetting('showVI', ROUTINE[i].vi)
    navigate(`${BASE}/lesson/${encodeURIComponent(slug)}?tab=${ROUTINE[i].tab}`)
  }
}

function ring(value, goal) {
  const r = 46, c = 2 * Math.PI * r, pct = Math.min(1, value / goal)
  return `<svg width="120" height="120" viewBox="0 0 120 120" role="img" aria-label="${value} trên ${goal} phút">
    <circle cx="60" cy="60" r="${r}" fill="none" stroke="#e2e8f0" stroke-width="10"/>
    <circle cx="60" cy="60" r="${r}" fill="none" stroke="${pct >= 1 ? '#16a34a' : '#2563eb'}" stroke-width="10" stroke-linecap="round"
      stroke-dasharray="${c * pct} ${c}" transform="rotate(-90 60 60)"/>
    <text x="60" y="62" text-anchor="middle" font-size="26" font-weight="700" fill="#0f172a" font-family="Space Grotesk, sans-serif">${value}</text>
    <text x="60" y="80" text-anchor="middle" font-size="11" fill="#64748b">/ ${goal} phút</text>
  </svg>`
}
