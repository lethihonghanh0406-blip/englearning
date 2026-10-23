import { BASE, LEVELS, DAILY_GOAL_MIN, getState, lessonProgress, nextLesson, today } from './store.js'
import { shell, esc, scene, thumb, levelLabel } from './ui.js'

export default function dashboardView({ app, lessons }) {
  const s       = getState()
  const current = nextLesson(lessons, s)
  const levelIx = Math.max(0, LEVELS.findIndex(([k]) => k === (current?.level || 'beginner')))
  const todayMin = Math.floor(((s.days[today()]?.listen || 0) + (s.days[today()]?.speak || 0)) / 60)
  const goalPct  = Math.min(100, Math.round(todayMin / DAILY_GOAL_MIN * 100))
  const cur      = current ? lessonProgress(current.slug, s) : null
  const go       = l => `navigate('${BASE}/lesson/${encodeURIComponent(l.slug)}')`

  shell(app, '', `
    <div class="ee-grid" style="grid-template-columns:1fr">
      <!-- Hero -->
      <div class="ee-hero" style="position:relative;border-radius:20px;overflow:hidden;min-height:240px;padding:32px 36px;color:#fff;display:flex;align-items:center">
        ${scene(0, { id: 'hero' })}
        <div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(15,23,42,.65),rgba(15,23,42,.1) 70%)"></div>
        <div style="position:relative;max-width:520px">
          <span style="background:var(--o);font-size:12px;font-weight:600;padding:4px 10px;border-radius:6px">Effortless English</span>
          <div class="ee-h" style="color:#fff;font-size:34px;line-height:1.15;margin:14px 0 10px">Học tiếng Anh tự nhiên,<br>từng bước một</div>
          <div style="font-size:15px;opacity:.9;margin-bottom:20px">Nghe câu chuyện thật • Trả lời câu hỏi • Tự tin giao tiếp</div>
          ${current ? `<button class="ee-btn" onclick="${go(current)}">▶ Tiếp tục học</button>` : ''}
        </div>
        <div class="ee-quote" style="position:absolute;right:36px;top:32px;max-width:220px;text-align:right;font-style:italic;font-size:14px;line-height:1.6;opacity:.95">
          “The best way to learn a language is to live it.”<div style="margin-top:6px;font-size:13px">— A.J. Hoge</div>
        </div>
      </div>

      <div class="ee-grid" style="grid-template-columns:2fr 1fr">
        <!-- Learning path -->
        <div class="ee-card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:22px">
            <div class="ee-h" style="font-size:17px">🎯 Lộ trình của bạn</div>
            <span class="ee-link" onclick="navigate('${BASE}/lessons')">Xem tất cả →</span>
          </div>
          <div style="display:flex;align-items:flex-start">
            ${LEVELS.map(([k, label], i) => `
              <div style="flex:1;text-align:center;position:relative">
                ${i ? `<div style="position:absolute;top:16px;right:50%;width:100%;border-top:2px dashed #cbd5e1;z-index:0"></div>` : ''}
                <div style="position:relative;z-index:1;width:34px;height:34px;margin:auto;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;
                  background:${i === levelIx ? 'var(--o)' : i < levelIx ? '#bfdbfe' : '#f1f5f9'};color:${i === levelIx ? '#fff' : 'var(--ink2)'};
                  ${i === levelIx ? 'box-shadow:0 0 0 5px #dbeafe' : ''}">${i + 1}</div>
                <div style="font-size:13px;margin-top:8px;font-weight:${i === levelIx ? 700 : 500};color:${i === levelIx ? 'var(--o2)' : 'var(--ink2)'}">${label}</div>
                ${i === levelIx ? `<div class="ee-muted" style="color:var(--o2)">(Bạn đang ở đây)</div>` : ''}
              </div>`).join('')}
          </div>
        </div>

        <!-- Today's goal -->
        <div class="ee-card">
          <div class="ee-h" style="font-size:17px;margin-bottom:14px">🔥 Mục tiêu hôm nay</div>
          <div style="font-size:15px;font-weight:600">Học ${DAILY_GOAL_MIN} phút</div>
          <div class="ee-muted" style="margin:2px 0 16px">Nghe và trả lời câu hỏi</div>
          <div style="display:flex;align-items:center;gap:10px">
            <div class="ee-bar" style="flex:1"><div style="width:${goalPct}%;${goalPct >= 100 ? 'background:#16a34a' : ''}"></div></div>
            <span style="font-size:13px;font-weight:600">${todayMin}/${DAILY_GOAL_MIN}</span>
          </div>
          ${goalPct >= 100 ? `<div style="font-size:13px;color:#16a34a;margin-top:10px;font-weight:600">✓ Hoàn thành mục tiêu!</div>` : ''}
        </div>
      </div>

      <div class="ee-grid" style="grid-template-columns:1.3fr 1fr">
        <!-- Continue learning -->
        <div class="ee-card">
          <div class="ee-h" style="font-size:17px;margin-bottom:14px;color:var(--o2)">Học tiếp</div>
          ${current ? `
            <div style="display:flex;gap:18px;align-items:stretch;flex-wrap:wrap">
              <div style="position:relative;width:200px;min-height:150px;border-radius:14px;overflow:hidden;flex-shrink:0">
                ${scene(current.lesson_no, { id: 'cont' })}
                <span style="position:absolute;top:10px;left:10px;background:rgba(15,23,42,.75);color:#fff;font-size:12px;font-weight:600;padding:3px 10px;border-radius:6px">Bài ${current.lesson_no}</span>
              </div>
              <div style="flex:1;min-width:200px;display:flex;flex-direction:column">
                <div class="ee-h" style="font-size:20px">${esc(current.title)}</div>
                <div class="ee-muted" style="font-size:13px;margin:4px 0 16px">Main Audio + Mini-Story • ${levelLabel(current.level)}</div>
                <div style="font-size:13px;margin-bottom:6px">${cur.done}/${cur.total} hoạt động</div>
                <div class="ee-bar"><div style="width:${cur.done / cur.total * 100}%"></div></div>
                <button class="ee-btn" style="margin-top:auto;width:100%" onclick="${go(current)}">${cur.done ? 'Tiếp tục' : 'Bắt đầu học'}</button>
              </div>
            </div>` : `<div class="ee-muted">Chưa có bài học</div>`}
        </div>

        <!-- Lesson list -->
        <div class="ee-card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
            <div class="ee-h" style="font-size:17px">Bài học</div>
            <span class="ee-link" onclick="navigate('${BASE}/lessons')">Xem tất cả →</span>
          </div>
          ${lessons.slice(0, 4).map(l => {
            const p = lessonProgress(l.slug, s)
            return `
              <div onclick="${go(l)}" style="display:flex;gap:12px;align-items:center;padding:8px 0;cursor:pointer;border-bottom:1px solid #f1f5f9">
                ${thumb(l, 52, 10)}
                <div style="flex:1;min-width:0">
                  <div style="font-size:14px;font-weight:600">Bài ${l.lesson_no} · ${esc(l.title)}</div>
                  <div class="ee-muted">${p.completed ? 'Đã hoàn thành' : p.done ? `${p.done}/${p.total} hoạt động` : 'Chưa học'}</div>
                </div>
                ${p.completed ? `<span style="color:#16a34a;font-size:18px">✓</span>` : `<span style="color:var(--mute)">›</span>`}
              </div>`
          }).join('')}
        </div>
      </div>
    </div>`)
}
