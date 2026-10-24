import { BASE, DAILY_GOAL_MIN, getState, lessonProgress, nextLesson, streak, totalSeconds, today } from './store.js'
import { shell, esc, art, thumb, fmtDuration } from './ui.js'

const DOW = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
const C_LISTEN = '#2563eb'
const C_SPEAK  = '#ea580c'

export default function progressView({ app, lessons }) {
  const s = getState()
  const completed = lessons.filter(l => lessonProgress(l.slug, s).completed).length
  const next = nextLesson(lessons, s)
  const days = Array.from({ length: 7 }, (_, i) => {
    const key = today(6 - i)
    const d = s.days[key] || {}
    const [y, m, dd] = key.split('-').map(Number)
    return { key, label: DOW[new Date(y, m - 1, dd).getDay()], date: `${dd}/${m}`,
             listen: Math.round((d.listen || 0) / 60), speak: Math.round((d.speak || 0) / 60) }
  })
  const max  = Math.max(10, ...days.flatMap(d => [d.listen, d.speak]))
  const top  = Math.ceil(max / 10) * 10
  const H    = 160

  const stat = (icon, label, value) => `
    <div class="ee-card" style="display:flex;align-items:center;gap:14px;padding:18px">
      <div style="width:46px;height:46px;border-radius:12px;background:var(--o-soft);display:flex;align-items:center;justify-content:center;font-size:22px">${icon}</div>
      <div><div class="ee-muted">${label}</div><div class="ee-h" style="font-size:24px">${value}</div></div>
    </div>`

  const bar = (v, color) => `<div style="width:14px;height:${v / top * H}px;min-height:${v ? 2 : 0}px;background:${color};border-radius:4px 4px 0 0"></div>`

  shell(app, '/progress', `
    <style>
      .ee-col{position:relative;flex:1;display:flex;justify-content:center;align-items:flex-end;gap:2px;height:${H}px;cursor:default}
      .ee-col:hover{background:#f1f5f9;border-radius:6px 6px 0 0}
      .ee-tip{display:none;position:absolute;bottom:calc(100% + 6px);left:50%;transform:translateX(-50%);background:#1e293b;color:#fff;
        font-size:12px;padding:8px 10px;border-radius:8px;white-space:nowrap;z-index:5;line-height:1.6}
      .ee-col:hover .ee-tip{display:block}
    </style>
    <div class="ee-h" style="font-size:24px;margin-bottom:16px">Tiến độ của bạn</div>

    <div class="ee-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:18px">
      ${stat('⏱️', 'Tổng thời gian học', fmtDuration(totalSeconds(s)))}
      ${stat('📘', 'Bài đã hoàn thành', `${completed} / ${lessons.length}`)}
      ${stat('🔥', `Chuỗi ngày học đủ ${DAILY_GOAL_MIN} phút`, `${streak(s)} ngày`)}
    </div>

    <div class="ee-card" style="margin-bottom:18px">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:18px">
        <div class="ee-h" style="font-size:16px">Hoạt động 7 ngày qua <span class="ee-muted" style="font-weight:400">(phút)</span></div>
        <div style="display:flex;gap:16px;font-size:12px;color:var(--ink2)">
          <span style="display:flex;align-items:center;gap:6px"><span style="width:10px;height:10px;border-radius:2px;background:${C_LISTEN}"></span>Nghe</span>
          <span style="display:flex;align-items:center;gap:6px"><span style="width:10px;height:10px;border-radius:2px;background:${C_SPEAK}"></span>Nói / trả lời</span>
        </div>
      </div>
      <div style="display:flex;gap:10px">
        <div style="display:flex;flex-direction:column;justify-content:space-between;height:${H}px;font-size:11px;color:var(--mute);text-align:right;min-width:24px">
          <span>${top}</span><span>${top / 2}</span><span>0</span>
        </div>
        <div style="flex:1">
          <div style="position:relative">
            <div style="position:absolute;inset:0;display:flex;flex-direction:column;justify-content:space-between;pointer-events:none">
              <div style="border-top:1px dashed #e2e8f0"></div><div style="border-top:1px dashed #e2e8f0"></div><div style="border-top:1px solid #cbd5e1"></div>
            </div>
            <div style="display:flex;gap:6px;position:relative">
              ${days.map(d => `
                <div class="ee-col">
                  ${bar(d.listen, C_LISTEN)}${bar(d.speak, C_SPEAK)}
                  <div class="ee-tip"><b>${d.label} ${d.date}</b><br>Nghe: ${d.listen} phút<br>Nói: ${d.speak} phút</div>
                </div>`).join('')}
            </div>
          </div>
          <div style="display:flex;gap:6px;margin-top:6px">
            ${days.map(d => `<div style="flex:1;text-align:center;font-size:12px;color:${d.key === today() ? 'var(--o2)' : 'var(--mute)'};font-weight:${d.key === today() ? 700 : 400}">${d.label}</div>`).join('')}
          </div>
        </div>
      </div>
      <details style="margin-top:14px;font-size:13px">
        <summary class="ee-link" style="cursor:pointer">Xem dạng bảng</summary>
        <table style="width:100%;border-collapse:collapse;margin-top:8px">
          <tr style="color:var(--mute);text-align:left"><th style="padding:6px">Ngày</th><th style="padding:6px">Nghe (phút)</th><th style="padding:6px">Nói (phút)</th></tr>
          ${days.map(d => `<tr style="border-top:1px solid #f1f5f9"><td style="padding:6px">${d.label} ${d.date}</td><td style="padding:6px">${d.listen}</td><td style="padding:6px">${d.speak}</td></tr>`).join('')}
        </table>
      </details>
    </div>

    <div class="ee-grid" style="grid-template-columns:1.4fr 1fr">
      <div class="ee-card">
        <div class="ee-h" style="font-size:16px;margin-bottom:12px">Tiến độ từng bài</div>
        ${lessons.map(l => {
          const p = lessonProgress(l.slug, s)
          return `<div style="display:flex;align-items:center;gap:12px;padding:8px 0;cursor:pointer" onclick="navigate('${BASE}/lesson/${encodeURIComponent(l.slug)}')">
            ${thumb(l, 44, 10)}
            <div style="flex:1;min-width:0">
              <div style="font-size:14px;font-weight:600">Bài ${l.lesson_no} · ${esc(l.title)}</div>
              <div class="ee-bar" style="margin-top:6px"><div style="width:${p.done / p.total * 100}%;${p.completed ? 'background:#16a34a' : ''}"></div></div>
            </div>
            <span class="ee-muted" style="min-width:40px;text-align:right">${p.completed ? '✓' : `${p.done}/${p.total}`}</span>
          </div>`
        }).join('')}
      </div>
      <div class="ee-card">
        <div class="ee-h" style="font-size:16px;margin-bottom:12px">Bài tiếp theo</div>
        ${next ? `
          <div style="position:relative;height:120px;border-radius:12px;overflow:hidden;margin-bottom:12px">${art(next, { id: 'next', w: 600 })}</div>
          <div style="font-size:15px;font-weight:600">Bài ${next.lesson_no} · ${esc(next.title)}</div>
          <div class="ee-muted" style="margin-bottom:12px">Main Audio + Mini-Story</div>
          <button class="ee-btn" style="width:100%" onclick="navigate('${BASE}/lesson/${encodeURIComponent(next.slug)}')">Tiếp tục</button>`
          : `<div class="ee-muted">Chưa có bài học</div>`}
      </div>
    </div>`)
}
