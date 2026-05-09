import { supabase } from '../supabase/client.js'

const BANK = {
  name:    'BIDV',
  code:    'BIDV',
  account: '96247NOVA',
  holder:  'LE THI HONG HANH',
  prefix:  'LEARNLANG',
}

const PLANS = [
  {
    id:       'monthly',
    label:    '1 Tháng',
    price:    79_000,
    sub:      'Dùng thử linh hoạt',
    badge:    null,
    days:     30,
    highlight: false,
  },
  {
    id:       'yearly',
    label:    '1 Năm',
    price:    599_000,
    sub:      'Tiết kiệm 37% so với tháng',
    badge:    '🔥 Phổ biến nhất',
    days:     365,
    highlight: true,
  },
  {
    id:       'lifetime',
    label:    'Trọn đời',
    price:    1_280_000,
    sub:      'Một lần · dùng mãi mãi',
    badge:    '⭐ Tốt nhất',
    days:     null,
    highlight: false,
  },
]

const FEATURES = [
  ['🌐', 'Đọc song ngữ EN–VI theo từng câu'],
  ['📊', 'Thống kê & báo cáo chi tiết'],
  ['🔖', 'Lưu từ vựng & ôn tập thông minh'],
  ['⚡', 'Truy cập không giới hạn tất cả đề thi'],
  ['🎯', 'Luyện tập theo từng kỹ năng chuyên sâu'],
]

export default async function pricingPage(app) {
  app.innerHTML = `
    <div style="min-height:100vh;background:#f5f7fa;display:flex;align-items:center;justify-content:center">
      <div style="text-align:center;color:#64748b">
        <div style="font-size:36px;margin-bottom:12px">⏳</div>
        <p style="font-size:14px">Đang tải...</p>
      </div>
    </div>`

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) { renderGuest(app); return }

  const uid = session.user.id
  const { data: profile } = await supabase
    .from('profiles').select('plan, plan_expires_at').eq('id', uid).single()

  const isPro = profile?.plan === 'pro' &&
    (!profile.plan_expires_at || new Date(profile.plan_expires_at) > new Date())

  if (isPro) { renderAlreadyPro(app, profile); return }

  renderPlans(app, uid)
}

// ── 1. Chọn plan ─────────────────────────────────────────────────────────────
function renderPlans(app, uid) {
  app.innerHTML = `
    <div style="min-height:100vh;background:linear-gradient(160deg,#eff6ff 0%,#f0fdf4 100%);padding:48px 20px">
      <div style="max-width:860px;margin:auto">

        <!-- Header -->
        <div style="text-align:center;margin-bottom:40px">
          <div style="display:inline-flex;align-items:center;gap:8px;background:#fef9c3;border:1px solid #fde68a;border-radius:20px;padding:6px 16px;margin-bottom:18px">
            <span style="font-size:14px">👑</span>
            <span style="font-size:13px;font-weight:600;color:#92400e">LearnLang Pro</span>
          </div>
          <h1 style="font-size:34px;font-weight:800;color:#0f172a;margin:0 0 10px;font-family:'Space Grotesk',sans-serif;line-height:1.2">
            Nâng cấp để học<br>hiệu quả hơn
          </h1>
          <p style="font-size:15px;color:#64748b;margin:0">Mở khóa toàn bộ tính năng Premium với giá cực hợp lý</p>
        </div>

        <!-- Plan cards -->
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:28px">
          ${PLANS.map(p => planCard(p)).join('')}
        </div>

        <!-- Features -->
        <div style="background:white;border:1px solid #e2e8f0;border-radius:18px;padding:24px;box-shadow:0 2px 12px rgba(0,0,0,.04)">
          <div style="font-size:12px;font-weight:700;color:#94a3b8;letter-spacing:.8px;margin-bottom:16px;text-align:center">TẤT CẢ CÁC GÓI ĐỀU BAO GỒM</div>
          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px">
            ${FEATURES.map(([ic, tx]) => `
              <div style="display:flex;align-items:center;gap:10px;font-size:14px;color:#374151">
                <span style="font-size:18px;flex-shrink:0">${ic}</span>${tx}
              </div>`).join('')}
          </div>
        </div>

      </div>
    </div>`

  window.pricingSelectPlan = async (planId) => {
    const plan = PLANS.find(p => p.id === planId)
    if (!plan) return

    // Loading trên card
    const btn = document.getElementById(`plan-btn-${planId}`)
    if (btn) { btn.textContent = '⏳ Đang tạo...'; btn.disabled = true }

    // Lấy hoặc tạo payment cho plan này
    const { data: existing } = await supabase
      .from('payments').select('*')
      .eq('user_id', uid).eq('status', 'pending').eq('plan', planId)
      .order('created_at', { ascending: false }).limit(1).single()

    let payment = existing
    if (!payment) {
      const code = Math.floor(10000 + Math.random() * 90000)
      const { data: created, error } = await supabase
        .from('payments')
        .insert({
          user_id: uid,
          transfer_code: `${BANK.prefix} ${code}`,
          amount: plan.price,
          plan: planId,
          duration_days: plan.days,
        })
        .select('*').single()
      if (error) { alert('Lỗi: ' + error.message); return }
      payment = created
    }

    renderPayment(app, payment, plan)
  }
}

