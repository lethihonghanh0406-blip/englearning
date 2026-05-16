import vocabBodyPage   from './pages/vocab-body.js'
import pinyinPage      from './pages/pinyin.js'
import shadowingPage   from './pages/shadowing.js'
import ipaPage        from './pages/ipa.js'
import moviesPage     from './pages/movies.js'
import practicePage   from './pages/practice.js'
import toeicHub       from './pages/toeic.js'
import toeicListening from './pages/toeic-listening.js'
import toeicReading   from './pages/toeic-reading.js'
import toeicSpeaking  from './pages/toeic-speaking.js'
import toeicWriting   from './pages/toeic-writing.js'
import toeicVocab     from './pages/toeic-vocab.js'
import toeicLR        from './pages/toeic-lr.js'
import testPage       from './pages/test.js'
import quizPage       from './pages/quiz.js'
import pricingPage    from './pages/pricing.js'
import vocabSrsPage   from './pages/vocab-srs.js'
import { supabase }   from './supabase/client.js'
import { requireAuth } from './utils/auth.js'

const app  = document.getElementById("app")
const home = document.getElementById("home")

function showPage(fn, params) {
  home.style.display = "none"
  app.style.display  = "block"
  fn(app, params)
}

function router() {
  const path   = window.location.pathname
  const params = new URLSearchParams(window.location.search)

  if      (path === '/toeic')            showPage(toeicHub)
  else if (path === '/toeic/listening')  showPage(toeicListening)
  else if (path === '/toeic/reading')    showPage(toeicReading)
  else if (path === '/toeic/speaking')   showPage(toeicSpeaking)
  else if (path === '/toeic/writing')    showPage(toeicWriting)
  else if (path === '/toeic/vocabulary') requireAuth(() => showPage(toeicVocab))
  else if (path === '/toeic-lr')         requireAuth(() => showPage(toeicLR))
  else if (path === '/test')             requireAuth(() => showPage(testPage, params))
  else if (path === '/quiz')             requireAuth(() => showPage(quizPage, params))
  else if (path === '/pricing')          showPage(pricingPage)
  else if (path === '/vocab/review')     requireAuth(() => showPage(vocabSrsPage))
  else if (path === '/chinese/pinyin')    showPage(pinyinPage)
  else if (path === '/chinese/shadowing') showPage(shadowingPage)
  else if (path === '/english/ipa')       showPage(ipaPage)
  else if (path === '/english/movies')    showPage(moviesPage)
  else if (path === '/english/practice')  showPage(practicePage)
  else if (path === '/english/vocab')     showPage(vocabBodyPage)
  else {
    home.style.display = "block"
    app.style.display  = "none"
    app.innerHTML      = ""
  }
}

window.navigate = (url) => {
  history.pushState({}, "", url)
  router()
}

window.addEventListener("popstate", router)

// Xử lý điều hướng từ dashboard.html hoặc các trang ngoài SPA
const llNav = sessionStorage.getItem('ll_nav')
if (llNav) {
  sessionStorage.removeItem('ll_nav')
  history.replaceState({}, '', llNav)
}

router()

// After OAuth redirect: return to the page user was trying to access
;(async () => {
  const returnPath = sessionStorage.getItem('authReturnPath')
  if (!returnPath) return
  const { data: { session } } = await supabase.auth.getSession()
  if (session) {
    sessionStorage.removeItem('authReturnPath')
    navigate(returnPath)
  }
})()
