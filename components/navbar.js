import { supabase } from '../supabase/client.js'

export async function navbar(){

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
  <div class="nav-center">

    <div class="menu-item">Khóa học</div>

    <!-- TOEIC DROPDOWN -->
    <div class="menu-item toeic-menu">
      TOEIC

      <div class="toeic-dropdown">
        <div onclick="navigate('/toeic')">🎯 4 Kỹ năng (Hub)</div>
        <div onclick="navigate('/toeic-lr')">📝 Full Test L&R</div>
        <div onclick="navigate('/toeic/vocabulary')">📚 Từ vựng</div>
      </div>
    </div>

    <div class="menu-item">IELTS</div>
    <!-- TIẾNG TRUNG DROPDOWN -->
    <div class="menu-item toeic-menu">
      Tiếng Trung

      <div class="toeic-dropdown">
        <div onclick="navigate('/chinese/pinyin')">🔤 Bảng Pinyin</div>
      </div>
    </div>
    <div class="menu-item toeic-menu">
      Giao tiếp

      <div class="toeic-dropdown">
        <div onclick="navigate('/english/ipa')">🔤 Bảng IPA</div>
      </div>
    </div>

  </div>

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
    padding:18px 60px;
    background:white;
    border-bottom:1px solid #eee;
    position:relative;
    z-index:100;
  }

  .nav-left{ flex:1; }

  .nav-center{
    flex:1;
    display:flex;
    justify-content:center;
    align-items:center;
    gap:36px;
    font-weight:500;
  }

  .nav-right{
    flex:1;
    display:flex;
    justify-content:flex-end;
    align-items:center;
  }

  .logo{
    height:45px;
    cursor:pointer;
  }

  .menu-item{
    cursor:pointer;
    position:relative;
  }

  .menu-item:hover{
    color:#2563eb;
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
    padding:10px 16px;
    border:none;
    border-radius:10px;
    background:#f1f5f9;
    cursor:pointer;
    font-size:14px;
  }

  .trial-btn{
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

  /* ===== TOEIC DROPDOWN FIX ===== */

  .toeic-menu{
    position:relative;
  }

  .toeic-dropdown{
    position:absolute;
    top:100%;
    left:0;

    background:white;
    border:1px solid #eee;
    border-radius:12px;
    width:230px;
    padding:6px;

    box-shadow:0 10px 25px rgba(0,0,0,0.08);

    display:none;

    opacity:0;
    transform:translateY(8px);
    transition:0.2s;
  }

  .toeic-dropdown div{
    padding:10px;
    border-radius:8px;
  }

  .toeic-dropdown div:hover{
    background:#f1f5f9;
  }

  /* hover mượt */
  .toeic-menu:hover .toeic-dropdown{
    display:block;
    opacity:1;
    transform:translateY(0);
  }

  /* nối hover tránh giật */
  .toeic-menu::after{
    content:"";
    position:absolute;
    top:100%;
    left:0;
    width:100%;
    height:10px;
  }

</style>

`
}
