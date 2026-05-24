export default function chineseBooksPage(app) {

  const BOOKS = [
    {
      id: 'sgk3-1',
      title: 'Tiếng Trung Quốc 3',
      sub: 'Tập một',
      grade: 'Lớp 3',
      color: '#10b981',
      url: 'https://taphuan.nxbgd.vn/tap-huan/doc-sach/sgk-tieng-trung-quoc-3-tap-mot',
    },
    {
      id: 'sgk3-2',
      title: 'Tiếng Trung Quốc 3',
      sub: 'Tập hai',
      grade: 'Lớp 3',
      color: '#10b981',
      url: 'https://taphuan.nxbgd.vn/tap-huan/doc-sach/sgk-tieng-trung-quoc-3-tap-hai',
    },
    {
      id: 'sgk4-1',
      title: 'Tiếng Trung Quốc 4',
      sub: 'Tập một',
      grade: 'Lớp 4',
      color: '#f97316',
      url: 'https://taphuan.nxbgd.vn/tap-huan/doc-sach/sgk-tieng-trung-quoc-4-tap-mot.4881895459#page=0',
    },
    {
      id: 'sgk4-2',
      title: 'Tiếng Trung Quốc 4',
      sub: 'Tập hai',
      grade: 'Lớp 4',
      color: '#f97316',
      url: 'https://taphuan.nxbgd.vn/tap-huan/doc-sach/sgk-tieng-trung-quoc-4-tap-hai',
    },
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
          width: 100%; height: calc(100vh - 130px); border: none;
          border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,.1);
        }
      </style>

      <div style="min-height:100vh;background:#f8faff;padding:28px 20px">
        <div style="max-width:1100px;margin:0 auto">

          <div style="display:flex;align-items:center;gap:14px;margin-bottom:24px;flex-wrap:wrap">
            <button onclick="history.back()"
              style="background:none;border:none;cursor:pointer;color:#64748b;font-size:14px;padding:0">← Quay lại</button>
            <div style="flex:1">
              <h1 style="font-size:22px;font-weight:800;color:#0f172a;margin:0;font-family:'Space Grotesk',sans-serif">
                📚 Sách giáo khoa Tiếng Trung
              </h1>
              <p style="font-size:13px;color:#64748b;margin:4px 0 0">Sách giáo khoa chính thức của Bộ Giáo dục</p>
            </div>
            ${selected ? `
              <button onclick="cbBack()"
                style="padding:8px 18px;border-radius:10px;border:none;cursor:pointer;
                  background:#f1f5f9;color:#64748b;font-size:13px;font-weight:600">
                ← Danh sách sách
              </button>
              <a href="${selected.url}" target="_blank"
                style="padding:8px 18px;border-radius:10px;border:none;cursor:pointer;
                  background:#2563eb;color:white;font-size:13px;font-weight:600;text-decoration:none">
                ↗ Mở trang mới
              </a>` : ''}
          </div>

          ${selected ? `
            <div style="background:white;border-radius:14px;border:1px solid #e2e8f0;overflow:hidden;
              box-shadow:0 4px 20px rgba(0,0,0,.07)">
              <div style="padding:12px 20px;border-bottom:1px solid #f1f5f9;
                display:flex;align-items:center;gap:10px;background:#fafafa">
                <div style="width:10px;height:10px;border-radius:50%;background:${selected.color}"></div>
                <span style="font-size:14px;font-weight:700;color:#0f172a">${selected.title} — ${selected.sub}</span>
                <span style="font-size:12px;color:#94a3b8;margin-left:4px">${selected.grade}</span>
              </div>
              <iframe src="${selected.url}" class="reader-frame"
                title="${selected.title} ${selected.sub}"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                loading="lazy">
              </iframe>
              <div style="padding:14px 20px;background:#fafafa;border-top:1px solid #f1f5f9;
                font-size:13px;color:#94a3b8;text-align:center">
                Nếu sách không hiển thị, nhấn
                <a href="${selected.url}" target="_blank" style="color:#2563eb;font-weight:600">↗ Mở trang mới</a>
              </div>
            </div>
          ` : `
            <div style="margin-bottom:16px">
              <div style="display:inline-flex;align-items:center;gap:8px;background:#eff6ff;border:1px solid #bfdbfe;
                border-radius:10px;padding:8px 14px;font-size:13px;color:#1d4ed8">
                📖 Chương trình GDPT 2018 — hiện có SGK Lớp 3 và Lớp 4
              </div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:16px">
              ${BOOKS.map(b => `
                <div class="book-card" onclick="cbOpen('${b.id}')">
                  <div class="book-cover" style="background:linear-gradient(135deg,${b.color}22,${b.color}44)">
                    📖
                  </div>
                  <div>
                    <div style="font-size:15px;font-weight:800;color:#0f172a">${b.title}</div>
                    <div style="font-size:13px;color:#64748b;margin-top:2px">${b.sub}</div>
                    <div style="display:inline-block;margin-top:8px;padding:3px 10px;border-radius:20px;
                      font-size:11px;font-weight:700;background:${b.color}18;color:${b.color}">
                      ${b.grade}
                    </div>
                  </div>
                  <button style="padding:8px 20px;border-radius:9px;border:none;cursor:pointer;
                    background:${b.color};color:white;font-size:13px;font-weight:700;width:100%">
                    Đọc ngay →
                  </button>
                </div>`).join('')}

              <!-- Placeholder thêm sách sau -->
              <div style="background:white;border-radius:16px;border:2px dashed #e2e8f0;
                padding:24px 20px;display:flex;flex-direction:column;align-items:center;
                justify-content:center;gap:10px;min-height:240px;color:#cbd5e1">
                <div style="font-size:32px">＋</div>
                <div style="font-size:13px;text-align:center">Sắp có thêm<br>sách mới</div>
              </div>
            </div>
          `}

        </div>
      </div>`
  }

  window.cbOpen = id => {
    selected = BOOKS.find(b => b.id === id) || null
    render()
  }

  window.cbBack = () => {
    selected = null
    render()
  }

  render()
}
