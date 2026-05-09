export default function toeicReading(app) {

  // ── Passage renderers ─────────────────────────────────────────────────────
  const TAG = {
    a: 'background:#eff6ff;color:#1d4ed8',
    b: 'background:#f0fdf4;color:#15803d',
    c: 'background:#fefce8;color:#92400e',
  }
  function tag(text, t = 'c') {
    return `<span style="display:inline-block;font-size:11px;font-weight:500;padding:2px 7px;border-radius:20px;margin:1px 2px 1px 0;${TAG[t]}">${text}</span>`
  }

  function renderEmail(p) {
    const rows = [['To', p.to], ['From', p.from], ['Date', p.date], ['Subject', `<strong>${p.subject}</strong>`]]
    return `
      <div style="background:white;border-radius:14px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.06)">
        <table style="width:100%;border-collapse:collapse">
          ${rows.map(([l, v]) => `
            <tr style="border-bottom:1px solid #f1f5f9">
              <td style="padding:8px 14px;width:68px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#64748b;background:#f8fafc">${l}</td>
              <td style="padding:8px 14px;font-size:13px;color:#1e293b">${v}</td>
            </tr>`).join('')}
        </table>
        <div style="padding:16px 18px 20px;font-size:13.5px;line-height:1.8;color:#334155;border-top:2px solid #e2e8f0">${p.body}</div>
      </div>`
  }

  function renderWebpage(p) {
    const headerBg = p.headerBg || '#1e3a5f'
    let inner = ''
    if (p.table) {
      const { headers, rows, footnote } = p.table
      inner = `
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead><tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0">
            ${headers.map((h, i) => `<th style="padding:9px 10px;text-align:${i === headers.length - 1 ? 'right' : 'left'};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:#64748b">${h}</th>`).join('')}
          </tr></thead>
          <tbody>
            ${rows.map(r => `<tr style="border-bottom:1px solid #f8fafc">
              ${r.map((c, i) => `<td style="padding:10px;vertical-align:top;${i === 0 ? 'font-family:monospace;font-size:11.5px;font-weight:700;color:#2563eb;white-space:nowrap' : i === 1 ? 'font-weight:600;white-space:nowrap' : i === r.length - 1 ? 'text-align:right;font-weight:700;font-size:14px;white-space:nowrap' : 'color:#475569'}">${c}</td>`).join('')}
            </tr>`).join('')}
          </tbody>
        </table>
        ${footnote ? `<div style="font-size:12px;color:#dc2626;background:#fff5f5;border-top:1px solid #fee2e2;padding:8px 14px">${footnote}</div>` : ''}
      `
    } else {
      inner = `<div style="padding:16px 18px;font-size:13.5px;line-height:1.8;color:#334155">${p.body || ''}</div>`
    }
    return `
      <div style="background:white;border-radius:14px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.06)">
        <div style="display:flex;align-items:center;gap:10px;padding:9px 14px;background:#f8fafc;border-bottom:1px solid #e2e8f0">
          <div style="display:flex;gap:5px">
            <span style="width:10px;height:10px;border-radius:50%;background:#fca5a5;display:inline-block"></span>
            <span style="width:10px;height:10px;border-radius:50%;background:#fcd34d;display:inline-block"></span>
            <span style="width:10px;height:10px;border-radius:50%;background:#86efac;display:inline-block"></span>
          </div>
          <span style="flex:1;background:white;border:1px solid #e2e8f0;border-radius:20px;padding:3px 12px;font-size:11.5px;color:#64748b;font-family:monospace">${p.url || ''}</span>
        </div>
        <div style="background:${headerBg};color:white;text-align:center;padding:16px 20px 12px">
          <div style="font-size:17px;font-weight:800">${p.title}</div>
          ${p.subtitle ? `<div style="font-size:11.5px;font-weight:500;opacity:.75;margin-top:3px;letter-spacing:1px;text-transform:uppercase">${p.subtitle}</div>` : ''}
        </div>
        ${inner}
      </div>`
  }

  function renderNotice(p) {
    return `
      <div style="background:white;border-radius:14px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.06)">
        <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);color:white;text-align:center;padding:16px 20px 12px">
          <div style="font-size:17px;font-weight:800">${p.title}</div>
          ${p.subtitle ? `<div style="font-size:11.5px;opacity:.75;margin-top:3px;letter-spacing:1px;text-transform:uppercase">${p.subtitle}</div>` : ''}
        </div>
        <div style="padding:16px 20px 20px;font-size:13.5px;line-height:1.8;color:#334155">${p.body}</div>
      </div>`
  }

  function passageLabel(text) {
    return `<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;margin-bottom:8px;padding-left:2px">${text}</div>`
  }

  function passageHTML(passage) {
    if (typeof passage === 'string') {
      return `<div style="margin-bottom:20px">
        <div style="background:white;border-radius:14px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.06);max-height:320px;overflow-y:auto">
          <pre style="font-size:13px;color:#374151;white-space:pre-wrap;margin:0;line-height:1.8;font-family:'Segoe UI',sans-serif;padding:20px">${passage}</pre>
        </div>
      </div>`
    }

    if (passage.type === 'double' || passage.type === 'triple') {
      const parts = passage.type === 'triple'
        ? [passage.a, passage.b, passage.c]
        : [passage.a, passage.b]
      const labels = ['Document 1', 'Document 2', 'Document 3']
      return `
        <div style="margin-bottom:20px">
          <div style="display:inline-flex;align-items:center;gap:8px;background:#f1f5f9;border-radius:20px;padding:4px 12px;margin-bottom:14px">
            <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#64748b">${parts.length} đoạn văn</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:14px">
            ${parts.map((p, i) => `
              <div>
                ${passageLabel(labels[i])}
                ${renderPassageInner(p)}
              </div>`).join('')}
          </div>
        </div>`
    }

    return `<div style="margin-bottom:20px">${renderPassageInner(passage)}</div>`
  }

  function renderPassageInner(p) {
    if (p.type === 'email')   return renderEmail(p)
    if (p.type === 'webpage') return renderWebpage(p)
    if (p.type === 'notice')  return renderNotice(p)
    return ''
  }

  // ── Answer choices ─────────────────────────────────────────────────────────
  function optStyle(answered, i, correct) {
    if (answered === undefined) return { wrap: 'border:2px solid #e2e8f0;background:white', lbl: 'background:#f1f5f9;color:#475569' }
    if (i === correct)          return { wrap: 'border:2px solid #16a34a;background:#f0fdf4', lbl: 'background:#16a34a;color:white' }
    if (i === answered)         return { wrap: 'border:2px solid #ef4444;background:#fef2f2', lbl: 'background:#ef4444;color:white' }
    return { wrap: 'border:2px solid #e2e8f0;background:white', lbl: 'background:#f1f5f9;color:#475569' }
  }

  function choices(options, answered, correct, keyStr) {
    const letters = ['A', 'B', 'C', 'D']
    return options.map((text, i) => {
      const s = optStyle(answered, i, correct)
      const locked = answered !== undefined
      return `<div onclick="${locked ? '' : `readAns('${keyStr}',${i})`}"
        style="padding:13px 16px;border-radius:11px;${s.wrap};cursor:${locked ? 'default' : 'pointer'};font-size:14px;display:flex;align-items:center;gap:12px;margin-bottom:8px">
        <span style="width:28px;height:28px;border-radius:8px;${s.lbl};display:flex;align-items:center;justify-content:center;font-weight:600;flex-shrink:0;font-size:13px">${letters[i]}</span>
        ${text}
      </div>`
    }).join('')
  }

  const data = {
    5: {
      label: 'Part 5 – Incomplete Sentences',
      desc: 'Chọn từ/cụm từ đúng để điền vào chỗ trống',
      items: [
        { sentence: 'The company\'s new _____ strategy has greatly improved brand awareness.', options: ['market', 'marketing', 'marketed', 'marketer'], correct: 1 },
        { sentence: 'All employees are required to _____ the annual safety training session.', options: ['attend', 'attendance', 'attended', 'attends'], correct: 0 },
        { sentence: 'The quarterly report was _____ to all department heads by email yesterday.', options: ['distribute', 'distributed', 'distributing', 'distribution'], correct: 1 },
        { sentence: 'Ms. Park is _____ for managing all incoming client inquiries at the front desk.', options: ['responsible', 'responsibility', 'responsibly', 'responsibilities'], correct: 0 },
        { sentence: 'The new office _____ is conveniently located near the central train station.', options: ['build', 'builds', 'building', 'built'], correct: 2 },
        { sentence: 'The entire team worked _____ to complete the project three days ahead of schedule.', options: ['efficient', 'efficiency', 'efficiently', 'efficiencies'], correct: 2 },
      ]
    },
    6: {
      label: 'Part 6 – Text Completion',
      desc: 'Chọn từ/cụm từ điền vào từng chỗ trống trong đoạn văn',
      items: [
        {
          passage: `From: Michael Kim &lt;m.kim@techcorp.com&gt;
To: hr@techcorp.com
Subject: Q3 Sales Team Recognition

Dear HR Team,

I am pleased to inform you that our Q3 sales <mark>(1)___</mark> have exceeded our original target by 15%. Every member of the sales team has <mark>(2)___</mark> exceptional effort throughout this challenging quarter.

In <mark>(3)___</mark> of their contributions, I would like to organize a team celebration dinner at a restaurant of your choice. Please let me know if this can be <mark>(4)___</mark> from the company's discretionary budget.

Best regards,
Michael Kim
Sales Director`,
          questions: [
            { q: 'Chỗ trống (1)', options: ['result', 'results', 'resulting', 'resulted'], correct: 1 },
            { q: 'Chỗ trống (2)', options: ['demonstrated', 'demonstrate', 'demonstrating', 'demonstration'], correct: 0 },
            { q: 'Chỗ trống (3)', options: ['recognize', 'recognition', 'recognized', 'recognizing'], correct: 1 },
            { q: 'Chỗ trống (4)', options: ['fund', 'funded', 'funding', 'funds'], correct: 1 },
          ]
        },
      ]
    },
    7: {
      label: 'Part 7 – Reading Comprehension',
      desc: 'Đọc văn bản và trả lời câu hỏi',
      items: [
        {
          passage: {
            type: 'double',
            a: {
              type: 'webpage',
              url: 'https://www.jjshomeandgarden.com/cementmixers',
              title: "JJ's Home and Garden Suppliers",
              subtitle: 'Cement Mixers',
              table: {
                headers: ['Model', 'Name', 'Description', 'Price'],
                rows: [
                  ['HCC-TX', 'Easy Star',    `${tag('2 cu ft','a')}${tag('1 hp','b')}<br>${tag('In-store pickup only')}`, '$189'],
                  ['CVY-XU', 'Mr. Buddy*',   `${tag('2 cu ft','a')}${tag('5 hp','b')}<br>${tag('Delivery only, 1–2 wks')}`, '$359'],
                  ['PIT-RX', 'Concretizer',  `${tag('4 cu ft','a')}${tag('3 hp','b')}<br>${tag('In-store pickup')}${tag('5-day delivery')}`, '$499'],
                  ['HTK-LM', 'Big Mix',      `${tag('5 cu ft','a')}${tag('5 hp','b')}<br>${tag('In-store pickup only')}`, '$629'],
                  ['PPP-HT', 'Max for Pros', `${tag('6 cu ft','a')}${tag('7 hp','b')}<br>${tag('Delivery only, 2–4 wks')}`, '$949'],
                ],
                footnote: '* Out of stock until July 26'
              }
            },
            b: {
              type: 'email',
              to: 'Customer Service &lt;customerservice@jjshomeandgarden.com&gt;',
              from: 'Marshall Weaver &lt;mweaver01@gmail.net&gt;',
              date: 'June 25',
              subject: 'Delayed order',
              body: `<p>Dear Customer Service Representative,</p>
<p>I received a confirmation e-mail on <mark style="background:#fef08a;border-radius:3px;padding:0 2px">June 15</mark> that my <mark style="background:#fef08a;border-radius:3px;padding:0 2px">4-cubic-foot cement mixer</mark> would be delivered one week ago. I have a small business and am dependent on my equipment. I have not yet received the product, and I have already left several unanswered phone messages.</p>
<p>If the cement mixer is not at my business by end of day, I can still pick it up at the <mark style="background:#fef08a;border-radius:3px;padding:0 2px">New Gralen</mark> or <mark style="background:#fef08a;border-radius:3px;padding:0 2px">Paloner</mark> store. If unavailable, I ask that you cancel my order and provide a full refund. I will instead buy a <mark style="background:#fef08a;border-radius:3px;padding:0 2px">Mr. Buddy</mark> from Alliance Hardware Store at your same price.</p>
<p>Sincerely,<br><strong>Marshall Weaver</strong></p>`
            }
          },
          questions: [
            { q: 'What is suggested about the Concretizer?', options: ['It is out of stock.', 'It can be delivered or picked up in store.', 'It is the most powerful model.', 'It requires a deposit.'], correct: 1 },
            { q: 'What product did Mr. Weaver most likely order?', options: ['Easy Star', 'Mr. Buddy', 'Concretizer', 'Big Mix'], correct: 2 },
            { q: 'Why did Mr. Weaver write the e-mail?', options: ['To place a new order', 'To report a delayed delivery', 'To request a product catalog', 'To inquire about store hours'], correct: 1 },
            { q: 'What does Mr. Weaver request if his item is unavailable tomorrow?', options: ['A replacement product', 'A store credit', 'A full refund', 'An extended warranty'], correct: 2 },
            { q: 'What is indicated about Alliance Hardware Store?', options: ['It offers free delivery.', 'It has Mr. Buddy in stock at the same price.', 'It is located next to a JJ\'s store.', 'It is a large national chain.'], correct: 1 },
          ]
        },
        {
          passage: `MEMORANDUM

To: All Staff
From: Jennifer Walsh, CEO
Date: March 15
Re: New Flexible Work Policy

Effective April 1st, TechCorp will introduce a flexible remote work policy for all full-time employees. Under this policy, staff may work from home up to three days per week, subject to the following conditions:

• All work-from-home requests must be submitted to the employee's direct supervisor at least 48 hours in advance.
• Employees must remain reachable via email and company messaging platforms between 9 AM and 5 PM.
• Core hours (10 AM–3 PM) require availability for team meetings and video calls.

Employees wishing to participate should submit a formal request to HR no later than March 25th. Approved participants will receive written confirmation by March 31st.

For questions or concerns, please contact HR at hr@techcorp.com.`,
          questions: [
            { q: 'What is the main purpose of this memo?', options: ['To announce a new product launch', 'To introduce a remote work policy', 'To remind staff about performance reviews', 'To change office working hours'], correct: 1 },
            { q: 'How many days per week can employees work remotely?', options: ['One day', 'Two days', 'Three days', 'Four days'], correct: 2 },
            { q: 'What is required when requesting to work from home?', options: ['A doctor\'s note', '48-hour advance notice to supervisor', 'Approval from the CEO directly', 'A formal written proposal'], correct: 1 },
            { q: 'By when must employees submit their participation request?', options: ['March 15', 'March 20', 'March 25', 'March 31'], correct: 2 },
          ]
        },
      ]
    }
  }

  let state = { part: 5, idx: 0, answers: {}, done: false }

  function k(p, i, j) { return j !== undefined ? `${p}_${i}_${j}` : `${p}_${i}` }

  function totalScore() {
    let correct = 0, total = 0
    for (const p of [5, 6, 7]) {
      const items = data[p].items
      if (p === 5) {
        items.forEach((item, i) => { total++; if (state.answers[k(p, i)] === item.correct) correct++ })
      } else {
        items.forEach((g, i) => g.questions.forEach((q, j) => { total++; if (state.answers[k(p, i, j)] === q.correct) correct++ }))
      }
    }
    return { correct, total }
  }

  function renderQ() {
    const { part, idx } = state
    const d = data[part]

    if (part === 5) {
      const item = d.items[idx]
      const answered = state.answers[k(part, idx)]
      const highlighted = item.sentence.replace('_____', '<span style="background:#dbeafe;color:#1e40af;padding:2px 8px;border-radius:4px;font-weight:600">_____</span>')
      return `
        <div style="background:#f8faff;border-radius:14px;padding:24px;margin-bottom:20px;border:1px solid #e2e8f0">
          <p style="font-size:15px;color:#0f172a;line-height:1.7;margin:0">${highlighted}</p>
        </div>
        ${choices(item.options, answered, item.correct, k(part, idx))}
      `
    }

    const group = d.items[idx]
    return `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:start">
        <div style="position:sticky;top:24px">
          ${passageHTML(group.passage)}
        </div>
        <div>
          ${group.questions.map((q, j) => `
            <div style="margin-bottom:20px;background:white;border-radius:14px;border:1px solid #e2e8f0;padding:16px 18px;box-shadow:0 2px 8px rgba(0,0,0,.05)">
              <div style="display:inline-block;background:#2563eb;color:white;font-size:11px;font-weight:700;padding:2px 9px;border-radius:20px;margin-bottom:8px">${j + 1}</div>
              <p style="font-weight:600;font-size:14px;margin:0 0 10px;color:#0f172a;line-height:1.5">${q.q}</p>
              ${choices(q.options, state.answers[k(part, idx, j)], q.correct, k(part, idx, j))}
            </div>
          `).join('')}
        </div>
      </div>
    `
  }

  function render() {
    const { part, idx, done } = state
    const d = data[part]
    const total = d.items.length

    if (done) {
      const sc = totalScore()
      const pct = Math.round(sc.correct / sc.total * 100)
      app.innerHTML = `
        <div style="min-height:100vh;background:#f8faff;display:flex;align-items:center;justify-content:center">
          <div style="text-align:center;max-width:480px;padding:24px">
            <div style="font-size:56px;margin-bottom:16px">${pct >= 70 ? '🎉' : '📚'}</div>
            <h2 style="font-family:'Space Grotesk',sans-serif;font-size:28px;margin:0 0 8px">Kết quả Reading</h2>
            <p style="color:#64748b;margin:0 0 28px">Hoàn thành luyện tập</p>
            <div style="background:white;border-radius:20px;padding:32px;border:1px solid #e2e8f0;margin-bottom:24px">
              <div style="font-size:60px;font-weight:700;color:${pct >= 70 ? '#16a34a' : pct >= 50 ? '#f59e0b' : '#ef4444'};font-family:'Space Grotesk',sans-serif">${pct}%</div>
              <div style="color:#64748b;margin-top:8px">${sc.correct} / ${sc.total} câu đúng</div>
            </div>
            <div style="display:flex;gap:12px;justify-content:center">
              <button onclick="readRestart()" style="background:#2563eb;color:white;border:none;padding:13px 24px;border-radius:12px;cursor:pointer;font-weight:600">Làm lại</button>
              <button onclick="navigate('/toeic')" style="background:white;border:1px solid #e2e8f0;padding:13px 24px;border-radius:12px;cursor:pointer">← TOEIC Hub</button>
            </div>
          </div>
        </div>
      `
      return
    }

    app.innerHTML = `
      <div style="min-height:100vh;background:#f8faff">
        <div style="max-width:960px;margin:auto;padding:40px 24px">

          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">
            <button onclick="navigate('/toeic')" style="background:none;border:none;cursor:pointer;color:#64748b;font-size:14px;padding:0">← TOEIC Hub</button>
            <span style="font-size:13px;color:#64748b">Câu ${idx + 1} / ${total}</span>
          </div>

          <div style="display:flex;gap:8px;margin-bottom:24px;flex-wrap:wrap">
            ${[5, 6, 7].map(p => `
              <button onclick="readPart(${p})"
                style="padding:8px 16px;border-radius:20px;border:1px solid ${state.part === p ? '#2563eb' : '#e2e8f0'};background:${state.part === p ? '#2563eb' : 'white'};color:${state.part === p ? 'white' : '#475569'};cursor:pointer;font-size:13px;font-weight:${state.part === p ? 600 : 400}">
                Part ${p}
              </button>
            `).join('')}
          </div>

          <div style="margin-bottom:20px">
            <h2 style="font-size:20px;font-family:'Space Grotesk',sans-serif;margin:0 0 4px;color:#0f172a">${d.label}</h2>
            <p style="font-size:13px;color:#64748b;margin:0">${d.desc}</p>
          </div>

          <div style="background:#e2e8f0;border-radius:4px;height:4px;margin-bottom:28px">
            <div style="background:#16a34a;height:4px;border-radius:4px;transition:width .3s;width:${((idx + 1) / total) * 100}%"></div>
          </div>

          ${renderQ()}

          <div style="display:flex;justify-content:space-between;margin-top:28px">
            <button onclick="readNav(-1)" ${idx === 0 ? 'disabled' : ''} style="background:white;border:1px solid #e2e8f0;padding:12px 20px;border-radius:10px;cursor:pointer;color:#475569;opacity:${idx === 0 ? 0.4 : 1}">← Câu trước</button>
            ${idx === total - 1
              ? `<button onclick="readDone()" style="background:#16a34a;color:white;border:none;padding:12px 20px;border-radius:10px;cursor:pointer;font-weight:600">Nộp bài ✓</button>`
              : `<button onclick="readNav(1)" style="background:#16a34a;color:white;border:none;padding:12px 20px;border-radius:10px;cursor:pointer;font-weight:600">Câu tiếp →</button>`
            }
          </div>

        </div>
      </div>
    `
  }

  window.readPart    = p   => { state = { part: p, idx: 0, answers: {}, done: false }; render() }
  window.readNav     = dir => { state.idx += dir; render() }
  window.readAns     = (key, val) => { if (state.answers[key] !== undefined) return; state.answers[key] = val; render() }
  window.readDone    = ()  => { state.done = true; render() }
  window.readRestart = ()  => { state = { part: 5, idx: 0, answers: {}, done: false }; render() }

  render()
}
