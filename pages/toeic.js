export default function toeicPage(app) {
  const skills = [
    { id:'listening', icon:'🎧', name:'Listening', desc:'Part 1–4 • Nghe ảnh, hỏi đáp, hội thoại và độc thoại', color:'#dbeafe', text:'#1e40af', badge:'100 câu', parts:'Part 1–4' },
    { id:'reading',   icon:'📖', name:'Reading',   desc:'Part 5–7 • Điền từ, hoàn thành đoạn văn và đọc hiểu', color:'#dcfce7', text:'#166534', badge:'100 câu', parts:'Part 5–7' },
    { id:'speaking',  icon:'🗣️', name:'Speaking',  desc:'Part 1–6 • Đọc to, mô tả ảnh, phản hồi và trình bày', color:'#fef3c7', text:'#92400e', badge:'11 tasks', parts:'Part 1–6' },
    { id:'writing',   icon:'✍️', name:'Writing',   desc:'Part 1–3 • Viết câu, phản hồi email và viết luận',    color:'#fce7f3', text:'#9d174d', badge:'8 tasks',  parts:'Part 1–3' },
  ]

  app.innerHTML = `
    <div style="min-height:100vh;background:#f8faff">
      <div style="max-width:900px;margin:auto;padding:50px 24px">

        <button onclick="history.back()" style="background:none;border:none;cursor:pointer;color:#64748b;font-size:14px;margin-bottom:28px;padding:0">← Trang chủ</button>

        <div style="text-align:center;margin-bottom:48px">
          <span style="background:#dbeafe;color:#1e40af;padding:6px 16px;border-radius:20px;font-size:12px;font-weight:600">TOEIC 4 KỸ NĂNG</span>
          <h1 style="font-family:'Space Grotesk',sans-serif;font-size:36px;margin:14px 0 8px;color:#0f172a">Luyện thi TOEIC toàn diện</h1>
          <p style="color:#64748b;margin:0">Chinh phục cả 4 kỹ năng với lộ trình luyện tập khoa học</p>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
          ${skills.map(s => `
            <div onclick="navigate('/toeic/${s.id}')"
              style="background:white;border-radius:20px;padding:28px;border:1px solid #e2e8f0;cursor:pointer;transition:all .2s"
              onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 12px 28px rgba(0,0,0,0.09)'"
              onmouseout="this.style.transform='none';this.style.boxShadow='none'">
              <div style="width:52px;height:52px;background:${s.color};border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:26px;margin-bottom:16px">${s.icon}</div>
              <h2 style="font-size:20px;margin:0 0 8px;font-family:'Space Grotesk',sans-serif;color:#0f172a">${s.name}</h2>
              <p style="color:#64748b;font-size:13px;line-height:1.6;margin:0 0 16px">${s.desc}</p>
              <div style="display:flex;gap:8px">
                <span style="background:${s.color};color:${s.text};font-size:11px;font-weight:600;padding:4px 10px;border-radius:20px">${s.badge}</span>
                <span style="background:#f1f5f9;color:#475569;font-size:11px;padding:4px 10px;border-radius:20px">${s.parts}</span>
              </div>
            </div>
          `).join('')}
        </div>

        <div style="margin-top:32px;display:flex;gap:16px;justify-content:center;flex-wrap:wrap">
          <div onclick="navigate('/toeic-lr')"
            style="display:inline-flex;align-items:center;gap:10px;background:white;border:1px solid #e2e8f0;border-radius:14px;padding:16px 28px;cursor:pointer;transition:.2s"
            onmouseover="this.style.boxShadow='0 6px 20px rgba(0,0,0,0.07)'"
            onmouseout="this.style.boxShadow='none'">
            <span style="font-size:20px">📝</span>
            <div style="text-align:left">
              <div style="font-weight:600;font-size:14px;color:#0f172a">TOEIC Full Test</div>
              <div style="font-size:12px;color:#64748b">Thi thử đề hoàn chỉnh theo năm</div>
            </div>
          </div>
          <div onclick="navigate('/toeic/vocabulary')"
            style="display:inline-flex;align-items:center;gap:10px;background:white;border:1px solid #e2e8f0;border-radius:14px;padding:16px 28px;cursor:pointer;transition:.2s"
            onmouseover="this.style.boxShadow='0 6px 20px rgba(0,0,0,0.07)'"
            onmouseout="this.style.boxShadow='none'">
            <span style="font-size:20px">📚</span>
            <div style="text-align:left">
              <div style="font-weight:600;font-size:14px;color:#0f172a">Từ vựng</div>
              <div style="font-size:12px;color:#64748b">Học từ vựng qua flashcard</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  `
}