function planCard(p) {
  const border = p.highlight ? '#2563eb' : '#e2e8f0'
  const bg     = p.highlight ? 'white' : 'white'
  const shadow = p.highlight ? '0 8px 32px rgba(37,99,235,.15)' : '0 2px 12px rgba(0,0,0,.05)'

  return `
    <div style="background:${bg};border:2px solid ${border};border-radius:18px;padding:24px;position:relative;box-shadow:${shadow};display:flex;flex-direction:column">
      ${p.badge ? `
        <div style="position:absolute;top:-12px;left:50%;transform:translateX(-50%);white-space:nowrap;
          background:${p.highlight?'#2563eb':'#6366f1'};color:white;font-size:11px;font-weight:700;padding:3px 14px;border-radius:20px">
          ${p.badge}
        </div>` : ''}

      <div style="margin-bottom:4px;font-size:13px;font-weight:600;color:${p.highlight?'#2563eb':'#94a3b8'}">${p.label}</div>
      <div style="display:flex;align-items:baseline;gap:2px;margin-bottom:6px">
        <span style="font-size:30px;font-weight:800;color:#0f172a;font-family:'Space Grotesk',sans-serif">
          ${(p.price/1000).toLocaleString('vi-VN')}k
        </span>
        <span style="font-size:13px;color:#94a3b8;margin-left:2px">đ</span>
      </div>
      <div style="font-size:12px;color:#64748b;margin-bottom:20px;flex:1">${p.sub}</div>
      <button id="plan-btn-${p.id}" onclick="pricingSelectPlan('${p.id}')"
        style="width:100%;padding:12px;border:none;border-radius:12px;cursor:pointer;font-size:14px;font-weight:700;
          background:${p.highlight?'#2563eb':'#f1f5f9'};
          color:${p.highlight?'white':'#374151'};
          box-shadow:${p.highlight?'0 4px 14px rgba(37,99,235,.3)':'none'};
          transition:all .15s">
        Chọn gói này
      </button>
    </div>`
}

