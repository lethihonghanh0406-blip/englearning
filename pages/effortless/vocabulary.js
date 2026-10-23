import { BASE, vocabItems, exampleFor, getState, update, lessonProgress } from './store.js'
import { shell, esc, speak } from './ui.js'

export default function vocabView({ app, lessons, params }) {
  let filter = 'all'                        // all | new | saved
  let query  = params.get('q') || ''
  let lessonSlug = params.get('lesson') || ''
  const all = lessons.flatMap(l => vocabItems(l).map(v => ({ ...v, example: exampleFor(l, v.word) })))

  function rows() {
    const s = getState()
    const saved = new Set(s.saved)
    const q = query.trim().toLowerCase()
    return all.filter(v =>
      (!lessonSlug || v.slug === lessonSlug) &&
      (filter !== 'saved' || saved.has(v.word)) &&
      (filter !== 'new' || (!saved.has(v.word) && !lessonProgress(v.slug, s).completed)) &&
      (!q || [v.word, v.vi, v.example].some(x => x.toLowerCase().includes(q))))
  }

  function buildTable() {
    const saved = new Set(getState().saved)
    const list = rows()
    if (!list.length) return `<div style="padding:30px;text-align:center" class="ee-muted">Không có từ nào phù hợp.</div>`
    return `
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead><tr style="text-align:left;color:var(--mute);font-size:12px;background:#fbf6f1">
          <th style="padding:10px 12px;width:36px">#</th><th style="padding:10px">Từ / Cụm từ</th><th style="padding:10px">IPA</th>
          <th style="padding:10px">Nghĩa</th><th style="padding:10px">Ví dụ</th><th style="padding:10px">Bài</th><th style="width:76px"></th>
        </tr></thead>
        <tbody>
          ${list.map((v, i) => `
            <tr style="border-top:1px solid #f7efe8">
              <td style="padding:10px 12px;color:var(--mute)">${i + 1}</td>
              <td style="padding:10px;font-weight:600">${esc(v.word)}</td>
              <td style="padding:10px;color:var(--ink2)">${esc(v.ipa)}</td>
              <td style="padding:10px">${esc(v.vi)}</td>
              <td style="padding:10px;color:var(--ink2);font-style:italic">${esc(v.example)}</td>
              <td style="padding:10px"><span class="ee-link" onclick="navigate('${BASE}/lesson/${encodeURIComponent(v.slug)}')">${v.lesson.lesson_no}</span></td>
              <td style="white-space:nowrap">
                <button onclick="eeVSay(${all.indexOf(v)})" title="Nghe" style="border:none;background:none;cursor:pointer;font-size:16px">🔊</button>
                <button onclick="eeVSave(${all.indexOf(v)})" title="Lưu" style="border:none;background:none;cursor:pointer;font-size:17px;color:${saved.has(v.word) ? 'var(--o)' : 'var(--mute)'}">${saved.has(v.word) ? '★' : '☆'}</button>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>`
  }

  function buildFilters() {
    return [['all', 'Tất cả'], ['new', 'Từ mới'], ['saved', `Đã lưu (${getState().saved.length})`]]
      .map(([k, l]) => `<button class="ee-pill ${filter === k ? 'on' : ''}" onclick="eeVFilter('${k}')">${l}</button>`).join('')
  }

  function refresh() {
    document.getElementById('ee-vtable').innerHTML = buildTable()
    document.getElementById('ee-vfilters').innerHTML = buildFilters()
  }

  shell(app, '/vocabulary', `
    <div class="ee-h" style="font-size:24px;margin-bottom:16px">Từ vựng</div>
    <div class="ee-card" style="padding:16px">
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:14px">
        <div id="ee-vfilters" style="display:flex;gap:8px">${buildFilters()}</div>
        <div style="flex:1"></div>
        <select onchange="eeVLesson(this.value)" style="border:1px solid var(--line);border-radius:999px;padding:7px 12px;font:inherit;font-size:13px;background:#fff">
          <option value="">Tất cả bài</option>
          ${lessons.map(l => `<option value="${esc(l.slug)}" ${l.slug === lessonSlug ? 'selected' : ''}>Bài ${l.lesson_no} · ${esc(l.title)}</option>`).join('')}
        </select>
        <div class="ee-search" style="max-width:260px;padding:6px 14px">
          <span style="color:var(--mute)">🔍</span>
          <input id="ee-vq" value="${esc(query)}" placeholder="Tìm từ vựng…" oninput="eeVSearch(this.value)">
        </div>
      </div>
      <div id="ee-vtable" style="overflow-x:auto">${buildTable()}</div>
    </div>`)

  Object.assign(window, {
    eeVFilter: k => { filter = k; refresh() },
    eeVLesson: s => { lessonSlug = s; refresh() },
    eeVSearch: q => { query = q; refresh() },
    eeVSay:    i => speak(all[i]?.word, 0.8),
    eeVSave:   i => { const w = all[i].word; update(s => { s.saved = s.saved.includes(w) ? s.saved.filter(x => x !== w) : [...s.saved, w] }); refresh() },
  })
}
