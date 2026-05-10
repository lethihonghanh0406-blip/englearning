import { supabase } from '../supabase/client.js'

export default async function shadowingPage(app) {
  let lessons   = []
  let selId     = null
  let sentIdx   = 0
  let checking  = false
  let result    = null   // { words: [{word, ok}] }
  let showVI    = false

  app.innerHTML = `<div style="min-height:100vh;background:#f8faff;display:flex;align-items:center;justify-content:center"><div style="color:#94a3b8;font-size:14px">Đang tải...</div></div>`

  const { data } = await supabase
    .from('shadowing_lessons')
    .select('id, title, youtube_id, level, sentences, sentences_pinyin, sentences_vi')
    .order('created_at')

  lessons = data || []
  selId   = lessons[0]?.id || null

  render()

  function getLesson() { return lessons.find(l => l.id === selId) || null }

  function getSentences()      { return getLesson()?.sentences         || [] }
  function getSentencesPY()    { return getLesson()?.sentences_pinyin  || [] }
  function getSentencesVI()    { return getLesson()?.sentences_vi      || [] }

  function normalize(s) {
    return (s || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()
  }

  function compareWords(expected, spoken) {
    const expWords = normalize(expected).split(/\s+/).filter(Boolean)
    const spkWords = normalize(spoken).split(/\s+/).filter(Boolean)
    return expWords.map((w, i) => ({ word: getLesson()?.sentences[sentIdx]?.split(/\s+/)[i] || w, ok: spkWords[i] === w }))
  }

  function checkPronunciation() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { alert('Trình duyệt không hỗ trợ thu âm. Dùng Chrome nhé!'); return }
    const sentences = getSentences()
    if (!sentences[sentIdx]) return

    checking = true
    result   = null
    render()

    const rec = new SR()
    rec.lang        = 'en-US'
    rec.interimResults = false
    rec.maxAlternatives = 1

    rec.onresult = e => {
      const spoken = e.results[0][0].transcript
      result   = { words: compareWords(sentences[sentIdx], spoken), spoken }
      checking = false
      render()
    }
    rec.onerror = () => { checking = false; render() }
    rec.onend   = () => { if (checking) { checking = false; render() } }
    rec.start()
  }

  function youtubeId(lesson) {
    if (!lesson?.youtube_id) return null
    const m = lesson.youtube_id.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/)
    return m ? m[1] : lesson.youtube_id
  }

  // ── Render ────────────────────────────────────────────────────────────────
  function render() {
    const lesson    = getLesson()
    const sentences = getSentences()
    const pyLines   = getSentencesPY()
    const viLines   = getSentencesVI()
    const sentence  = sentences[sentIdx] || ''
    const pinyin    = pyLines[sentIdx]   || ''
    const vid       = youtubeId(lesson)

    const levelColor = { beginner: '#dcfce7', intermediate: '#fef3c7', advanced: '#fee2e2' }
    const levelText  = { beginner: '#166534', intermediate: '#92400e', advanced: '#dc2626' }
    const levelLabel = { beginner: 'Cơ bản', intermediate: 'Trung cấp', advanced: 'Nâng cao' }

    const sidebar = `
      <div style="width:260px;min-width:260px;background:white;border-right:1px solid #e2e8f0;overflow-y:auto">
        <div style="padding:16px;border-bottom:1px solid #f1f5f9">
          <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:2px">Shadowing</div>
          <div style="font-size:12px;color:#94a3b8">Luyện phát âm theo video</div>
        </div>
        <div style="padding:8px">
          ${!lessons.length
            ? `<div style="padding:20px;text-align:center;color:#94a3b8;font-size:13px">Chưa có bài học</div>`
            : lessons.map(l => {
                const active = l.id === selId
                const lv     = l.level || 'beginner'
                return `
                  <div onclick="shadowSelect('${l.id}')"
                    style="padding:12px;border-radius:10px;cursor:pointer;margin-bottom:4px;background:${active?'#eff6ff':'transparent'};border:1px solid ${active?'#bfdbfe':'transparent'}">
                    <div style="font-size:13px;font-weight:${active?600:500};color:${active?'#1d4ed8':'#374151'};margin-bottom:4px">${l.title}</div>
                    <span style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:10px;background:${levelColor[lv]||'#f1f5f9'};color:${levelText[lv]||'#374151'}">
                      ${levelLabel[lv]||lv}
                    </span>
                  </div>`
              }).join('')}
        </div>
      </div>`

    const main = lesson ? `
      <div style="flex:1;overflow-y:auto;padding:28px 24px">
        <div style="max-width:780px;margin:auto">

          <!-- YouTube embed -->
          ${vid ? `
            <div style="background:black;border-radius:14px;overflow:hidden;margin-bottom:20px;aspect-ratio:16/9">
              <iframe id="yt-frame"
                src="https://www.youtube.com/embed/${vid}?rel=0&modestbranding=1"
                style="width:100%;height:100%;border:none"
                allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture"
                allowfullscreen>
              </iframe>
            </div>` : ''}

          <!-- Sentence nav -->
          <div style="background:white;border-radius:14px;border:1px solid #e2e8f0;padding:20px;margin-bottom:16px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
              <div style="font-size:11px;font-weight:700;letter-spacing:.8px;color:#94a3b8">CÂU HIỆN TẠI</div>
              <div style="display:flex;align-items:center;gap:8px">
                ${viLines.length ? `
                  <button onclick="shadowToggleVI()"
                    style="padding:5px 12px;border-radius:7px;border:none;cursor:pointer;font-size:12px;font-weight:600;background:${showVI?'#2563eb':'#f1f5f9'};color:${showVI?'white':'#64748b'}">
                    🌐 Dịch
                  </button>` : ''}
                <span style="font-size:12px;color:#94a3b8">Câu ${sentIdx+1} / ${sentences.length}</span>
              </div>
            </div>

            <!-- Sentence text or result -->
            ${result
              ? `<div style="font-size:20px;line-height:1.8;margin-bottom:8px;flex-wrap:wrap;display:flex;gap:4px">
                  ${result.words.map(w =>
                    `<span style="padding:2px 6px;border-radius:5px;background:${w.ok?'#dcfce7':'#fee2e2'};color:${w.ok?'#15803d':'#dc2626'};font-weight:500">${w.word}</span>`
                  ).join('')}
                </div>
                <div style="font-size:12px;color:#64748b;margin-bottom:4px">Bạn nói: <em>"${result.spoken}"</em></div>`
              : `<div style="margin-bottom:8px">
                  ${pinyin ? `<div style="font-size:13px;color:#94a3b8;line-height:1.8;letter-spacing:.3px;margin-bottom:2px">${pinyin}</div>` : ''}
                  <div style="font-size:28px;font-weight:500;color:#0f172a;line-height:1.5;letter-spacing:2px">${sentence}</div>
                </div>`}

            ${showVI && viLines[sentIdx]
              ? `<div style="font-size:14px;color:#2563eb;font-style:italic;line-height:1.6;padding-top:8px;border-top:1px solid #f1f5f9">${viLines[sentIdx]}</div>`
              : ''}
          </div>

          <!-- Controls -->
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px">
            <button onclick="shadowPrev()" ${sentIdx===0?'disabled':''}
              style="padding:10px 20px;border-radius:10px;border:1px solid #e2e8f0;background:white;cursor:${sentIdx===0?'default':'pointer'};color:#64748b;font-size:14px;opacity:${sentIdx===0?.4:1}">
              ← Câu trước
            </button>
            <button onclick="shadowCheck()"
              style="flex:1;padding:12px 24px;border-radius:10px;border:none;background:${checking?'#f1f5f9':'#2563eb'};color:${checking?'#94a3b8':'white'};font-size:14px;font-weight:600;cursor:${checking?'default':'pointer'}">
              ${checking ? '🎙 Đang nghe...' : '🎤 Kiểm tra phát âm'}
            </button>
            <button onclick="shadowNext()" ${sentIdx>=sentences.length-1?'disabled':''}
              style="padding:10px 20px;border-radius:10px;border:none;background:#2563eb;color:white;cursor:${sentIdx>=sentences.length-1?'default':'pointer'};font-size:14px;font-weight:600;opacity:${sentIdx>=sentences.length-1?.4:1}">
              Câu tiếp →
            </button>
          </div>

          <!-- Dot nav -->
          ${sentences.length > 1 ? `
            <div style="display:flex;gap:5px;justify-content:center;flex-wrap:wrap">
              ${sentences.map((_,i) => `
                <button onclick="shadowGo(${i})"
                  style="width:${i===sentIdx?24:8}px;height:8px;border-radius:4px;border:none;cursor:pointer;background:${i===sentIdx?'#2563eb':'#e2e8f0'};padding:0;transition:all .2s">
                </button>`).join('')}
            </div>` : ''}
        </div>
      </div>` : `
      <div style="flex:1;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:14px">
        Chọn bài học từ danh sách bên trái
      </div>`

    app.innerHTML = `
      <div style="min-height:100vh;background:#f8faff;display:flex;flex-direction:column">
        <div style="background:white;border-bottom:1px solid #e2e8f0;height:56px;padding:0 24px;display:flex;align-items:center;flex-shrink:0;position:sticky;top:0;z-index:20">
          <button onclick="navigate('/toeic')" style="background:none;border:none;cursor:pointer;color:#64748b;font-size:14px;padding:0">← Trang chủ</button>
          <span style="font-size:15px;font-weight:700;color:#0f172a;font-family:'Space Grotesk',sans-serif;margin-left:16px">Shadowing</span>
        </div>
        <div style="flex:1;display:flex;overflow:hidden;min-height:calc(100vh - 56px)">
          ${sidebar}
          ${main}
        </div>
      </div>`
  }

  window.shadowSelect   = id => { selId = id; sentIdx = 0; result = null; render() }
  window.shadowGo       = i  => { sentIdx = i; result = null; render() }
  window.shadowPrev     = () => { if (sentIdx > 0) { sentIdx--; result = null; render() } }
  window.shadowNext     = () => { const s = getSentences(); if (sentIdx < s.length-1) { sentIdx++; result = null; render() } }
  window.shadowToggleVI = () => { showVI = !showVI; render() }
  window.shadowCheck    = () => { if (!checking) checkPronunciation() }
}
