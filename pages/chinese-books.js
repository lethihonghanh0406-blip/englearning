export default function chineseBooksPage(app) {

  const BOOKS = [
    { id: 'sgk3-1', title: 'Tiếng Trung Quốc 3', sub: 'Tập một', grade: 'Lớp 3', color: '#10b981',
      url: 'https://taphuan.nxbgd.vn/tap-huan/doc-sach/sgk-tieng-trung-quoc-3-tap-mot.4882063260#page=0' },
    { id: 'sgk3-2', title: 'Tiếng Trung Quốc 3', sub: 'Tập hai', grade: 'Lớp 3', color: '#10b981',
      url: 'https://taphuan.nxbgd.vn/tap-huan/doc-sach/sgk-tieng-trung-quoc-3-tap-hai.4882067953#page=0' },
    { id: 'sgk4-1', title: 'Tiếng Trung Quốc 4', sub: 'Tập một', grade: 'Lớp 4', color: '#f97316',
      url: 'https://taphuan.nxbgd.vn/tap-huan/doc-sach/sgk-tieng-trung-quoc-4-tap-mot.4881895459#page=0' },
    { id: 'sgk4-2', title: 'Tiếng Trung Quốc 4', sub: 'Tập hai', grade: 'Lớp 4', color: '#f97316',
      url: 'https://taphuan.nxbgd.vn/tap-huan/doc-sach/sgk-tieng-trung-quoc-4-tap-hai.4881900152#page=0' },
    { id: 'sgk5-1', title: 'Tiếng Trung Quốc 5', sub: 'Tập một', grade: 'Lớp 5', color: '#3b82f6',
      url: 'https://taphuan.nxbgd.vn/tap-huan/doc-sach/sgk-tieng-trung-quoc-5-tap-mot.4876005520#page=0' },
    { id: 'sgk5-2', title: 'Tiếng Trung Quốc 5', sub: 'Tập hai', grade: 'Lớp 5', color: '#3b82f6',
      url: 'https://taphuan.nxbgd.vn/tap-huan/doc-sach/sgk-tieng-trung-quoc-5-tap-hai.4876020945#page=0' },
    { id: 'shs6',   title: 'Tiếng Trung Quốc 6', sub: '',        grade: 'Lớp 6', color: '#8b5cf6',
      url: 'https://taphuan.nxbgd.vn/tap-huan/doc-sach/shs-tieng-trung-quoc-6.4537414773#page=0' },
    { id: 'shs7',   title: 'Tiếng Trung Quốc 7', sub: '',        grade: 'Lớp 7', color: '#ec4899',
      url: 'https://taphuan.nxbgd.vn/tap-huan/doc-sach/shs-tieng-trung-quoc-7.4538963155#page=0' },
    { id: 'shs8',   title: 'Tiếng Trung Quốc 8', sub: '',        grade: 'Lớp 8', color: '#14b8a6',
      url: 'https://taphuan.nxbgd.vn/tap-huan/doc-sach/shs-tieng-trung-quoc-8.4540041781#page=0' },
    { id: 'shs9',   title: 'Tiếng Trung Quốc 9', sub: '',        grade: 'Lớp 9', color: '#f59e0b',
      url: 'https://taphuan.nxbgd.vn/tap-huan/doc-sach/shs-tieng-trung-quoc-9.4538772230#page=0' },
    { id: 'sgk10',  title: 'Tiếng Trung Quốc 10', sub: '',       grade: 'Lớp 10', color: '#ef4444',
      url: 'https://taphuan.nxbgd.vn/tap-huan/doc-sach/sgk-tieng-trung-quoc-10.4866978491#page=0' },
  ]

  let selected = null

  function render() {
    app.innerHTML = `
      <style>
        .book-card {
          background: white; border-radius: 16px; border: 1px solid #e2e8f0;
          padding: 24px 20px; cursor: pointer; transition: all .18s;
          display: flex; flex-direction: column; align-items: center; gap: 12px;
          text-align: center;
        }
        .book-card:hover { box-shadow: 0 6px 24px rgba(0,0,0,.1); transform: translateY(-2px); }
        .book-cover {
          width: 90px; height: 120px; border-radius: 8px; display: flex;
          align-items: center; justify-content: center; font-size: 36px;
          box-shadow: 2px 4px 12px rgba(0,0,0,.15);
        }
        .reader-frame {
          width: 100%; height: calc(100vh - 120px); border: none;
        }
      </style>

      <div style="min-height:100vh;background:#f8faff">

        <div style="display:flex;align-items:center;gap:14px;padding:16px 24px;
          background:white;border-bottom:1px solid #e2e8f0;position:sticky;top:0;z-index:10;flex-wrap:wrap">
          ${selected ? `
            <button onclick="cbBack()"
              style="background:none;border:none;cursor:pointer;color:#64748b;font-size:14px;padding:0;white-space:nowrap">
              ← Danh sách
            </button>
            <div style="flex:1;min-width:0">
              <span style="font-size:15px;font-weight:700;color:#0f172a">
                ${selected.title}${selected.sub ? ' — ' + selected.sub : ''}
              </span>
              <span style="font-size:12px;color:#94a3b8;margin-left:6px">${selected.grade}</span>
            </div>
            <a href="${selected.url}" target="_blank"
              style="padding:7px 16px;border-radius:9px;background:#2563eb;color:white;
                font-size:13px;font-weight:600;text-decoration:none;white-space:nowrap">
              ↗ Mở tab mới
            </a>
          ` : `
            <button onclick="history.back()"
              style="background:none;border:none;cursor:pointer;color:#64748b;font-size:14px;padding:0">← Quay lại</button>
            <h1 style="font-size:18px;font-weight:800;color:#0f172a;margin:0;font-family:'Space Grotesk',sans-serif;flex:1">
              📚 Sách giáo khoa Tiếng Trung
            </h1>
          `}
        </div>

        ${selected ? `
          <iframe src="${selected.url}" class="reader-frame"
            title="${selected.title} ${selected.sub}"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation"
            loading="lazy">
          </iframe>
        ` : `
          <div style="padding:24px 20px">
            <div style="max-width:1100px;margin:0 auto">
              <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:16px">
                ${BOOKS.map(b => `
                  <div class="book-card" onclick="cbOpen('${b.id}')">
                    <div class="book-cover" style="background:linear-gradient(135deg,${b.color}22,${b.color}44)">
                      📖
                    </div>
                    <div>
                      <div style="font-size:15px;font-weight:800;color:#0f172a">${b.title}</div>
                      <div style="font-size:13px;color:#64748b;margin-top:2px">${b.sub || b.grade}</div>
                      ${b.sub ? `<div style="display:inline-block;margin-top:8px;padding:3px 10px;border-radius:20px;
                        font-size:11px;font-weight:700;background:${b.color}18;color:${b.color}">${b.grade}</div>` : ''}
                    </div>
                    <button style="padding:8px 20px;border-radius:9px;border:none;cursor:pointer;
                      background:${b.color};color:white;font-size:13px;font-weight:700;width:100%">
                      Đọc ngay →
                    </button>
                  </div>`).join('')}

                <div style="background:white;border-radius:16px;border:2px dashed #e2e8f0;
                  padding:24px 20px;display:flex;flex-direction:column;align-items:center;
                  justify-content:center;gap:10px;min-height:220px;color:#cbd5e1">
                  <div style="font-size:32px">＋</div>
                  <div style="font-size:13px;text-align:center">Sắp có thêm<br>sách mới</div>
                </div>
              </div>
            </div>
          </div>
        `}
      </div>`
  }

  window.cbOpen = id => { selected = BOOKS.find(b => b.id === id) || null; render() }
  window.cbBack = () => { selected = null; render() }

  render()
}
