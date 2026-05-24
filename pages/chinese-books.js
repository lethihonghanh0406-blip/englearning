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

  function render() {
    app.innerHTML = `
      <style>
        .book-card {
          background: white; border-radius: 16px; border: 1px solid #e2e8f0;
          padding: 24px 20px; cursor: pointer; transition: all .18s;
          display: flex; flex-direction: column; align-items: center; gap: 12px;
          text-align: center; text-decoration: none;
        }
        .book-card:hover { box-shadow: 0 6px 24px rgba(0,0,0,.1); transform: translateY(-2px); }
        .book-cover {
          width: 90px; height: 120px; border-radius: 8px; display: flex;
          align-items: center; justify-content: center; font-size: 36px;
          box-shadow: 2px 4px 12px rgba(0,0,0,.15);
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
          </div>

          <div style="margin-bottom:16px">
            <div style="display:inline-flex;align-items:center;gap:8px;background:#eff6ff;border:1px solid #bfdbfe;
              border-radius:10px;padding:8px 14px;font-size:13px;color:#1d4ed8">
              📖 Chương trình GDPT 2018 — hiện có SGK Lớp 3 và Lớp 4 · Bấm để mở sách
            </div>
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:16px">
            ${BOOKS.map(b => `
              <a class="book-card" href="${b.url}" target="_blank" rel="noopener">
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
                <div style="padding:8px 20px;border-radius:9px;
                  background:${b.color};color:white;font-size:13px;font-weight:700;width:100%;box-sizing:border-box">
                  Đọc ngay ↗
                </div>
              </a>`).join('')}

            <div style="background:white;border-radius:16px;border:2px dashed #e2e8f0;
              padding:24px 20px;display:flex;flex-direction:column;align-items:center;
              justify-content:center;gap:10px;min-height:240px;color:#cbd5e1">
              <div style="font-size:32px">＋</div>
              <div style="font-size:13px;text-align:center">Sắp có thêm<br>sách mới</div>
            </div>
          </div>

        </div>
      </div>`
  }

  render()
}
