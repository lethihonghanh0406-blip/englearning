// Effortless English section: /english/effortless[/guide|/lessons|/lesson/<slug>|/vocabulary|/practice|/progress|/notes]
import { BASE, loadLessons, loadUser, startStudyTimer, flushStudy } from './store.js'
import { loading } from './ui.js'
import dashboardView from './dashboard.js'
import lessonsView   from './lessons.js'
import lessonView    from './lesson.js'
import vocabView     from './vocabulary.js'
import practiceView  from './practice.js'
import progressView  from './progress.js'
import notesView     from './notes.js'
import guideView     from './guide.js'

let cleanup = null

export default async function effortlessPage(app, params) {
  cleanup?.()
  cleanup = null
  flushStudy()
  startStudyTimer()
  if (!app.firstChild || !app.querySelector('.ee')) loading(app)
  const [lessons] = await Promise.all([loadLessons(), loadUser()])

  const sub = location.pathname.slice(BASE.length).replace(/\/$/, '')
  const ctx = { app, lessons, params: params || new URLSearchParams(location.search), onLeave: fn => { cleanup = fn } }

  if      (sub.startsWith('/lesson/'))  lessonView(ctx, decodeURIComponent(sub.slice(8)))
  else if (sub === '/lessons')          lessonsView(ctx)
  else if (sub === '/vocabulary')       vocabView(ctx)
  else if (sub === '/practice')         practiceView(ctx)
  else if (sub === '/progress')         progressView(ctx)
  else if (sub === '/notes')            notesView(ctx)
  else if (sub === '/guide')            guideView(ctx)
  else                                  dashboardView(ctx)
  window.scrollTo(0, 0)
}
