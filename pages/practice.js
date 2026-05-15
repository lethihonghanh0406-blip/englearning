/*
-- Run in Supabase SQL editor:

create table if not exists youtube_cache (
  id          bigserial primary key,
  youtube_id  text unique not null,
  title       text not null default '',
  thumbnail   text not null default '',
  channel     text not null default '',
  subtitles   jsonb not null default '[]',
  sub_count   int  not null default 0,
  views       int  not null default 0,
  level       text,
  created_at  timestamptz not null default now()
);

alter table youtube_cache enable row level security;

create policy "public read youtube_cache"
  on youtube_cache for select
  to anon
  using (true);

create policy "public insert youtube_cache"
  on youtube_cache for insert
  to anon
  with check (true);

create policy "public update youtube_cache"
  on youtube_cache for update
  to anon
  using (true)
  with check (true);

-- Optional: helper function to safely increment views
create or replace function increment_youtube_views(vid text)
returns void language sql security definer as $$
  update youtube_cache set views = views + 1 where youtube_id = vid;
$$;
*/

const SUPA_URL = 'https://trehfvxlqfshfhcapqca.supabase.co'
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyZWhmdnhscWZzaGZoY2FwcWNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxMTA0MTMsImV4cCI6MjA5MjY4NjQxM30.bn_zpEq2VUbkFyU-yOcK4UbeGQINAZlvgBYOwzJcePk'

const LEVEL_STYLES = {
  A1: { bg: '#dcfce7', color: '#166534' },
  A2: { bg: '#bbf7d0', color: '#14532d' },
  B1: { bg: '#fef3c7', color: '#92400e' },
  B2: { bg: '#fed7aa', color: '#9a3412' },
  C1: { bg: '#fee2e2', color: '#dc2626' },
  C2: { bg: '#fecaca', color: '#b91c1c' },
}

