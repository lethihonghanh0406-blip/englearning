import { BASE, getState, update } from './store.js'
import { shell, esc, fmt } from './ui.js'

export default function notesView({ app, lessons }) {
  function build() {
    const notes = getState().notes
    if (!notes.length) return `<div class="ee-card ee-muted">Chưa có ghi chú. Trong trang học bài, dùng ô “Ghi chú” hoặc “Lưu câu đang nghe”.</div>`
    return lessons.filter(l => notes.some(n => n.slug === l.slug)).map(l => `
      <div class="ee-card" style="margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <div class="ee-h" style="font-size:16px">Bài ${l.lesson_no} · ${esc(l.title)}</div>
          <span class="ee-link" onclick="navigate('${BASE}/lesson/${encodeURIComponent(l.slug)}')">Mở bài →</span>
        </div>
        ${notes.filter(n => n.slug === l.slug).sort((a, b) => b.at - a.at).map(n => `
          <div style="display:flex;gap:12px;padding:10px 0;border-top:1px solid #f7efe8;font-size:14px">
            <span class="ee-muted" style="min-width:110px">${new Date(n.at).toLocaleDateString('vi-VN')}${n.t != null ? ` · ${n.tab === 'ms' ? 'MS' : 'Main'} ${fmt(n.t)}` : ''}</span>
            <span style="flex:1;white-space:pre-wrap">${esc(n.text)}</span>
            <span onclick="eeNDel('${n.id}')" style="cursor:pointer;color:var(--mute)" title="Xóa">✕</span>
          </div>`).join('')}
      </div>`).join('')
  }

  shell(app, '/notes', `
    <div class="ee-h" style="font-size:24px;margin-bottom:16px">Ghi chú của bạn</div>
    <div id="ee-nlist">${build()}</div>`)

  window.eeNDel = id => {
    update(s => { s.notes = s.notes.filter(n => n.id !== id) })
    document.getElementById('ee-nlist').innerHTML = build()
  }
}
