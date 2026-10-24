// Effortless English section: /english/effortless[/guide|/lessons|/lesson/<slug>|/vocabulary|/practice|/progress|/notes]
import { BASE, loadLessons, loadUser, startStudyTimer, flushStudy } from './store.js'
import { loading, paywall } from './ui.js'
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
  await loadUser()                                   // first: which lessons are open depends on the plan
  const lessons = await loadLessons()
  const open    = lessons.filter(l => !l.locked)

  const sub = location.pathname.slice(BASE.length).replace(/\/$/, '')
  const ctx = { app, lessons, params: params || new URLSearchParams(location.search), onLeave: fn => { cleanup = fn } }
  const slug = decodeURIComponent(sub.slice(8))

  const target = sub.startsWith('/lesson/') && lessons.find(l => l.slug === slug)

  if      (target?.locked)              paywall(app, target, open[0]?.slug)
  else if (sub.startsWith('/lesson/'))  lessonView(ctx, slug)
  else if (sub === '/lessons')          lessonsView(ctx)
  else if (sub === '/vocabulary')       vocabView({ ...ctx, lessons: open })
  else if (sub === '/practice')         practiceView({ ...ctx, lessons: open })
  else if (sub === '/progress')         progressView(ctx)
  else if (sub === '/notes')            notesView(ctx)
  else if (sub === '/guide')            guideView(ctx)
  else                                  dashboardView(ctx)
  window.scrollTo(0, 0)
}
