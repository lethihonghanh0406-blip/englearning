import { BASE, getState, lessonProgress, isPro } from './store.js'
import { shell, esc, art, levelLabel } from './ui.js'

export default function lessonsView({ app, lessons }) {
  const s = getState()
  const courses = [...new Set(lessons.map(l => l.course))]

  shell(app, '/lessons', `
    <div class="ee-h" style="font-size:24px;margin-bottom:18px">Bài học</div>
    ${!lessons.length ? `<div class="ee-card ee-muted">Chưa có bài học</div>` : ''}
    ${courses.map(c => {
      const list = lessons.filter(l => l.course === c)
      const done = list.filter(l => lessonProgress(l.slug, s).completed).length
      return `
        <div style="display:flex;align-items:center;gap:14px;margin:8px 0 14px">
          <div class="ee-h" style="font-size:17px">${esc(c)}</div>
          <div class="ee-bar" style="width:160px"><div style="width:${done / list.length * 100}%"></div></div>
          <span class="ee-muted">${done}/${list.length} bài</span>
        </div>
        <div class="ee-grid" style="grid-template-columns:repeat(auto-fill,minmax(240px,1fr));margin-bottom:28px">
          ${list.map(l => {
            const p = lessonProgress(l.slug, s)
            return `
              <div class="ee-card" style="padding:0;overflow:hidden;cursor:pointer" onclick="navigate('${BASE}/lesson/${encodeURIComponent(l.slug)}')">
                <div style="position:relative;height:130px">
                  ${art(l, { id: `l${l.lesson_no}`, w: 600 })}
                  <span style="position:absolute;top:10px;left:10px;background:rgba(15,23,42,.75);color:#fff;font-size:12px;font-weight:600;padding:3px 10px;border-radius:6px">Bài ${l.lesson_no}</span>
                  ${l.locked ? `<div style="position:absolute;inset:0;background:rgba(15,23,42,.45);display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px;font-weight:700;gap:6px">🔒 Gói trọn đời</div>` : ''}
                  ${p.completed ? `<span style="position:absolute;top:10px;right:10px;background:#16a34a;color:#fff;font-size:12px;font-weight:600;padding:3px 10px;border-radius:6px">✓ Hoàn thành</span>` : ''}
                </div>
                <div style="padding:14px 16px">
                  <div class="ee-h" style="font-size:16px">${esc(l.title)}</div>
                  <div class="ee-muted" style="margin:2px 0 10px">${levelLabel(l.level)} • ${l.vocab_count ?? (l.vocab || []).length} từ vựng${l.lesson_no === 1 && !isPro() ? ' • <b style="color:#16a34a">Miễn phí</b>' : ''}</div>
                  <div class="ee-bar"><div style="width:${p.done / p.total * 100}%"></div></div>
                  <div class="ee-muted" style="margin-top:6px">${p.done}/${p.total} hoạt động</div>
                </div>
              </div>`
          }).join('')}
        </div>`
    }).join('')}`)
}
