export default function blogPage(app, params) {
  const id = params?.get('id')
  id ? renderPost(app, id) : renderList(app)
}

// ── Articles data ──────────────────────────────────────────────────────────────
const POSTS = [
  {
    id: 'toeic-listening-tips',
    title: 'Bí quyết chinh phục TOEIC Listening — Toàn tập Part 1, 2, 3, 4',
    category: 'TOEIC',
    date: '2026-05-23',
    excerpt: 'Tổng hợp chiến lược nghe TOEIC từ Part 1 đến Part 4: dùng bút chì, nghe bắt key, nhớ vai người nói, đọc nhanh keyword — giúp bạn tăng điểm nhanh chóng.',
    thumbnail: null,
    content: `
<h2>Mẹo, Kỹ năng quan trọng — Part 1</h2>
<h3>Dùng bút chì đánh dấu đáp án</h3>
<p><strong>Nguyên tắc 1:</strong> hãy để đầu bút chì ngay đáp án bạn cho là chuẩn nhất.</p>
<p><strong>Nguyên tắc 2:</strong> khi nghe tranh, với mỗi đáp án, luôn có 3 trường hợp:</p>
<ul>
  <li><strong>Chắc chắn đúng</strong> → tô luôn đáp án này</li>
  <li><strong>Chắc chắn sai</strong> → dời đầu bút chì qua đáp án kế bên, nghe tiếp</li>
  <li><strong>Lưỡng lự</strong> (có thể mất tập trung do chợt nhớ người yêu, bla bla… nên nghe không được, và không chắc chắn được đáp án là đúng hay sai)</li>
</ul>
<p><strong>Ví dụ thực hành:</strong></p>
<ul>
  <li>Đặt đầu bút chì ngay đáp án A, tập trung nghe</li>
  <li>Câu A chắc chắn đúng → tô luôn</li>
  <li>Câu A chắn chắn sai → bỏ luôn đầu bút chì qua đáp án kế bên, nghe tiếp</li>
  <li>Sau khi nghe xong, đầu bút chì nằm ở đáp án nào, tô đáp án đó (gọi là đáp án chuẩn nhất)</li>
  <li>Câu A khó quá, nghe không được → để yên bút chì ngay đáp án A nghe tiếp (vì có thể nó là đáp án đúng, mà do mình nghe không ra họ nói gì)</li>
</ul>

<hr/>

<h2>Phân tích chi tiết — Part 2</h2>
<h3>Nguyên tắc Part 2</h3>
<p>Đối với những câu cơ bản, dựa vào từ hỏi để xác định dạng câu hỏi và chọn câu trả lời tương ứng (chỉ áp dụng khi nghe khó nghe hoặc nghe được mỗi từ hỏi, luôn ưu tiên nghe hiểu hơn).</p>
<p><strong>Tiêu biểu:</strong></p>
<ol>
  <li><strong>Where..?</strong> → In.../On.../Across.../The street/The corner/The store/The cabinet/...</li>
  <li><strong>When/What time...?</strong> → At.../Friday/Seven o'clock/6 P.M/In a month/Before/As soon as/...</li>
  <li><strong>Who...?</strong> → Mr. Smith/Lisa/The technician/The marketing team/...</li>
  <li><strong>How...get/go to...?</strong> → Bus/taxi/...</li>
  <li><strong>How much...?</strong> → 30 dollars/euros/...</li>
  <li><strong>How long...?</strong> → 15 minutes/for an hour/...</li>
  <li><strong>How often?</strong> → Every.../Once a week/Twice a month/Three times a year/...</li>
  <li><strong>Which...?</strong> → The one.../The...one</li>
  <li><strong>Why?</strong> → Thông thường nghe <em>Because</em> dễ bị mắc bẫy nên phải hết sức chú ý / <em>To + Vo</em> thường là đáp án đúng/...</li>
  <li><strong>Could you...?</strong> → Sure/No problems/...</li>
  <li><strong>Can I...? Would you like me...?</strong> → Thanks/Appreciate/Do/Did/Does/Will/Have/Has/</li>
  <li><strong>Do/Did/Does/Will/Have/Has/Can...?</strong> → Yes/No</li>
</ol>

<h3>Tổng hợp câu trả lời đúng ~90% trong mọi hoàn cảnh</h3>
<ul>
  <li>I have no idea.</li>
  <li>Not that I know of</li>
  <li>I'm not sure</li>
  <li>It's up to you</li>
  <li>Either is fine</li>
  <li>I can't say for sure</li>
  <li>Let me find out</li>
  <li>Let me check</li>
  <li>That's a good idea</li>
  <li>Let me ask</li>
</ul>

<h3>Lỗi lặp âm, lặp từ, từ cùng chủ đề → Loại</h3>
<p>Ví dụ:</p>
<blockquote>Did we decide on the large <strong>catering order</strong> or the small one?<br/>
(A) This <strong>meal</strong> is delicious.<br/>
(B) In alphabetical <strong>order.</strong><br/>
(C) We're expecting a big groups of people <strong>order</strong>.</blockquote>
<ul>
  <li>Đáp án (B) và (C) lặp từ "<em>order</em>" → thường là sai</li>
  <li><em>catering / meal</em>: cùng chủ đề ăn uống → loại (A)</li>
  <li>Ngoài ra, đối với các lỗi lặp âm, lặp từ, từ cùng chủ đề → Loại</li>
</ul>

<hr/>

<h2>Bí quyết chinh phục — Part 3 & 4</h2>
<h3>Nghe bắt KEY</h3>
<p><em>(Không cần nghe hiểu hết, vẫn chọn được đáp án đúng — thế mới hay!)</em></p>
<p>Đây là kỹ năng đặc biệt quan trọng, quyết định đến việc đậu rớt phần Listening nếu mục tiêu <strong>500 – 650+</strong>, gồm 2 phần:</p>

<h4>Phần 1:</h4>
<p>Muốn NGHE BẮT KEY tốt thì nguyên tắc là: <strong>phải phát âm tốt</strong>. Cách luyện phát âm đơn giản:</p>
<ol>
  <li>Mở lời thoại TOEIC (Part 3 hoặc 4)</li>
  <li>Tự đọc qua 1 lần theo cách của mình</li>
  <li>Nghe băng + để ý băng nhấn nhá, nối âm và chỗ mình đọc sai lúc nãy (chưa nghe rõ thì tua lại ngay)</li>
  <li>Nghe băng + đọc nhẩm theo băng (nhẩm cho giống; nếu đọc nhẩm không kịp hoặc không giống chỗ nào thì dừng lại, tua lại và đọc nhẩm lại)</li>
  <li>Tự đọc cho giống với băng + ghi âm để nghe xem tốt hơn chưa (quan trọng: nhấn nhá, nối âm)</li>
</ol>

<h4>Phần 2 (Thực hành):</h4>
<p>Luyện chăm chỉ, theo cách đã hướng dẫn bạn sẽ tiến bộ (có thể chỉ sau 2 tuần chăm chỉ cày cuốc), vì đây là kinh nghiệm rất lâu của thầy thông qua tự luyện và giảng dạy.</p>

<h3>Nhớ vai người nói <em>(chỉ có ở Part 3)</em></h3>
<p>Ví dụ:</p>
<blockquote>Why does the <strong>woman</strong> say, "It's not on Thursday"?<br/>
(A) At a hospital &nbsp; (B) At a restaurant &nbsp; (C) At a factory &nbsp; (D) At a grocery store<br/>
→ Nghe lời <strong>người phụ nữ</strong></blockquote>
<p>Khi xác định được <strong>lời người nào chứa đáp án</strong>, thì sẽ giúp bạn tập trung vào lời người ấy, và có thể bỏ qua lời người nói không chứa đáp án — vì cái gì cũng nghe sẽ gây mệt mỏi, và bạn có thể tận dụng thời gian đó đọc câu khác.</p>

<h3>Đọc nhanh trước keyword câu hỏi + câu trả lời</h3>
<p>Ví dụ:</p>
<blockquote>Where are the speakers?<br/>
(A) At a hospital &nbsp; (B) At a restaurant &nbsp; (C) At a factory &nbsp; (D) At a grocery store</blockquote>
<ul>
  <li>Khi luyện cũng như thi thật, bạn phải đọc thật nhanh, lựa <strong>keyword để nhớ</strong>, chứ không đọc hết — uống thời gian.</li>
  <li><strong>Gạch chân</strong> trong ví dụ là phần bạn cần đọc trước. Lưu ý: đọc phần gạch chân chứ không được gạch vì trong quy định thi không cho phép thí sinh ghi bất cứ gì vào đề thi.</li>
</ul>
    `,
  },
]

