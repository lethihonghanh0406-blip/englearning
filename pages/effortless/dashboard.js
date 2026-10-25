import { BASE, DAILY_GOAL_MIN, getState, lessonProgress, nextLesson, dayMinutes, streak } from './store.js'
import { shell, esc, art, levelLabel, timeAgo } from './ui.js'

// Learning path for one lesson: [tab or route, title, subtitle, progress flag, colors]
const PATH = [
  ['main',     'Listen',     'Main Audio',     'main',     '#ffedd5', '#ea580c'],
  ['vocab',    'Learn',      'Vocabulary',     'vocab',    '#dbeafe', '#2563eb'],
  ['ms',       'Understand', 'Mini-Story',     'ms',       '#ede9fe', '#7c3aed'],
  ['patterns', 'Review',     'Key Structures', 'patterns', '#fce7f3', '#db2777'],
  ['practice', 'Practice',   'Recall',         'practice', '#dcfce7', '#16a34a'],
]

// The whole programme: [name, subtitle, description, level, course name in effortless_lessons (null = not yet), colors]
const PROGRAMS = [
  ['Seven Rules', '7 nguyên tắc để nói tiếng Anh xuất sắc', 'Bao gồm 7 chủ đề với 15 bài học giúp bạn nắm được các chìa khóa bí mật để học tiếng Anh hiệu quả nhất.', 'Mọi trình độ', null, '#0f766e', '#ccfbf1'],
  ['Pimsleur English', 'Tiếng Anh cho người mới bắt đầu', 'Khóa học dành riêng cho người mới bắt đầu: 30 bài học giao tiếp theo tình huống để áp dụng ngay vào thực tế, cùng 21 bài học ngữ âm giúp bạn làm quen với tiếng Anh.', 'Mới bắt đầu', null, '#7c3aed', '#ede9fe'],
  ['Effortless English Foundation', 'Phản xạ tiếng Anh cho người mất gốc', 'Khóa học nền tảng cho người mới bắt đầu hoặc mất gốc: 15 chủ đề với 45 hoạt động luyện nói giúp cải thiện khả năng nghe và phản xạ tiếng Anh chỉ sau 90 ngày (3 tháng).', 'Mất gốc', null, '#0369a1', '#e0f2fe'],
  ['Flow English', 'Phản xạ tiếng Anh trôi chảy', 'Bao gồm 20 chủ đề, 80 bài học giúp bạn cải thiện khả năng nghe, nhận diện âm và phản xạ một cách trôi chảy chỉ sau 20 tuần học.', 'A1+ (Sơ cấp)', 'Flow English', '#16a34a', '#dcfce7'],
  ['Original English', 'Phản xạ tiếng Anh tự động', 'Bao gồm 36 chủ đề, 140 bài học giúp bạn cải thiện khả năng nghe, nhận diện âm và phản xạ một cách tự động chỉ sau 36 tuần học.', 'A2+ (Sơ trung cấp)', 'Original Course', '#2563eb', '#dbeafe'],
  ['Power English', 'Phản xạ tiếng Anh tự tin', 'Bao gồm 30 chủ đề, 120 bài học giúp bạn cải thiện khả năng nghe, nhận diện âm và phản xạ một cách tự tin khi giao tiếp chỉ sau 30 tuần học.', 'B1+ (Trung cấp)', 'Power English', '#ea580c', '#ffedd5'],
  ['Pronunciation English', 'Luyện phát âm tiếng Anh chuẩn Mỹ', 'Bao gồm 20 chủ điểm, 60 bài học về kỹ thuật phát âm theo chuẩn IPA giúp bạn chuẩn hóa và phản xạ tiếng Anh tự tin khi giao tiếp chỉ sau 20 tuần học.', 'B1+ (Trung cấp)', null, '#db2777', '#fce7f3'],
  ['Real English', 'Tiếng Anh giao tiếp thực tế', 'Bao gồm 30 chủ điểm, 120 bài học về các tình huống giao tiếp thực tế của người bản ngữ Mỹ, giúp bạn cải thiện khả năng nghe, nhận diện âm và phản xạ tự tin chỉ sau 30 tuần học.', 'B2+ (Cao trung cấp)', null, '#b45309', '#fef3c7'],
  ['Succeed English', 'Tiếng Anh để thành công', 'Bao gồm 10 chủ điểm, 30 bài học về chuyên đề tư duy trong kinh doanh, giúp bạn phản xạ tự tin khi giao tiếp chỉ sau 10 tuần học.', 'B2+ (Trung cao cấp)', null, '#4338ca', '#e0e7ff'],
  ['Business English Conversations', 'Tiếng Anh giao tiếp trong kinh doanh', 'Bao gồm 16 chủ điểm, 60 bài học về chuyên đề tư duy trong kinh doanh, giúp bạn phản xạ tự tin khi giao tiếp chỉ sau 16 tuần học.', 'C+ (Cao cấp)', 'Business English', '#334155', '#e2e8f0'],
]

