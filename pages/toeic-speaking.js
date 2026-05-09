import { supabase } from '../supabase/client.js'

const PART_CONFIG = {
  1: { label: 'Part 1 – Read Aloud',                 desc: 'Đọc to đoạn văn',                     },
  2: { label: 'Part 2 – Describe a Picture',          desc: 'Mô tả bức ảnh',                       },
  3: { label: 'Part 3 – Respond to Questions',        desc: 'Trả lời câu hỏi (không có chuẩn bị)', },
  4: { label: 'Part 4 – Questions Using Information', desc: 'Trả lời dựa trên thông tin',          },
  5: { label: 'Part 5 – Propose a Solution',          desc: 'Đề xuất giải pháp',                   },
  6: { label: 'Part 6 – Express an Opinion',          desc: 'Trình bày ý kiến cá nhân',            },
}

export default async function toeicSpeaking(app) {
  app.innerHTML = `
    <div style="min-height:100vh;background:#f8faff;display:flex;align-items:center;justify-content:center">
      <div style="text-align:center;color:#64748b">
        <div style="font-size:36px;margin-bottom:12px">🎙</div>
        <p style="font-size:14px">Đang tải bài tập...</p>
      </div>
    </div>`

  const [{ data: tasks }, { data: sentRows }, { data: vocabRows }] = await Promise.all([
    supabase.from('speaking_tasks').select('id,part_id,task_order,title,content,content_vi,audio_url,image_url,tips,sample_answer_audio,sample_answer,sample_answer_vi').order('part_id').order('task_order'),
    supabase.from('speaking_sentences').select('id,task_id,sentence_order,sentence_en,sentence_vi,audio_url').order('task_id').order('sentence_order'),
    supabase.from('speaking_vocab').select('id,task_id,word,meaning,ipa').order('task_id'),
  ])

  if (!tasks?.length) {
    app.innerHTML = `
      <div style="min-height:100vh;background:#f8faff;display:flex;align-items:center;justify-content:center">
        <div style="text-align:center;color:#94a3b8;padding:40px">
          <div style="font-size:40px;margin-bottom:12px">📭</div>
          <p>Chưa có dữ liệu Speaking</p>
        </div>
      </div>`
    return
  }

  const sentByTask = {}
  for (const s of (sentRows || [])) {
    if (!sentByTask[s.task_id]) sentByTask[s.task_id] = []
    sentByTask[s.task_id].push(s)
  }
  const vocabByTask = {}
  for (const v of (vocabRows || [])) {
    if (!vocabByTask[v.task_id]) vocabByTask[v.task_id] = []
    vocabByTask[v.task_id].push(v)
  }
  const enriched = tasks.map(t => ({ ...t, sentences: sentByTask[t.id] || [], vocab: vocabByTask[t.id] || [] }))

  const byPart = {}
  for (const t of enriched) {
    if (!byPart[t.part_id]) byPart[t.part_id] = []
    byPart[t.part_id].push(t)
  }
  const partIds = Object.keys(byPart).map(Number).sort()

  // ── State ─────────────────────────────────────────────────────────────────
  let selPart   = partIds[0]
  let taskIdx   = 0
  let showVI    = false
  let showVocab = false
  let showTips  = false

  // ── Render ────────────────────────────────────────────────────────────────
  function render() {
    const conf     = PART_CONFIG[selPart] || {}
    const taskList = byPart[selPart] || []
    const task     = taskList[taskIdx] || {}
    const isLast   = taskIdx >= taskList.length - 1
    const sentences = task.sentences || []
    const vocab = task.vocab || []
    const tips  = Array.isArray(task.tips) ? task.tips : (task.tips ? JSON.parse(task.tips) : [])

    // ── LEFT: full passage ─────────────────────────────────────────────────
    const leftHTML = `
      <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:12px">

        ${task.audio_url ? `
          <div style="background:white;border-radius:14px;border:1px solid #e2e8f0;padding:16px 20px">
            <div style="font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:.8px;margin-bottom:10px">ĐỀ BÀI</div>
            <audio controls style="width:100%;border-radius:8px" src="${task.audio_url}"></audio>
          </div>` : ''}

        ${task.image_url ? `
          <div style="background:white;border-radius:14px;border:1px solid #e2e8f0;overflow:hidden">
            <div style="aspect-ratio:16/9;background:#f1f5f9">
              <img src="${task.image_url}" style="width:100%;height:100%;object-fit:cover;display:block">
            </div>
          </div>` : ''}

        ${task.content ? `
          <div style="background:white;border-radius:14px;border:1px solid #e2e8f0;padding:20px 24px">
            <div style="font-size:15px;color:#0f172a;line-height:2;white-space:pre-wrap">${task.content}</div>
          </div>` : ''}

        ${task.content_vi ? `
          <div style="background:white;border-radius:14px;border:1px solid #e2e8f0;overflow:hidden">
            <button onclick="spkToggleVI()"
              style="width:100%;padding:14px 20px;background:none;border:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between">
              <span style="font-size:13px;font-weight:600;color:#2563eb">🇻🇳 Dịch nghĩa</span>
              <span style="color:#94a3b8;font-size:12px">${showVI ? '▲' : '▼'}</span>
            </button>
            ${showVI ? `
              <div style="padding:16px 20px;background:#eff6ff;border-top:1px solid #dbeafe">
                <div style="font-size:13px;color:#1e3a8a;line-height:1.9;white-space:pre-wrap">${task.content_vi}</div>
              </div>` : ''}
          </div>` : ''}

        ${vocab.length ? `
          <div style="background:white;border-radius:14px;border:1px solid #e2e8f0;overflow:hidden">
            <button onclick="spkToggleVocab()"
              style="width:100%;padding:14px 20px;background:none;border:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between">
              <span style="font-size:13px;font-weight:600;color:#0f172a">📚 Từ vựng <span style="font-weight:400;color:#94a3b8">(${vocab.length})</span></span>
              <span style="color:#94a3b8;font-size:12px">${showVocab ? '▲' : '▼'}</span>
            </button>
            ${showVocab ? `
              <div style="padding:0 16px 16px;display:flex;flex-direction:column;gap:8px;border-top:1px solid #f1f5f9">
                ${vocab.map(v => `
                  <div style="background:#f8faff;border-radius:10px;padding:10px 14px;border:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;gap:8px">
                    <div>
                      <span style="font-size:14px;font-weight:700;color:#0f172a">${v.word}</span>
                      ${v.ipa ? `<span style="font-size:12px;color:#94a3b8;margin-left:6px">${v.ipa}</span>` : ''}
                    </div>
                    <span style="font-size:13px;color:#2563eb;font-weight:600;flex-shrink:0">${v.meaning}</span>
                  </div>`).join('')}
              </div>` : ''}
          </div>` : ''}

        ${tips.length ? `
          <div style="background:white;border-radius:14px;border:1px solid #e2e8f0;overflow:hidden">
            <button onclick="spkToggleTips()"
              style="width:100%;padding:14px 20px;background:none;border:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between">
              <span style="font-size:13px;font-weight:600;color:#0f172a">💡 Tips Speaking</span>
              <span style="color:#94a3b8;font-size:12px">${showTips ? '▲' : '▼'}</span>
            </button>
            ${showTips ? `
              <div style="padding:0 16px 16px;display:flex;flex-direction:column;gap:6px;border-top:1px solid #f1f5f9">
                ${tips.map(t => `
                  <div style="display:flex;gap:10px;padding:10px 14px;background:#fefce8;border-radius:10px;border:1px solid #fde68a">
                    <span style="font-size:13px;flex-shrink:0">💡</span>
                    <span style="font-size:13px;color:#78350f;line-height:1.6">${t}</span>
                  </div>`).join('')}
              </div>` : ''}
          </div>` : ''}

      </div>`

    // ── RIGHT: sentences / sample answer ──────────────────────────────────
    const rightHTML = `
      <div style="display:flex;flex-direction:column;gap:10px">

        ${sentences.length ? `
          <div style="font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:.8px;padding:0 4px">LUYỆN TỪNG CÂU</div>
          ${sentences.map((s, i) => `
            <div style="background:white;border-radius:14px;border:1px solid #e2e8f0;overflow:hidden">
              <div style="padding:14px 16px">
                <div style="display:flex;align-items:flex-start;gap:10px">
                  <span style="font-size:11px;font-weight:700;color:white;background:#2563eb;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px">${i + 1}</span>
                  <div style="flex:1;min-width:0">
                    <div style="font-size:13px;color:#0f172a;line-height:1.75;margin-bottom:${s.sentence_vi?'6px':'0'}">${s.sentence_en || ''}</div>
                    ${s.sentence_vi ? `<div style="font-size:12px;color:#2563eb;line-height:1.6;font-style:italic">${s.sentence_vi}</div>` : ''}
                  </div>
                </div>
              </div>
              ${s.audio_url ? `
                <div style="padding:8px 14px 12px;background:#f8faff;border-top:1px solid #f1f5f9">
                  <audio controls style="width:100%;height:32px;border-radius:6px" src="${s.audio_url}"></audio>
                </div>` : ''}
            </div>`).join('')}` : ''}

        ${task.sample_answer ? `
          <div style="font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:.8px;padding:0 4px${sentences.length?';margin-top:6px':''}">BÀI MẪU</div>

          ${task.sample_answer_audio ? `
            <div style="background:white;border-radius:14px;border:1px solid #e2e8f0;padding:14px 16px">
              <div style="font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:.8px;margin-bottom:10px">🎙 NGHE BÀI MẪU</div>
              <audio controls style="width:100%;border-radius:8px" src="${task.sample_answer_audio}"></audio>
            </div>` : ''}

          <div style="background:white;border-radius:14px;border:1px solid #e2e8f0;padding:16px 20px">
            <div style="font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:.8px;margin-bottom:10px">📝 BÀI MẪU (EN)</div>
            <div style="font-size:13px;color:#0f172a;line-height:1.9;white-space:pre-wrap">${task.sample_answer}</div>
          </div>

          ${task.sample_answer_vi ? `
            <div style="background:#eff6ff;border-radius:14px;border:1px solid #dbeafe;padding:16px 20px">
              <div style="font-size:10px;font-weight:700;color:#3b82f6;letter-spacing:.8px;margin-bottom:10px">🇻🇳 DỊCH NGHĨA</div>
              <div style="font-size:13px;color:#1e3a8a;line-height:1.9;white-space:pre-wrap">${task.sample_answer_vi}</div>
            </div>` : ''}` : ''}

      </div>`

    // ── Nav buttons ────────────────────────────────────────────────────────
    const navHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:4px">
        <button onclick="spkPrevTask()"
          ${taskIdx === 0 ? 'disabled' : ''}
          style="padding:10px 20px;border-radius:10px;border:1px solid #e2e8f0;background:white;color:#64748b;cursor:${taskIdx===0?'default':'pointer'};font-size:13px;opacity:${taskIdx===0?0.4:1}">
          ← Câu trước
        </button>
        <span style="font-size:12px;color:#94a3b8">Task ${taskIdx + 1} / ${taskList.length}</span>
        ${isLast
          ? partIds[partIds.indexOf(selPart) + 1]
            ? `<button onclick="spkNextPart()" style="padding:10px 20px;border-radius:10px;border:none;background:#2563eb;color:white;cursor:pointer;font-weight:600;font-size:13px">Part tiếp →</button>`
            : `<button onclick="navigate('/toeic')" style="padding:10px 20px;border-radius:10px;border:none;background:#16a34a;color:white;cursor:pointer;font-weight:600;font-size:13px">Hoàn thành ✓</button>`
          : `<button onclick="spkNextTask()" style="padding:10px 20px;border-radius:10px;border:none;background:#2563eb;color:white;cursor:pointer;font-weight:600;font-size:13px">Câu tiếp →</button>`}
      </div>`

    // ── Full page ──────────────────────────────────────────────────────────
    app.innerHTML = `
      <div style="min-height:100vh;background:#f8faff">
        <div style="padding:28px 40px 60px">

          <div style="display:flex;align-items:center;gap:16px;margin-bottom:22px">
            <button onclick="spkBack()" style="background:none;border:none;cursor:pointer;color:#64748b;font-size:14px;padding:0">← TOEIC Hub</button>
          </div>

          <div style="display:flex;gap:6px;margin-bottom:20px;overflow-x:auto;padding-bottom:2px">
            ${partIds.map(p => `
              <button onclick="spkPart(${p})"
                style="flex-shrink:0;padding:7px 16px;border-radius:20px;border:1px solid ${selPart===p?'#f59e0b':'#e2e8f0'};
                  background:${selPart===p?'#fef3c7':'white'};color:${selPart===p?'#92400e':'#64748b'};
                  cursor:pointer;font-size:12px;font-weight:${selPart===p?600:400};white-space:nowrap">
                Part ${p}
              </button>`).join('')}
          </div>

          <div style="margin-bottom:18px">
            <h2 style="font-size:19px;font-family:'Space Grotesk',sans-serif;font-weight:700;color:#0f172a;margin:0 0 3px">${conf.label || ''}</h2>
            <p style="font-size:13px;color:#64748b;margin:0">${conf.desc || ''}</p>
          </div>

          ${task.title ? `
            <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:14px">${task.title}</div>` : ''}

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:flex-start">
            ${leftHTML}
            ${rightHTML}
          </div>

          <div style="margin-top:20px">
            ${navHTML}
          </div>

        </div>
      </div>`
  }

  // ── Handlers ──────────────────────────────────────────────────────────────
  window.spkPart = p => {
    selPart = p; taskIdx = 0
    showVI = false; showVocab = false; showTips = false
    render()
  }
  window.spkPrevTask = () => { if (taskIdx > 0) { taskIdx--; showVI = false; render() } }
  window.spkNextTask = () => { taskIdx++; showVI = false; render() }
  window.spkNextPart = () => {
    selPart = partIds[partIds.indexOf(selPart) + 1]
    taskIdx = 0
    showVI = false; showVocab = false; showTips = false
    render()
  }
  window.spkToggleVI    = () => { showVI    = !showVI;    render() }
  window.spkToggleVocab = () => { showVocab = !showVocab; render() }
  window.spkToggleTips  = () => { showTips  = !showTips;  render() }
  window.spkBack        = () => navigate('/toeic')

  render()
}
