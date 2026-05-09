import { supabase } from '../supabase/client.js'

export async function requireAuth(callback) {
  const { data: { session } } = await supabase.auth.getSession()
  if (session) { callback(); return }
  showAuthModal()
}

// ── Plan / Pro gating ────────────────────────────────────────────────────────
let _planCache = null

export async function getUserPlan() {
  if (_planCache) return _planCache
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return 'free'
  const { data } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', session.user.id)
    .single()
  _planCache = data?.plan || 'free'
  return _planCache
}

export async function requirePro(callback) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) { showAuthModal(); return }
  const plan = await getUserPlan()
  if (plan === 'pro') { callback(); return }
  showProModal()
}

function showProModal() {
  document.getElementById('pro-gate-modal')?.remove()

  const modal = document.createElement('div')
  modal.id = 'pro-gate-modal'
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(3px)'
  modal.onclick = e => { if (e.target === modal) modal.remove() }

  modal.innerHTML = `
    <div style="background:white;border-radius:24px;padding:40px 32px;max-width:420px;width:100%;text-align:center;box-shadow:0 32px 80px rgba(0,0,0,0.22);animation:proPop .22s ease">
      <div style="width:72px;height:72px;background:linear-gradient(135deg,#fef9c3,#fde68a);border-radius:20px;display:flex;align-items:center;justify-content:center;font-size:36px;margin:0 auto 20px;box-shadow:0 4px 16px rgba(251,191,36,.3)">👑</div>
      <h2 style="font-size:22px;font-weight:700;color:#0f172a;margin:0 0 6px;font-family:'Space Grotesk',sans-serif">Tính năng Pro</h2>
      <p style="font-size:14px;color:#64748b;margin:0 0 24px;line-height:1.7">Nâng cấp lên <strong style="color:#d97706">LearnLang Pro</strong> để mở khóa chế độ song ngữ và nhiều tính năng nâng cao khác.</p>

      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:14px;padding:16px;margin-bottom:24px;text-align:left">
        ${[
          ['🌐','Đọc song ngữ EN–VI theo từng câu'],
          ['📊','Thống kê chi tiết & báo cáo tiến độ'],
          ['🔖','Lưu từ vựng & ôn tập thông minh'],
          ['⚡','Truy cập không giới hạn tất cả đề thi'],
        ].map(([ic,tx])=>`
          <div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid #fef3c7;font-size:14px;color:#374151">
            <span style="font-size:17px">${ic}</span>${tx}
          </div>`).join('').replace(/border-bottom[^"]*"[^>]*>((?!<div).)*$/, '')}
      </div>

      <button onclick="navigate('/pricing');document.getElementById('pro-gate-modal').remove()"
        style="width:100%;padding:14px;border:none;border-radius:12px;background:linear-gradient(135deg,#f59e0b,#d97706);color:white;font-size:15px;font-weight:700;cursor:pointer;box-shadow:0 4px 14px rgba(217,119,6,.35);margin-bottom:8px">
        👑 Nâng cấp Pro ngay
      </button>
      <button onclick="document.getElementById('pro-gate-modal').remove()"
        style="width:100%;padding:11px;border:none;border-radius:12px;background:transparent;color:#94a3b8;font-size:14px;cursor:pointer">
        Để sau
      </button>
    </div>
    <style>
      @keyframes proPop { from { opacity:0; transform:scale(.94) translateY(12px) } to { opacity:1; transform:none } }
    </style>`

  document.body.appendChild(modal)
}

function showAuthModal() {
  document.getElementById('auth-gate-modal')?.remove()

  const modal = document.createElement('div')
  modal.id = 'auth-gate-modal'
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(2px)'
  modal.onclick = e => { if (e.target === modal) modal.remove() }

  modal.innerHTML = `
    <div style="background:white;border-radius:22px;padding:44px 36px;max-width:400px;width:100%;text-align:center;box-shadow:0 28px 72px rgba(0,0,0,0.18);animation:authPop .2s ease">
      <div style="width:64px;height:64px;background:#eff6ff;border-radius:18px;display:flex;align-items:center;justify-content:center;font-size:30px;margin:0 auto 20px">🔐</div>
      <h2 style="font-size:22px;font-weight:700;color:#0f172a;margin:0 0 8px;font-family:'Space Grotesk',sans-serif">Đăng nhập để tiếp tục</h2>
      <p style="font-size:14px;color:#64748b;margin:0 0 28px;line-height:1.7">Tạo tài khoản miễn phí để lưu tiến độ,<br>lịch sử làm bài và theo dõi kết quả.</p>
      <button id="auth-gate-google-btn"
        style="width:100%;padding:14px;border:1.5px solid #e2e8f0;border-radius:12px;background:white;color:#0f172a;font-size:15px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;transition:all .15s"
        onmouseover="this.style.borderColor='#2563eb';this.style.background='#eff6ff'"
        onmouseout="this.style.borderColor='#e2e8f0';this.style.background='white'">
        <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.08 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-3.59-13.46-8.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/><path fill="none" d="M0 0h48v48H0z"/></svg>
        Đăng nhập với Google
      </button>
      <button onclick="document.getElementById('auth-gate-modal').remove()"
        style="width:100%;padding:11px;border:none;border-radius:12px;background:transparent;color:#94a3b8;font-size:14px;cursor:pointer;margin-top:6px">
        Để sau
      </button>
    </div>
    <style>
      @keyframes authPop { from { opacity:0; transform:scale(.95) translateY(10px) } to { opacity:1; transform:none } }
    </style>`

  document.body.appendChild(modal)

  document.getElementById('auth-gate-google-btn').onclick = async () => {
    sessionStorage.setItem('authReturnPath', window.location.pathname + window.location.search)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    })
  }
}
