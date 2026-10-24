import { supabase } from '../supabase/client.js'

// Main menu: [path, icon, label, tag]
const NAV_LINKS = [
  ['/english/effortless', '🎧', 'Effortless<span class="nav-long"> English</span>', 'Mới'],
  ['/english/ipa',        '🔤', 'Bảng IPA'],
  ['/english/practice',   '🎯', 'Luyện tập'],
]

// The navbar is rendered once, so re-mark the current section after every SPA navigation
function markActive() {
  document.querySelectorAll('.nav-link').forEach(a => a.classList.toggle('on', location.pathname.startsWith(a.dataset.path)))
}
if (!window.__navActiveHook) {
  window.__navActiveHook = true
  const push = history.pushState
  history.pushState = function (...args) { push.apply(this, args); markActive() }
  addEventListener('popstate', markActive)
}

export async function navbar(){
  setTimeout(markActive, 0)

const { data } = await supabase.auth.getSession()

window.navLoginGoogle = async () => {
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/dashboard.html` }
  })
}

let userHTML = `
  <div style="display:flex;align-items:center;gap:10px">
    <button class="login-btn" onclick="location.href='/login.html'">Đăng nhập</button>
    <button class="trial-btn" onclick="navLoginGoogle()">🚀 Học thử</button>
  </div>
`

if(data.session){
const user = data.session.user

const name =
  user.user_metadata?.name ||
  user.user_metadata?.full_name ||
  user.email

const avatar =
  user.user_metadata?.picture ||
  user.user_metadata?.avatar_url ||
  null

// Check pro plan
const { data: profile } = await supabase
  .from('profiles').select('plan, plan_expires_at').eq('id', user.id).single()

// Track device
;(async () => {
  try {
    let deviceId = localStorage.getItem('ll_device_id')
    if (!deviceId) {
      deviceId = crypto.randomUUID()
      localStorage.setItem('ll_device_id', deviceId)
    }
    const ua = navigator.userAgent
    let type = 'desktop', name = 'Desktop'
    if (/iPhone/i.test(ua))              { type = 'phone';   name = 'iPhone' }
    else if (/iPad/i.test(ua))           { type = 'tablet';  name = 'iPad' }
    else if (/Android.*Mobile/i.test(ua)){ type = 'phone';   name = 'Android' }
    else if (/Android/i.test(ua))        { type = 'tablet';  name = 'Android Tablet' }
    else if (/Mac/i.test(ua))            { name = 'Mac' }
    else if (/Windows/i.test(ua))        { name = 'Windows' }
    await supabase.from('user_devices').upsert({
      id: deviceId,
      user_id: user.id,
      device_type: type,
      device_name: name,
      last_seen_at: new Date().toISOString(),
    }, { onConflict: 'id' })
  } catch(e) {}
})()

const isPro = profile?.plan === 'pro' &&
  (!profile.plan_expires_at || new Date(profile.plan_expires_at) > new Date())

window.navToggleMenu = () => {
  document.getElementById('user-dropdown')?.classList.toggle('open')
}

window.navLogout = async () => {
  await supabase.auth.signOut()
  window.location.reload()
}

setTimeout(() => {
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.user-box')) {
      document.getElementById('user-dropdown')?.classList.remove('open')
    }
  })
}, 0)

userHTML = `
  <div style="display:flex;align-items:center;gap:10px">
    ${!isPro ? `
      <button onclick="navigate('/pricing')"
        style="display:flex;align-items:center;gap:6px;padding:8px 16px;border:none;border-radius:10px;background:linear-gradient(135deg,#f59e0b,#d97706);color:white;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 2px 8px rgba(217,119,6,.3)">
        👑 Nâng cấp Pro
      </button>` : ''}
    <div class="user-box" onclick="navToggleMenu()">
      ${avatar
        ? `<img src="${avatar}" class="avatar-img" referrerpolicy="no-referrer">`
        : `<div class="avatar-fallback">${name[0]}</div>`
      }
      <span class="username">${name}</span>
      ${isPro ? `<span style="font-size:10px;font-weight:700;background:#fef9c3;color:#92400e;border-radius:6px;padding:1px 6px;margin-left:2px">PRO</span>` : ''}
      <span class="chevron">▾</span>

      <div class="user-dropdown" id="user-dropdown">
        <div onclick="event.stopPropagation();location.href='/dashboard.html'">🏠 Dashboard</div>
        ${!isPro ? `<div onclick="event.stopPropagation();navigate('/pricing')" style="color:#d97706">👑 Nâng cấp Pro</div>` : ''}
        <div onclick="event.stopPropagation();navLogout()" style="color:#ef4444">🚪 Đăng xuất</div>
      </div>
    </div>
  </div>
`

}

return ` <div class="nav">

  <!-- LEFT -->
  <div class="nav-left">
    <img src="https://trehfvxlqfshfhcapqca.supabase.co/storage/v1/object/public/avatars/logo-full.png" class="logo" onclick="navigate('/')">
  </div>

  <!-- CENTER -->
  <nav class="nav-center">
    ${NAV_LINKS.map(([path, icon, label, tag]) => `
      <a class="nav-link" data-path="${path}" onclick="navigate('${path}')">
        <span class="nav-ic">${icon}</span>${label}${tag ? `<span class="nav-tag">${tag}</span>` : ''}
      </a>`).join('')}
  </nav>

  <!-- RIGHT -->
  <div class="nav-right">
    ${userHTML}
  </div>

</div>

<style>

  .nav{
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:16px;
    padding:10px 40px;
    background:rgba(255,255,255,.92);
    backdrop-filter:blur(8px);
    border-bottom:1px solid #e2e8f0;
    position:sticky;
    top:0;
    z-index:100;
  }

  .nav-left{ flex:1; }

  .nav-center{
    flex:1;
    display:flex;
    justify-content:center;
    align-items:center;
    gap:4px;
    font-weight:500;
    font-size:15px;
    color:#334155;
  }

  .nav-right{
    flex:1;
    display:flex;
    justify-content:flex-end;
    align-items:center;
  }

  .logo{
    height:42px;
    cursor:pointer;
    display:block;
  }

  .nav-link{
    display:flex;
    align-items:center;
    gap:8px;
    padding:8px 16px;
    border-radius:999px;
    cursor:pointer;
    white-space:nowrap;
    color:#334155;
    text-decoration:none;
    transition:background .15s,color .15s;
  }

  .nav-link:hover{ background:#f1f5f9; color:#0f172a; }
  .nav-link.on{ background:#eff6ff; color:#1d4ed8; font-weight:600; }
  .nav-ic{ font-size:16px; line-height:1; }

  .nav-tag{
    font-size:10px;
    font-weight:700;
    color:#fff;
    background:#f97316;
    border-radius:6px;
    padding:1px 6px;
  }

  /* USER */
  .user-box{
    display:flex;
    align-items:center;
    gap:10px;
    position:relative;
    cursor:pointer;
    padding:6px 10px;
    border-radius:10px;
  }

  .user-box:hover{
    background:#f1f5f9;
  }

  .chevron{
    font-size:12px;
    color:#94a3b8;
  }

  .user-dropdown{
    display:none;
    position:absolute;
    top:calc(100% + 8px);
    right:0;
    background:white;
    border:1px solid #e2e8f0;
    border-radius:12px;
    width:170px;
    padding:6px;
    box-shadow:0 8px 24px rgba(0,0,0,0.1);
    z-index:100;
  }

  .user-dropdown.open{
    display:block;
  }

  .user-dropdown div{
    padding:10px 12px;
    border-radius:8px;
    cursor:pointer;
    font-size:14px;
    color:#374151;
  }

  .user-dropdown div:hover{
    background:#f1f5f9;
  }

  .avatar-img{
    width:36px;
    height:36px;
    border-radius:50%;
  }

  .avatar-fallback{
    width:36px;
    height:36px;
    border-radius:50%;
    background:#2563eb;
    color:white;
    display:flex;
    align-items:center;
    justify-content:center;
  }

  .username{
    font-size:14px;
    font-weight:500;
  }

  .login-btn{
    white-space:nowrap;
    padding:10px 16px;
    border:none;
    border-radius:10px;
    background:#f1f5f9;
    cursor:pointer;
    font-size:14px;
  }

  .trial-btn{
    white-space:nowrap;
    padding:10px 18px;
    border:none;
    border-radius:10px;
    background:#2563eb;
    color:white;
    cursor:pointer;
    font-weight:600;
    font-size:14px;
  }

  .trial-btn:hover{
    background:#1d4ed8;
  }

  @media (max-width:1000px){
    .nav{ padding:10px 16px; flex-wrap:wrap; row-gap:8px; }
    .nav-left,.nav-right{ flex:1 1 auto; }
    .nav-center{ order:3; flex:1 1 100%; justify-content:flex-start; overflow-x:auto; font-size:14px; }
    .nav-link{ padding:6px 12px; }
    .username{ display:none; }
    .logo{ height:32px; }
    .login-btn,.trial-btn{ padding:8px 12px; font-size:13px; }
  }

  @media (max-width:480px){
    .nav-center{ justify-content:space-between; gap:2px; font-size:13px; }
    .nav-link{ padding:6px 8px; gap:5px; }
    .nav-ic{ font-size:14px; }
    .nav-tag,.nav-long{ display:none; }
    .login-btn{ display:none; }
  }

</style>

`
}