// ── 2. Thanh toán ─────────────────────────────────────────────────────────────
function renderPayment(app, payment, plan) {
  let checkCount = 0
  let pollInterval = null

  const qrUrl = `https://img.vietqr.io/image/${BANK.code}-${BANK.account}-compact2.png` +
    `?amount=${payment.amount}` +
    `&addInfo=${encodeURIComponent(payment.transfer_code)}` +
    `&accountName=${encodeURIComponent(BANK.holder)}`

  app.innerHTML = `
    <div style="min-height:100vh;background:#f5f7fa;display:flex;align-items:center;justify-content:center;padding:20px">
      <div style="background:white;border-radius:22px;max-width:480px;width:100%;overflow:hidden;box-shadow:0 24px 64px rgba(0,0,0,0.12)">

        <!-- Header -->
        <div style="background:linear-gradient(135deg,#fef3c7,#fde68a);padding:16px 20px;display:flex;align-items:center;gap:12px">
          <button onclick="navigate('/pricing')" style="background:rgba(0,0,0,.08);border:none;border-radius:8px;padding:6px 10px;cursor:pointer;font-size:13px;color:#78350f;font-weight:600">← Quay lại</button>
          <div style="flex:1">
            <div style="font-size:16px;font-weight:700;color:#78350f;font-family:'Space Grotesk',sans-serif">Thanh toán PRO · ${plan.label}</div>
            <div style="font-size:12px;color:#92400e">${plan.sub}</div>
          </div>
          <div style="font-size:18px;font-weight:800;color:#78350f;font-family:'Space Grotesk',sans-serif">${payment.amount.toLocaleString('vi-VN')}đ</div>
        </div>

        <div style="padding:24px">

          <!-- QR + Bank -->
          <div style="display:flex;gap:20px;align-items:flex-start;margin-bottom:20px">
            <div style="flex-shrink:0;text-align:center">
              <div style="width:148px;height:148px;border-radius:14px;border:1.5px solid #e2e8f0;overflow:hidden;background:#f8faff">
                <img src="${qrUrl}" style="width:100%;height:100%;object-fit:contain"
                  onerror="this.parentElement.innerHTML='<div style=\\'display:flex;align-items:center;justify-content:center;height:100%;font-size:40px\\'>📱</div>'">
              </div>
              <p style="font-size:11px;color:#94a3b8;margin:7px 0 0;line-height:1.4;width:148px">
                Quét QR – nội dung sẽ được <strong>điền tự động</strong>
              </p>
            </div>

            <div style="flex:1;display:flex;flex-direction:column;gap:13px;padding-top:2px">
              ${[
                ['Ngân hàng',     BANK.name],
                ['Số tài khoản',  `<strong>${BANK.account}</strong>`],
                ['Chủ tài khoản', BANK.holder],
                ['Số tiền',       `<span style="color:#2563eb;font-weight:700">${payment.amount.toLocaleString('vi-VN')}đ</span>`],
              ].map(([lb, v]) => `
                <div>
                  <div style="font-size:11px;color:#94a3b8;margin-bottom:1px">${lb}</div>
                  <div style="font-size:14px;color:#0f172a">${v}</div>
                </div>`).join('')}
            </div>
          </div>

          <!-- Transfer code -->
          <div style="background:#fffbeb;border:1.5px solid #fcd34d;border-radius:14px;padding:16px;margin-bottom:14px">
            <div style="font-size:12px;font-weight:600;color:#92400e;margin-bottom:10px">
              ⚠️ Nội dung chuyển khoản (bắt buộc – <u>không được thay đổi</u>):
            </div>
            <div style="display:flex;align-items:center;gap:10px;background:white;border:1.5px solid #fcd34d;border-radius:10px;padding:11px 14px">
              <span style="flex:1;font-size:15px;font-weight:700;color:#0f172a;letter-spacing:.5px">${payment.transfer_code}</span>
              <button id="pricing-copy-btn" onclick="pricingCopyCode()"
                style="background:#f59e0b;color:white;border:none;border-radius:8px;padding:6px 14px;cursor:pointer;font-size:12px;font-weight:700;flex-shrink:0;transition:all .15s">
                Sao chép
              </button>
            </div>
            <p style="font-size:12px;color:#dc2626;margin:8px 0 0;line-height:1.5">
              ✗ KHÔNG chỉnh sửa nội dung. Hệ thống sẽ không nhận diện được nếu bị thay đổi.
            </p>
          </div>

          <!-- Polling -->
          <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:14px;padding:14px">
            <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:6px">
              <div style="width:18px;height:18px;border:2.5px solid #0284c7;border-top-color:transparent;border-radius:50%;animation:pricingSpin 1s linear infinite;flex-shrink:0;margin-top:2px"></div>
              <div style="font-size:13px;color:#0369a1;line-height:1.6">
                Chuyển khoản qua QR → tài khoản nâng cấp <strong>tự động trong vài giây.</strong>
              </div>
            </div>
            <p id="pricing-poll-status" style="font-size:12px;color:#94a3b8;margin:0;padding-left:28px">Đang chờ giao dịch...</p>
          </div>

        </div>
      </div>
    </div>
    <style>@keyframes pricingSpin { to { transform:rotate(360deg) } }</style>`

  window.pricingCopyCode = () => {
    navigator.clipboard.writeText(payment.transfer_code).then(() => {
      const btn = document.getElementById('pricing-copy-btn')
      if (!btn) return
      btn.textContent = '✓ Đã sao chép'
      btn.style.background = '#16a34a'
      setTimeout(() => { btn.textContent = 'Sao chép'; btn.style.background = '#f59e0b' }, 2000)
    })
  }

  pollInterval = setInterval(async () => {
    checkCount++
    const el = document.getElementById('pricing-poll-status')
    if (el) el.textContent = `Đã kiểm tra ${checkCount} lần • đang chờ giao dịch...`

    const { data } = await supabase
      .from('payments').select('status').eq('id', payment.id).single()

    if (data?.status === 'confirmed') {
      clearInterval(pollInterval)
      renderSuccess(app, plan)
    }
  }, 5000)
}

