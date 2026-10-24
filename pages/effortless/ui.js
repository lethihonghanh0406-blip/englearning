// Shared layout + helpers for the Effortless English section
import { BASE, getUser, streak, dayMinutes, DAILY_GOAL_MIN } from './store.js'

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]))
}
export function fmt(sec) {
  sec = Math.max(0, Math.floor(sec || 0))
  return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`
}
export function fmtDuration(sec) {
  const m = Math.round(sec / 60)
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m} phút`
}

const NAV = [
  ['',            '🏠', 'Tổng quan'],
  ['/guide',      '🧭', 'Cách học'],
  ['/lessons',    '📚', 'Bài học'],
  ['/vocabulary', '🔤', 'Từ vựng'],
  ['/practice',   '🎯', 'Luyện tập'],
  ['/progress',   '📊', 'Tiến độ'],
  ['/notes',      '📝', 'Ghi chú'],
]

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@600&display=swap');
  #navbar{display:none}   /* this section has its own top bar; the rule leaves with the page */
  html{zoom:1 !important} /* index.html zooms the site to 112.5%; this section is designed at 100% */
  .ee{--o:#2563eb;--o2:#1d4ed8;--o-soft:#e8f0fe;--bg:#f8faff;--card:#fff;--line:#e2e8f0;--ink:#0f172a;--ink2:#475569;--mute:#64748b;--accent:#f97316;
    font-family:'Inter',sans-serif;color:var(--ink);background:var(--bg);min-height:100vh}
  .ee *{box-sizing:border-box}
  .ee-top{height:60px;background:#fff;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:24px;padding:0 24px;position:sticky;top:0;z-index:30}
  .ee-brand{display:flex;align-items:center;gap:10px;cursor:pointer;min-width:200px}
  .ee-brand img{height:40px;display:block}
  .ee-brand small{font-size:11px;font-weight:600;color:var(--o2);background:var(--o-soft);padding:3px 8px;border-radius:6px}
  .ee-search{flex:1;max-width:460px;display:flex;align-items:center;gap:8px;background:#f8fafc;border:1px solid var(--line);border-radius:999px;padding:8px 16px}
  .ee-search input{border:none;background:none;outline:none;flex:1;font-size:13px;color:var(--ink)}
  .ee-fire{margin-left:auto;display:flex;align-items:center;gap:8px;padding:6px 12px;border-radius:999px;border:1px solid var(--line);background:#fff;font-size:13px;font-weight:600;color:var(--ink2);cursor:pointer;white-space:nowrap}
  .ee-fire:hover{background:#f8fafc}
  .ee-fire.lit{border-color:#fdba74;background:#fff7ed;color:#c2410c}
  .ee-user{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:600;cursor:pointer}
  .ee-avatar{width:34px;height:34px;border-radius:50%;background:#1e3a5f;color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px}
  .ee-body{display:flex;min-height:calc(100vh - 60px)}
  .ee-side{width:210px;flex-shrink:0;padding:18px 12px;display:flex;flex-direction:column;gap:4px;background:#ffffff;position:sticky;top:60px;align-self:flex-start}
  .ee-body{background:linear-gradient(90deg,#ffffff 210px,var(--line) 210px,var(--line) 211px,transparent 211px)}
  .ee-nav{display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:10px;cursor:pointer;font-size:14px;color:var(--ink2);font-weight:500;white-space:nowrap}
  .ee-nav:hover{background:#f1f5f9}
  .ee-nav.on{background:var(--o-soft);color:var(--o2);font-weight:600}
  .ee-side-card{margin-top:24px;border-radius:14px;overflow:hidden;background:linear-gradient(180deg,#eff6ff,#dbeafe);font-size:12px;color:var(--ink2);text-align:center;padding:16px 12px 0}
  .ee-hand{font-family:'Caveat',cursive;font-weight:600;color:var(--ink)}
  .ee-main{flex:1;min-width:0;padding:20px 24px 100px;max-width:1480px;width:100%;margin:0 auto}
  .ee-card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px}
  .ee-h{font-family:'Space Grotesk',sans-serif;font-weight:700;color:var(--ink)}
  .ee-btn{white-space:nowrap;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:10px 20px;border-radius:10px;border:none;cursor:pointer;font-size:14px;font-weight:600;background:var(--o);color:#fff;box-shadow:0 4px 12px rgba(37,99,235,.25)}
  .ee-btn:hover{background:var(--o2)}
  .ee-btn.ghost{background:#fff;color:var(--ink2);border:1px solid var(--line);box-shadow:none}
  .ee-btn:disabled{opacity:.45;cursor:default}
  .ee-pill{padding:7px 16px;border-radius:999px;border:1px solid var(--line);background:#fff;cursor:pointer;font-size:13px;font-weight:600;color:var(--ink2)}
  .ee-pill.on{background:var(--o);border-color:var(--o);color:#fff}
  .ee-bar{height:6px;border-radius:3px;background:#e2e8f0;overflow:hidden}
  .ee-bar>div{height:100%;background:var(--o);border-radius:3px}
  .ee-link{color:var(--o2);font-size:13px;font-weight:600;cursor:pointer}
  .ee-muted{color:var(--mute);font-size:12px}
  .ee-line{display:flex;gap:12px;align-items:flex-start;padding:10px 12px;border-radius:10px;cursor:pointer;border:1px solid transparent}
  .ee-line:hover{background:#f8fafc}
  .ee-line.ee-active{background:var(--o-soft);border-color:#bfdbfe}
  .ee-play-dot{width:22px;height:22px;border-radius:50%;background:var(--o-soft);color:var(--o2);display:flex;align-items:center;justify-content:center;font-size:9px;flex-shrink:0;margin-top:1px}
  .ee-hidden{filter:blur(5px);user-select:none}
  .ee-grid{display:grid;gap:18px}
  @media (max-width:900px){
    .ee-side{position:static;width:auto;height:auto;flex-direction:row;overflow-x:auto;border-right:none;border-bottom:1px solid var(--line);padding:8px}
    .ee-side-card{display:none}
    .ee-body{flex-direction:column;background:none}
    .ee-side{top:0;z-index:20;align-self:stretch}
    .ee-top{gap:10px;padding:0 12px}
    .ee-brand img{height:30px}
    .ee-search{min-width:0;padding:7px 12px}.ee-search input{min-width:0;width:100%}
    .ee-brand{min-width:0}.ee-brand>div:last-child{display:none}
    .ee-top .ee-btn{padding:8px 12px;font-size:13px}
    .ee-quote{display:none}
    .ee-fire .ee-fire-min{display:none}
    .ee-hero{padding:24px 20px !important}
    .ee-hero .ee-h{font-size:26px !important}
    .ee-main{padding:16px 16px 120px}
    .ee-grid{grid-template-columns:minmax(0,1fr) !important}
  }
`

export function shell(app, active, content) {
  const user = getUser()
  const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || ''
  app.innerHTML = `
    <style>${CSS}</style>
    <div class="ee">
      <div class="ee-top">
        <div class="ee-brand" onclick="navigate('${BASE}')">
          <img src="https://trehfvxlqfshfhcapqca.supabase.co/storage/v1/object/public/avatars/logo-full.png" alt="LearnLang">
          <div><small>Effortless English</small></div>
        </div>
        <form class="ee-search" onsubmit="event.preventDefault();navigate('${BASE}/vocabulary?q='+encodeURIComponent(this.q.value))">
          <span style="color:var(--mute)">🔍</span>
          <input name="q" placeholder="Tìm từ vựng, nghĩa, câu ví dụ…" autocomplete="off">
        </form>
        ${user
          ? `${fire()}<div class="ee-user" onclick="navigate('/')" title="Về trang chính LearnLang">
               <div class="ee-avatar">${esc(name[0]?.toUpperCase() || 'U')}</div><span>${esc(name)}</span></div>`
          : `${fire()}<button class="ee-btn ghost" onclick="sessionStorage.setItem('authReturnPath', location.pathname);location.href='/login.html'">Đăng nhập</button>`}
      </div>
      <div class="ee-body">
        <div class="ee-side">
          ${NAV.map(([p, icon, label]) => `
            <div class="ee-nav ${active === p ? 'on' : ''}" onclick="navigate('${BASE}${p}')"><span>${icon}</span>${label}</div>`).join('')}
          <div class="ee-nav" onclick="navigate('/')" style="margin-top:8px"><span>←</span>Trang LearnLang</div>
          <div class="ee-side-card">
            <div class="ee-hand" style="font-size:22px;line-height:1.2;transform:rotate(-4deg);margin:4px 0 2px">Better English<br>Brighter Future</div>
            <div style="color:var(--accent);font-size:14px;margin-bottom:8px">♥</div>
            ${hills()}
          </div>
        </div>
        <div class="ee-main">${content}</div>
      </div>
    </div>`
}

// Streak badge: 🔥 days in a row with the full daily goal + today's minutes
function fire() {
  const n = streak(), min = dayMinutes()
  return `<div class="ee-fire ${min >= DAILY_GOAL_MIN ? 'lit' : ''}" onclick="navigate('${BASE}/guide')"
    title="Học đủ ${DAILY_GOAL_MIN} phút mỗi ngày để giữ chuỗi">🔥 ${n}<span class="ee-fire-min" style="font-weight:500;color:var(--mute)">· ${Math.min(min, DAILY_GOAL_MIN)}/${DAILY_GOAL_MIN} phút</span></div>`
}

function hills() {
  return `<svg viewBox="0 0 200 70" style="display:block;width:100%">
    <path d="M0 45 Q40 20 80 40 T160 32 T200 38 V70 H0Z" fill="#a3c9a8"/>
    <path d="M0 55 Q50 35 100 52 T200 48 V70 H0Z" fill="#7fb38a"/>
    <circle cx="160" cy="18" r="9" fill="#93c5fd"/></svg>`
}

// Sunset + volcano scenery used for the hero and lesson art (no external images)
export function scene(seed = 0, opts = {}) {
  const skies = [
    ['#1e3a8a', '#2563eb', '#93c5fd'],
    ['#0f172a', '#1d4ed8', '#bfdbfe'],
    ['#312e81', '#4f46e5', '#c7d2fe'],
    ['#0c4a6e', '#0284c7', '#bae6fd'],
    ['#1e40af', '#3b82f6', '#dbeafe'],
  ]
  const [a, b, c] = skies[seed % skies.length]
  const id = `sky${seed}${opts.id || ''}`
  return `<svg viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice" style="position:absolute;inset:0;width:100%;height:100%">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${a}"/><stop offset=".6" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></linearGradient></defs>
    <rect width="400" height="220" fill="url(#${id})"/>
    <circle cx="300" cy="62" r="20" fill="#fde68a"/>
    <path d="M0 150 L70 95 L110 120 L170 60 L215 105 L260 80 L330 130 L400 100 V220 H0Z" fill="#1e293b" opacity=".55"/>
    <path d="M0 175 Q80 140 160 165 T320 160 T400 150 V220 H0Z" fill="#14532d" opacity=".75"/>
    <path d="M0 200 Q100 180 200 196 T400 190 V220 H0Z" fill="#052e16" opacity=".85"/>
  </svg>`
}

export function timeAgo(at) {
  const min = Math.floor((Date.now() - at) / 60000)
  if (min < 1)  return 'Vừa xong'
  if (min < 60) return `${min} phút trước`
  const h = Math.floor(min / 60)
  if (h < 24)   return `${h} giờ trước`
  const d = Math.floor(h / 24)
  return d === 1 ? 'Hôm qua' : `${d} ngày trước`
}

export function thumb(lesson, size = 64, radius = 12) {
  return `<div style="position:relative;width:${size}px;height:${size}px;border-radius:${radius}px;overflow:hidden;flex-shrink:0">
    ${scene(lesson?.lesson_no || 0, { id: `t${size}` })}</div>`
}

export function levelLabel(level) {
  return { beginner: 'Beginner', elementary: 'Elementary', intermediate: 'Intermediate', advanced: 'Advanced' }[level] || level || ''
}

export function speak(text, rate = 0.9) {
  if (!text) return
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'en-US'; u.rate = rate
  speechSynthesis.speak(u)
}

export function loading(app) {
  app.innerHTML = `<div style="min-height:100vh;background:#f8faff;display:flex;align-items:center;justify-content:center"><div style="color:#94a3b8;font-size:14px">Đang tải...</div></div>`
}

// Word overlap between a spoken answer and the model answer, 0–100
export function matchScore(heard, expected) {
  const words = s => s.toLowerCase().replace(/[^a-z0-9' ]/g, ' ').split(/\s+/).filter(Boolean)
  const exp = words(expected), got = new Set(words(heard))
  return exp.length ? Math.round(exp.filter(w => got.has(w)).length / exp.length * 100) : 0
}

export function scoreColor(score) {
  return score >= 70 ? '#16a34a' : score >= 40 ? '#d97706' : '#dc2626'
}

export function getSR() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}