// ── List view ──────────────────────────────────────────────────────────────────
function renderList(app) {
  app.innerHTML = `
    <style>
      .blog-card { background:white; border-radius:16px; border:1px solid #e2e8f0; overflow:hidden; cursor:pointer; transition:box-shadow .2s,transform .2s; }
      .blog-card:hover { box-shadow:0 12px 32px rgba(0,0,0,.1); transform:translateY(-3px); }
      .blog-content h2 { font-size:22px; font-weight:700; color:#1e3a5f; margin:32px 0 12px; font-family:'Space Grotesk',sans-serif; }
      .blog-content h3 { font-size:17px; font-weight:700; color:#047857; margin:24px 0 8px; }
      .blog-content h4 { font-size:15px; font-weight:700; color:#1d4ed8; margin:18px 0 6px; }
      .blog-content p  { font-size:15px; line-height:1.8; color:#374151; margin:0 0 12px; }
      .blog-content ul,.blog-content ol { font-size:15px; line-height:1.8; color:#374151; padding-left:22px; margin:0 0 14px; }
      .blog-content li { margin-bottom:4px; }
      .blog-content blockquote { background:#f0fdf4; border-left:4px solid #10b981; border-radius:0 8px 8px 0; padding:14px 18px; margin:16px 0; font-size:14px; color:#065f46; line-height:1.7; }
      .blog-content hr { border:none; border-top:2px solid #e2e8f0; margin:36px 0; }
      .blog-content strong { color:#1e3a5f; }
      .blog-content em { color:#6b7280; }
    </style>
    <div style="min-height:100vh;background:#f8faff;padding:40px 20px">
      <div style="max-width:900px;margin:0 auto">
        <div style="margin-bottom:32px">
          <h1 style="font-size:28px;font-weight:800;color:#0f172a;margin:0 0 6px;font-family:'Space Grotesk',sans-serif">📝 Bài viết</h1>
          <p style="font-size:14px;color:#64748b;margin:0">Kiến thức, mẹo và chiến lược học tiếng Anh & TOEIC</p>
        </div>
        <div style="display:grid;gap:20px">
          ${POSTS.map(p => `
            <div class="blog-card" onclick="navigate('/blog?id=${p.id}')">
              <div style="padding:24px 28px">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
                  <span style="font-size:11px;font-weight:700;background:#dbeafe;color:#1d4ed8;padding:3px 10px;border-radius:20px;letter-spacing:.5px">${p.category}</span>
                  <span style="font-size:12px;color:#94a3b8">${formatDate(p.date)}</span>
                </div>
                <h2 style="font-size:18px;font-weight:700;color:#0f172a;margin:0 0 10px;font-family:'Space Grotesk',sans-serif;line-height:1.4">${p.title}</h2>
                <p style="font-size:14px;color:#64748b;line-height:1.6;margin:0">${p.excerpt}</p>
                <div style="margin-top:16px;font-size:13px;color:#2563eb;font-weight:600">Đọc tiếp →</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>`
}

// ── Post detail view ───────────────────────────────────────────────────────────
function renderPost(app, id) {
  const post = POSTS.find(p => p.id === id)
  if (!post) {
    app.innerHTML = `<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;color:#64748b">Không tìm thấy bài viết</div>`
    return
  }

  app.innerHTML = `
    <style>
      .blog-content h2 { font-size:22px; font-weight:700; color:#1e3a5f; margin:36px 0 12px; font-family:'Space Grotesk',sans-serif; padding-bottom:8px; border-bottom:2px solid #dbeafe; }
      .blog-content h3 { font-size:17px; font-weight:700; color:#047857; margin:24px 0 8px; }
      .blog-content h4 { font-size:15px; font-weight:700; color:#1d4ed8; margin:18px 0 6px; }
      .blog-content p  { font-size:15px; line-height:1.9; color:#374151; margin:0 0 14px; }
      .blog-content ul,.blog-content ol { font-size:15px; line-height:1.9; color:#374151; padding-left:24px; margin:0 0 16px; }
      .blog-content li { margin-bottom:5px; }
      .blog-content blockquote { background:#f0fdf4; border-left:4px solid #10b981; border-radius:0 10px 10px 0; padding:16px 20px; margin:18px 0; font-size:14px; color:#065f46; line-height:1.8; }
      .blog-content hr { border:none; border-top:2px solid #e2e8f0; margin:40px 0; }
      .blog-content strong { color:#1e3a5f; }
      .blog-content em { color:#6b7280; }
    </style>
    <div style="min-height:100vh;background:#f8faff;padding:40px 20px">
      <div style="max-width:780px;margin:0 auto">
        <button onclick="navigate('/blog')"
          style="background:none;border:none;cursor:pointer;color:#64748b;font-size:14px;padding:0;margin-bottom:24px;display:flex;align-items:center;gap:4px">
          ← Tất cả bài viết
        </button>
        <div style="background:white;border-radius:20px;border:1px solid #e2e8f0;padding:40px 44px;box-shadow:0 4px 20px rgba(0,0,0,.05)">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
            <span style="font-size:11px;font-weight:700;background:#dbeafe;color:#1d4ed8;padding:3px 10px;border-radius:20px;letter-spacing:.5px">${post.category}</span>
            <span style="font-size:12px;color:#94a3b8">${formatDate(post.date)}</span>
          </div>
          <h1 style="font-size:26px;font-weight:800;color:#0f172a;margin:0 0 24px;font-family:'Space Grotesk',sans-serif;line-height:1.35">${post.title}</h1>
          <div class="blog-content">${post.content}</div>
        </div>
        <div style="margin-top:24px;text-align:center">
          <button onclick="navigate('/blog')"
            style="padding:12px 28px;background:#2563eb;color:white;border:none;border-radius:12px;cursor:pointer;font-size:14px;font-weight:600">
            ← Xem tất cả bài viết
          </button>
        </div>
      </div>
    </div>`
}

function formatDate(d) {
  const dt = new Date(d)
  return dt.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