// ── Success ──────────────────────────────────────────────────────────────────
function renderSuccess(app, plan) {
  const expText = plan.days
    ? `${plan.label} (hết hạn sau ${plan.days} ngày)`
    : 'Trọn đời · không hết hạn'

  app.innerHTML = `
    <div style="min-height:100vh;background:#f5f7fa;display:flex;align-items:center;justify-content:center;padding:20px">
      <div style="background:white;border-radius:22px;padding:48px 36px;max-width:420px;width:100%;text-align:center;box-shadow:0 24px 64px rgba(0,0,0,.12);animation:pricingPop .3s ease">
        <div style="font-size:60px;margin-bottom:16px">🎉</div>
        <h2 style="font-size:24px;font-weight:700;color:#0f172a;margin:0 0 6px;font-family:'Space Grotesk',sans-serif">Thanh toán thành công!</h2>
        <div style="display:inline-block;background:#fef9c3;border:1px solid #fde68a;border-radius:20px;padding:4px 14px;font-size:13px;font-weight:600;color:#92400e;margin-bottom:20px">
          👑 ${expText}
        </div>
        <p style="font-size:14px;color:#64748b;margin:0 0 28px;line-height:1.7">
          Tài khoản đã được kích hoạt <strong style="color:#d97706">PRO</strong>. Enjoy! 🚀
        </p>
        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:14px;padding:14px;margin-bottom:24px;text-align:left">
          ${FEATURES.map(([ic, tx]) => `
            <div style="display:flex;align-items:center;gap:10px;font-size:13px;color:#374151;padding:5px 0;border-bottom:1px solid #fef9c3">
              <span>${ic}</span>${tx}
            </div>`).join('')}
        </div>
        <button onclick="navigate('/toeic-lr')"
          style="width:100%;padding:14px;background:linear-gradient(135deg,#f59e0b,#d97706);color:white;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;box-shadow:0 4px 14px rgba(217,119,6,.3)">
          Bắt đầu luyện tập →
        </button>
      </div>
    </div>
    <style>@keyframes pricingPop { from { opacity:0;transform:scale(.94) } to { opacity:1;transform:none } }</style>`
}

// ── Already pro ──────────────────────────────────────────────────────────────
function renderAlreadyPro(app, profile) {
  const expires = profile.plan_expires_at
    ? `Hết hạn: ${new Date(profile.plan_expires_at).toLocaleDateString('vi-VN')}`
    : 'Trọn đời · không hết hạn'

  app.innerHTML = `
    <div style="min-height:100vh;background:#f5f7fa;display:flex;align-items:center;justify-content:center;padding:20px">
      <div style="background:white;border-radius:22px;padding:48px 36px;max-width:400px;width:100%;text-align:center;box-shadow:0 24px 64px rgba(0,0,0,.12)">
        <div style="font-size:56px;margin-bottom:16px">👑</div>
        <h2 style="font-size:22px;font-weight:700;color:#92400e;margin:0 0 6px;font-family:'Space Grotesk',sans-serif">Bạn đang dùng Pro!</h2>
        <p style="font-size:13px;color:#94a3b8;margin:0 0 24px">${expires}</p>
        <button onclick="navigate('/toeic-lr')"
          style="width:100%;padding:13px;background:#2563eb;color:white;border:none;border-radius:12px;font-size:15px;font-weight:600;cursor:pointer">
          ← Về luyện tập
        </button>
      </div>
    </div>`
}

// ── Guest ────────────────────────────────────────────────────────────────────
function renderGuest(app) {
  app.innerHTML = `
    <div style="min-height:100vh;background:#f5f7fa;display:flex;align-items:center;justify-content:center;padding:20px">
      <div style="background:white;border-radius:22px;padding:48px 36px;max-width:400px;width:100%;text-align:center;box-shadow:0 24px 64px rgba(0,0,0,.12)">
        <div style="font-size:56px;margin-bottom:16px">🔐</div>
        <h2 style="font-size:22px;font-weight:700;color:#0f172a;margin:0 0 8px">Đăng nhập để nâng cấp</h2>
        <p style="font-size:14px;color:#64748b;margin:0 0 24px">Bạn cần đăng nhập trước khi thanh toán.</p>
        <button onclick="location.href='/login.html'"
          style="width:100%;padding:13px;background:#2563eb;color:white;border:none;border-radius:12px;font-size:15px;font-weight:600;cursor:pointer">
          Đăng nhập
        </button>
      </div>
    </div>`
}