export default async function practicePage(app) {
  let videos       = []
  let activeLevel  = 'All'
  const levels     = ['All', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']

  // Show skeleton while loading
  renderSkeleton()

  // Load from Supabase
  try {
    const res = await fetch(
      `${SUPA_URL}/rest/v1/youtube_cache?select=id,youtube_id,title,thumbnail,channel,sub_count,views,level,created_at&order=created_at.desc&limit=50`,
      { headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY } }
    )
    videos = res.ok ? (await res.json()) : []
  } catch (_) {
    videos = []
  }

  render()

  function getFiltered() {
    if (activeLevel === 'All') return videos
    return videos.filter(v => v.level === activeLevel)
  }

  function renderSkeleton() {
    app.innerHTML = `
      <style>
        @keyframes shimmer {
          0%   { background-position: -400px 0; }
          100% { background-position:  400px 0; }
        }
        .skeleton-box {
          background: linear-gradient(90deg, #1e293b 25%, #263348 50%, #1e293b 75%);
          background-size: 400px 100%;
          animation: shimmer 1.4s infinite;
          border-radius: 8px;
        }
      </style>
      <div style="padding:32px 24px;background:#0f172a;min-height:100vh">
        <div style="max-width:1200px;margin:0 auto">
          <div style="margin-bottom:32px">
            <div class="skeleton-box" style="height:36px;width:280px;margin-bottom:10px"></div>
            <div class="skeleton-box" style="height:18px;width:420px"></div>
          </div>
          <div style="display:flex;gap:8px;margin-bottom:28px">
            ${Array.from({length:7}).map(()=>`<div class="skeleton-box" style="height:34px;width:56px;border-radius:20px"></div>`).join('')}
          </div>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:20px">
            ${Array.from({length:8}).map(()=>`
              <div style="background:#1e293b;border-radius:12px;overflow:hidden">
                <div class="skeleton-box" style="width:100%;padding-top:56.25%;"></div>
                <div style="padding:12px">
                  <div class="skeleton-box" style="height:16px;margin-bottom:8px"></div>
                  <div class="skeleton-box" style="height:16px;width:70%;margin-bottom:12px"></div>
                  <div class="skeleton-box" style="height:13px;width:50%"></div>
                </div>
              </div>`).join('')}
          </div>
        </div>
      </div>`
  }

  function render() {
    const filtered = getFiltered()

    app.innerHTML = `
      <style>
        .prac-card {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 12px;
          overflow: hidden;
          cursor: pointer;
          transition: transform .15s, border-color .15s, box-shadow .15s;
        }
        .prac-card:hover {
          transform: translateY(-3px);
          border-color: #2563eb;
          box-shadow: 0 8px 24px rgba(37,99,235,.25);
        }
        .prac-thumb {
          width: 100%;
          padding-top: 56.25%;
          position: relative;
          background: #0f172a;
          overflow: hidden;
        }
        .prac-thumb img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .prac-title {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          font-size: 14px;
          font-weight: 600;
          color: #f1f5f9;
          line-height: 1.45;
          margin-bottom: 6px;
        }
        .prac-level-pill {
          position: absolute;
          top: 8px;
          right: 8px;
          font-size: 11px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 20px;
        }
        .prac-filter-pill {
          padding: 6px 16px;
          border-radius: 20px;
          border: none;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          transition: background .12s, color .12s;
        }
      </style>
      <div style="padding:32px 24px;background:#0f172a;min-height:100vh">
        <div style="max-width:1200px;margin:0 auto">

          <!-- Header -->
          <div style="margin-bottom:28px">
            <h1 style="font-size:28px;font-weight:800;color:#f1f5f9;margin:0 0 8px;font-family:'Space Grotesk',sans-serif">
              Luyện Shadowing
            </h1>
            <p style="color:#64748b;font-size:15px;margin:0">
              Khám phá video YouTube từ cộng đồng — bấm để luyện shadowing ngay
            </p>
          </div>

          <!-- Level filter pills -->
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:28px">
            ${levels.map(lv => {
              const isActive = lv === activeLevel
              const st = LEVEL_STYLES[lv]
              return `<button class="prac-filter-pill" onclick="pracFilter('${lv}')"
                style="background:${isActive ? (st ? st.bg : '#2563eb') : '#1e293b'};
                  color:${isActive ? (st ? st.color : '#fff') : '#94a3b8'};
                  border:1px solid ${isActive ? (st ? st.color : '#2563eb') : '#334155'}">
                ${lv}
              </button>`
            }).join('')}
          </div>

          <!-- Grid or empty state -->
          ${filtered.length === 0
            ? `<div style="text-align:center;padding:80px 20px;color:#64748b">
                <div style="font-size:48px;margin-bottom:16px">📭</div>
                <div style="font-size:17px;font-weight:600;color:#94a3b8;margin-bottom:8px">Chưa có video nào.</div>
                <div style="font-size:14px;margin-bottom:20px">Hãy là người đầu tiên thêm!</div>
                <button onclick="navigate('/english/movies')"
                  style="padding:10px 24px;border-radius:10px;border:none;cursor:pointer;
                    background:#2563eb;color:white;font-size:14px;font-weight:700">
                  ➜ Thêm video tại Movies
                </button>
              </div>`
            : `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:20px">
                ${filtered.map(v => buildCard(v)).join('')}
              </div>`}
        </div>
      </div>`

    // Re-attach filter handler
    window.pracFilter = (lv) => {
      activeLevel = lv
      render()
    }
  }

  function buildCard(v) {
    const st      = v.level ? (LEVEL_STYLES[v.level] || null) : null
    const levelBadge = st
      ? `<div class="prac-level-pill" style="background:${st.bg};color:${st.color}">${v.level}</div>`
      : ''
    const views    = typeof v.views === 'number' ? v.views.toLocaleString() : '0'
    const subCount = typeof v.sub_count === 'number' ? v.sub_count : 0
    const thumb    = v.thumbnail || `https://img.youtube.com/vi/${v.youtube_id}/hqdefault.jpg`
    const title    = (v.title || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const channel  = (v.channel || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')

    return `
      <div class="prac-card" onclick="navigate('/english/movies?v=${v.youtube_id}')">
        <div class="prac-thumb">
          <img src="${thumb}" alt="${title}" loading="lazy"
            onerror="this.src='https://img.youtube.com/vi/${v.youtube_id}/hqdefault.jpg'">
          ${levelBadge}
        </div>
        <div style="padding:12px 14px">
          <div class="prac-title" title="${title}">${title || v.youtube_id}</div>
          ${channel ? `<div style="font-size:12px;color:#64748b;margin-bottom:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${channel}</div>` : ''}
          <div style="display:flex;gap:10px;align-items:center">
            <span style="font-size:12px;color:#475569">
              <span style="color:#64748b">&#128065;</span> ${views} lượt
            </span>
            <span style="font-size:12px;color:#475569">
              <span style="color:#64748b">&#128221;</span> ${subCount} subtitles
            </span>
          </div>
        </div>
      </div>`
  }

  window.pracFilter = (lv) => {
    activeLevel = lv
    render()
  }
}