const ACT_TEXT = {
  main:      ['🎧', '#dbeafe', 'Luyện nghe',            'Main Audio'],
  ms:        ['✅', '#dcfce7', 'Hoàn thành Mini-Story',  'Mini-Story'],
  vocab:     ['📘', '#e0f2fe', 'Học từ vựng mới',       'Từ vựng'],
  patterns:  ['🗣', '#fce7f3', 'Luyện mẫu câu',         'Key Structures'],
  practice:  ['🎯', '#fef3c7', 'Hoàn thành bài tập',    'Luyện tập'],
  completed: ['🏆', '#dcfce7', 'Hoàn thành bài học',    'Cả bài'],
}

export default function dashboardView({ app, lessons }) {
  const s       = getState()
  const current = nextLesson(lessons, s)
  const done    = current ? (s.lessons[current.slug]?.done || {}) : {}
  const started = current && Object.keys(done).length > 0
  const completedCount = lessons.filter(l => lessonProgress(l.slug, s).completed).length
  const pct     = lessons.length ? Math.round(completedCount / lessons.length * 100) : 0
  const todayMin = dayMinutes(s)
  const wordsLearned = lessons.filter(l => s.lessons[l.slug]?.done?.vocab).reduce((n, l) => n + (l.vocab || []).length, 0)
  const practiced    = lessons.filter(l => s.lessons[l.slug]?.done?.practice).length
  const path         = current?.ms_audio ? PATH : PATH.filter(([key]) => key !== 'ms')   // some lessons have no Mini-Story
  const firstOpen    = path.findIndex(([, , , flag]) => !done[flag])
  const openLesson   = l => `navigate('${BASE}/lesson/${encodeURIComponent(l.slug)}')`
  const stepGo = ([key]) => key === 'practice'
    ? `navigate('${BASE}/practice?lesson=${encodeURIComponent(current.slug)}')`
    : `navigate('${BASE}/lesson/${encodeURIComponent(current.slug)}?tab=${key}')`

  shell(app, '', `
    <style>
      .ee-dash{grid-template-columns:minmax(0,1fr) 340px}
      .ee-step{flex:1;min-width:0;text-align:center;cursor:pointer;padding:6px 4px;border-radius:12px;position:relative}
      .ee-step:hover{background:#f8fafc}
      .ee-step+.ee-step::before{content:'';position:absolute;top:24px;right:calc(50% + 24px);width:calc(100% - 48px);border-top:2px dotted #cbd5e1}
      .ee-row{display:flex;align-items:center;gap:12px;padding:12px 0;border-top:1px solid #f1f5f9;font-size:14px}
      @media (max-width:1300px){ .ee-dash{grid-template-columns:minmax(0,1fr)} }
      @media (max-width:640px){ .ee-step small{display:none} .ee-step>div:nth-child(2){font-size:11px !important} .ee-step>div:first-child{width:32px !important;height:32px !important;font-size:13px !important} .ee-step+.ee-step::before{top:20px} .ee-hero-art{display:none} .ee-hero-text{max-width:none !important;padding:22px !important} .ee-hero-text .ee-h{font-size:30px !important} .ee-next{flex-direction:column} .ee-next>div:first-child{width:100% !important} }
    </style>
    <div class="ee-grid ee-dash" style="align-items:start">
      <div class="ee-grid" style="grid-template-columns:minmax(0,1fr)">

        <!-- Hero -->
        <div class="ee-card" style="position:relative;overflow:hidden;padding:0;min-height:220px;display:flex;background:linear-gradient(90deg,#eff6ff,#f8fbff 55%,#fff)">
          <div class="ee-hero-text" style="position:relative;z-index:1;padding:24px 28px;max-width:56%">
            <span style="display:inline-block;border:1px solid #93c5fd;color:var(--o2);background:#fff;font-size:12px;font-weight:600;padding:3px 12px;border-radius:999px">Chương trình học</span>
            <div class="ee-h" style="font-size:32px;line-height:1.1;margin:12px 0 6px">Effortless English</div>
            <div style="font-size:18px;font-weight:600;color:var(--ink)">Nghe tự nhiên. Hiểu dễ dàng. Nói tự tin.</div>
            <div style="font-size:14px;color:var(--ink2);line-height:1.6;margin:12px 0 20px">Học tiếng Anh theo phương pháp của A.J. Hoge –<br>tập trung vào nghe hiểu, phản xạ và giao tiếp thực tế.</div>
            ${current ? `<button class="ee-btn" style="border-radius:999px;padding:12px 24px" onclick="${openLesson(current)}">${started ? 'Tiếp tục học' : 'Bắt đầu học ngay'} ›</button>` : ''}
          </div>
          <div class="ee-hero-art" style="position:absolute;right:0;top:0;bottom:0;width:48%">
            ${current?.cover ? `
              ${art(current, { id: 'hero', w: 900 })}
              <div style="position:absolute;inset:0;background:linear-gradient(90deg,#f3f8ff 0,rgba(243,248,255,.55) 22%,rgba(243,248,255,0) 45%)"></div>
              <div style="position:absolute;right:16px;bottom:16px;background:rgba(255,255,255,.92);border-radius:12px;padding:8px 12px;font-size:13px;box-shadow:0 6px 18px rgba(15,23,42,.15)">
                <div class="ee-muted" style="font-size:11px">${started ? 'Đang học' : 'Bài tiếp theo'}</div><b>Bài ${current.lesson_no} · ${esc(current.title)}</b></div>` : `
              ${heroArt()}
              <div style="position:absolute;left:16%;bottom:14%;width:96px;height:96px;border-radius:50%;background:#fff;box-shadow:0 10px 30px rgba(37,99,235,.18);
                display:flex;align-items:center;justify-content:center;font-size:46px">🎧</div>`}
          </div>
        </div>

        <!-- Path + next lesson -->
        <div class="ee-card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px">
            <div class="ee-h" style="font-size:18px">Lộ trình học Effortless English</div>
            <span class="ee-link" onclick="navigate('${BASE}/lessons')">Xem tất cả ›</span>
          </div>
          ${current ? `
            <div style="display:flex;margin-bottom:20px">
              ${path.map((step, i) => {
                const [, title, sub, flag, bg, fg] = step
                const isDone = !!done[flag], isNow = i === firstOpen
                return `<div class="ee-step" onclick="${stepGo(step)}" title="${title} – ${sub}">
                  <div style="width:40px;height:40px;margin:4px auto 8px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;position:relative;z-index:1;
                    background:${isDone ? '#16a34a' : isNow ? fg : bg};color:${isDone || isNow ? '#fff' : fg};${isNow ? `box-shadow:0 0 0 5px ${bg}` : ''}">${isDone ? '✓' : i + 1}</div>
                  <div style="font-size:14px;font-weight:600;color:${isNow ? fg : 'var(--ink)'}">${title}</div>
                  <small class="ee-muted" style="display:block">${sub}</small>
                </div>`
              }).join('')}
            </div>

            <div class="ee-next" style="display:flex;gap:20px;border:1px solid var(--line);border-radius:14px;padding:14px;align-items:center">
              <div style="position:relative;width:210px;height:150px;border-radius:12px;overflow:hidden;flex-shrink:0">${art(current, { id: 'next', w: 440 })}</div>
              <div style="flex:1;min-width:0">
                <span style="display:inline-block;background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;font-size:11px;font-weight:600;padding:2px 10px;border-radius:999px">Bài học tiếp theo</span>
                <div class="ee-h" style="font-size:20px;margin:6px 0">Bài ${current.lesson_no} – ${esc(current.title)}</div>
                <div class="ee-muted" style="font-size:13px;display:flex;gap:14px;flex-wrap:wrap">
                  <span>📖 ${(current.vocab || []).length} từ vựng</span><span>🎧 Main Audio${current.ms_audio ? ' + Mini-Story' : ''}</span><span>📶 ${levelLabel(current.level)}</span>
                </div>
                ${current.description ? `<div style="font-size:14px;color:var(--ink2);line-height:1.6;margin-top:10px">${esc(current.description)}</div>` : ''}
                <button class="ee-btn" style="border-radius:999px;margin-top:12px" onclick="${openLesson(current)}">Vào học ngay →</button>
              </div>
            </div>` : `<div class="ee-muted">Chưa có bài học</div>`}
        </div>

        <!-- Featured courses -->
        <div class="ee-card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
            <div class="ee-h" style="font-size:18px">Các khóa học nổi bật</div>
          </div>
          <div class="ee-grid" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px">
            ${course('🌄', 'linear-gradient(135deg,#1e40af,#60a5fa)', 'Effortless English', 'Tự nhiên • Giao tiếp • Thực tế',
              `<div style="display:flex;align-items:center;gap:8px;margin-top:10px"><div class="ee-bar" style="flex:1"><div style="width:${pct}%"></div></div>
                <span class="ee-muted">${completedCount}/${lessons.length} bài</span></div>`, `navigate('${BASE}/lessons')`, 'Đang học')}
            ${course('🔤', 'linear-gradient(135deg,#1d4ed8,#93c5fd)', 'Bảng IPA', '44 âm • Video phát âm',
              `<div class="ee-link" style="margin-top:10px">Học phát âm →</div>`, `navigate('/english/ipa')`)}
            ${course('🎯', 'linear-gradient(135deg,#d97706,#fcd34d)', 'Luyện tập', 'Nghe – nói giao tiếp',
              `<div class="ee-link" style="margin-top:10px">Luyện ngay →</div>`, `navigate('/english/practice')`)}
          </div>
        </div>

        <!-- Whole programme -->
        <div class="ee-card">
          <div class="ee-h" style="font-size:18px">500+ bài học luyện nói tiếng Anh theo cấp độ</div>
          <div class="ee-muted" style="margin:4px 0 16px">Từ chương trình Effortless English của A.J. Hoge — chọn khóa phù hợp với trình độ của bạn.</div>
          <div class="ee-grid" style="grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px">
            ${PROGRAMS.map(p => program(p, lessons)).join('')}
          </div>
        </div>
      </div>

      <!-- Right column -->
      <div class="ee-grid" style="grid-template-columns:minmax(0,1fr)">
        <div class="ee-card">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div class="ee-h" style="font-size:17px">Tiến độ học của bạn</div>
            <span class="ee-link" onclick="navigate('${BASE}/progress')">Xem chi tiết</span>
          </div>
          <div style="display:flex;align-items:center;gap:20px;margin:18px 0 8px">
            ${ring(pct)}
            <div><div style="font-size:15px;font-weight:600">Hoàn thành khóa học</div>
              <div style="font-size:15px;color:var(--ink2);margin-top:2px">${completedCount} / ${lessons.length} bài học</div></div>
          </div>
          <div class="ee-row"><span>⏱️</span><span style="flex:1">Thời gian học hôm nay</span><b>${todayMin} / ${DAILY_GOAL_MIN} phút</b></div>
          <div class="ee-row"><span>📘</span><span style="flex:1">Từ vựng đã học</span><b>${wordsLearned} từ</b></div>
          <div class="ee-row"><span>✅</span><span style="flex:1">Bài tập hoàn thành</span><b>${practiced} / ${lessons.length}</b></div>
        </div>

        <div class="ee-card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <div class="ee-h" style="font-size:17px">Hoạt động gần đây</div>
            <span class="ee-link" onclick="navigate('${BASE}/progress')">Xem tất cả</span>
          </div>
          ${recent(s, lessons)}
        </div>

        <div class="ee-card" style="background:linear-gradient(135deg,#eff6ff,#dbeafe);border-color:#bfdbfe;position:relative;overflow:hidden">
          <div style="display:flex;gap:12px">
            <span style="font-size:24px">🚀</span>
            <div>
              <div class="ee-h" style="font-size:17px;line-height:1.3">Học mỗi ngày<br>để tiến bộ hơn</div>
              <div style="font-size:13px;color:var(--ink2);margin:8px 0 14px;line-height:1.5">Học đủ ${DAILY_GOAL_MIN} phút theo 4 bước mỗi ngày<br>để giữ chuỗi 🔥 ${streak(s)} ngày của bạn!</div>
              <button class="ee-btn ghost" style="border-radius:999px;border-color:#93c5fd;color:var(--o2);padding:8px 18px" onclick="navigate('${BASE}/guide')">Xem lộ trình 45 phút →</button>
            </div>
          </div>
          <div style="position:absolute;right:14px;bottom:8px;font-size:44px;opacity:.9">🌱</div>
        </div>
      </div>
    </div>`)
}

function ring(pct) {
  const r = 40, c = 2 * Math.PI * r
  return `<svg width="104" height="104" viewBox="0 0 104 104" role="img" aria-label="Hoàn thành ${pct}%">
    <circle cx="52" cy="52" r="${r}" fill="none" stroke="#e2e8f0" stroke-width="10"/>
    <circle cx="52" cy="52" r="${r}" fill="none" stroke="#2563eb" stroke-width="10" stroke-linecap="round"
      stroke-dasharray="${c * pct / 100} ${c}" transform="rotate(-90 52 52)"/>
    <text x="52" y="59" text-anchor="middle" font-size="22" font-weight="700" fill="#0f172a" font-family="Space Grotesk, sans-serif">${pct}%</text>
  </svg>`
}

function course(icon, bg, title, sub, footer, onclick, tag) {
  return `<div onclick="${onclick}" style="border:1px solid var(--line);border-radius:14px;padding:12px;cursor:pointer;display:flex;gap:12px;align-items:flex-start;background:#fff">
    <div style="position:relative;width:70px;height:70px;border-radius:10px;background:${bg};display:flex;align-items:center;justify-content:center;font-size:30px;flex-shrink:0">${icon}
      ${tag ? `<span style="position:absolute;left:4px;bottom:4px;background:var(--accent);color:#fff;font-size:9px;font-weight:600;padding:1px 5px;border-radius:4px">${tag}</span>` : ''}</div>
    <div style="flex:1;min-width:0">
      <div style="font-size:14px;font-weight:600">${title}</div>
      <div class="ee-muted">${sub}</div>
      ${footer}
    </div>
  </div>`
}

function program([name, sub, desc, level, courseName, fg, bg], lessons) {
  const count = courseName ? lessons.filter(l => l.course === courseName).length : 0
  return `<div ${count ? `onclick="navigate('${BASE}/lessons')"` : ''} style="border:1px solid var(--line);border-top:4px solid ${fg};border-radius:14px;padding:14px 16px;background:#fff;display:flex;flex-direction:column;${count ? 'cursor:pointer' : ''}">
    <div style="font-size:15px;font-weight:700;color:${fg}">${esc(name)}</div>
    <div style="font-size:14px;font-weight:600;margin:2px 0 8px">${esc(sub)}</div>
    <div style="font-size:13px;color:var(--ink2);line-height:1.55;flex:1">${esc(desc)}</div>
    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:12px;flex-wrap:wrap">
      <span style="background:${bg};color:${fg};font-size:11px;font-weight:600;padding:3px 10px;border-radius:999px">${esc(level)}</span>
      ${count ? `<span class="ee-link" style="font-size:13px">${count} bài đã có · Vào học →</span>`
              : `<span class="ee-muted" style="font-size:12px">Sắp ra mắt</span>`}
    </div>
  </div>`
}

function recent(s, lessons) {
  const log = (s.log || []).slice(0, 4)
  if (!log.length) return `<div class="ee-muted" style="padding:10px 0">Chưa có hoạt động nào — bắt đầu bài đầu tiên nhé!</div>`
  return log.map(e => {
    const [icon, bg, title, sub] = ACT_TEXT[e.act] || ACT_TEXT.main
    const l = lessons.find(x => x.slug === e.slug)
    return `<div style="display:flex;gap:12px;padding:10px 0;border-top:1px solid #f1f5f9">
      <div style="width:34px;height:34px;border-radius:50%;background:${bg};display:flex;align-items:center;justify-content:center;flex-shrink:0">${icon}</div>
      <div style="min-width:0">
        <div style="font-size:14px;font-weight:600">${title}</div>
        <div class="ee-muted">${sub}${l ? ` • Bài ${l.lesson_no} · ${esc(l.title)}` : ''}</div>
        <div class="ee-muted" style="font-size:11px;margin-top:2px">${timeAgo(e.at)}</div>
      </div>
    </div>`
  }).join('')
}

// Light lakeside landscape for the hero (no external image)
function heroArt() {
  return `<svg viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice" style="position:absolute;inset:0;width:100%;height:100%">
    <defs>
      <linearGradient id="heroSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#dbeafe"/><stop offset=".7" stop-color="#eff6ff"/><stop offset="1" stop-color="#fef3c7"/></linearGradient>
      <linearGradient id="heroFade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f8fbff"/><stop offset=".25" stop-color="#f8fbff" stop-opacity="0"/></linearGradient>
    </defs>
    <rect width="400" height="260" fill="url(#heroSky)"/>
    <circle cx="215" cy="70" r="20" fill="#fde68a" opacity=".9"/>
    <path d="M0 150 L60 110 L110 135 L170 80 L230 128 L280 100 L340 140 L400 115 V260 H0Z" fill="#bfdbfe"/>
    <path d="M0 165 L80 135 L150 160 L220 128 L300 158 L400 140 V260 H0Z" fill="#93c5fd" opacity=".8"/>
    <rect y="170" width="400" height="40" fill="#e0f2fe"/>
    <path d="M0 205 Q100 185 200 205 T400 200 V260 H0Z" fill="#86c5a1"/>
    <path d="M0 230 Q120 210 240 232 T400 225 V260 H0Z" fill="#5fa57e"/>
    <rect width="400" height="260" fill="url(#heroFade)"/>
  </svg>`
}
