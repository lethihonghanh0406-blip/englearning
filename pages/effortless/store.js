// Effortless English — lesson data (Supabase) + learner progress (localStorage, per user)
import { supabase } from '../../supabase/client.js'
import { SUPABASE_URL } from '../../config/env.js'

export const BASE = '/english/effortless'

export const LEVELS = [
  ['beginner',     'Beginner'],
  ['elementary',   'Elementary'],
  ['intermediate', 'Intermediate'],
  ['advanced',     'Advanced'],
]

// Activities that make up one lesson
export const ACTIVITIES = [
  ['main',     'Main Audio'],
  ['ms',       'Mini-Story'],
  ['vocab',    'Từ vựng'],
  ['practice', 'Luyện tập'],
]

export const DAILY_GOAL_MIN = 15

let lessonsCache = null
let user = null

export async function loadLessons() {
  if (lessonsCache) return lessonsCache
  const { data } = await supabase.from('effortless_lessons').select('*').order('course').order('lesson_no')
  lessonsCache = data || []
  return lessonsCache
}

export async function loadUser() {
  const { data: { session } } = await supabase.auth.getSession()
  user = session?.user || null
  return user
}

export function getUser() { return user }

// Audio paths are full URLs or "bucket/path/file.mp3" in public Supabase Storage
export function audioUrl(path) {
  if (!path) return null
  if (/^https?:/.test(path)) return path
  return `${SUPABASE_URL}/storage/v1/object/public/${path.split('/').map(encodeURIComponent).join('/')}`
}

export function mainLines(lesson) {
  return (lesson?.main_story || []).map(([t, text, vi]) => ({ t, text, vi }))
}
export function msLines(lesson) {
  return (lesson?.mini_story || []).map(([t, type, text]) => ({ t, type, text }))
}
export function vocabItems(lesson) {
  return (lesson?.vocab || []).map(([word, ipa, vi]) => ({ word, ipa, vi, slug: lesson.slug, lesson }))
}

// First Main Story sentence that uses the word (or its first word, for phrases)
export function exampleFor(lesson, word) {
  const head = word.toLowerCase().split(' ')[0].replace(/e$/, '')
  return mainLines(lesson).find(l => l.text.toLowerCase().includes(head) && l.t > 1)?.text || ''
}

// ── Progress state ───────────────────────────────────────────────────────────
// { lessons: { slug: { done: {main,ms,vocab,practice}, completed } },
//   days: { 'YYYY-MM-DD': { listen: sec, speak: sec } },
//   saved: [word], notes: [{ id, slug, t, text, at }], last: slug, settings: {} }
function key() { return `ee_progress_${user?.id || 'guest'}` }
function empty() { return { lessons: {}, days: {}, saved: [], notes: [], last: null, settings: {} } }

export function getState() {
  try { return { ...empty(), ...JSON.parse(localStorage.getItem(key())) } } catch { return empty() }
}
export function update(fn) {
  const s = getState()
  fn(s)
  try { localStorage.setItem(key(), JSON.stringify(s)) } catch {}
  return s
}

export function today(offset = 0) {
  const d = new Date()
  d.setDate(d.getDate() - offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function addTime(kind, sec) {
  if (sec <= 0) return
  update(s => {
    const d = s.days[today()] ||= { listen: 0, speak: 0 }
    d[kind] = (d[kind] || 0) + sec
  })
}

export function markActivity(slug, act) {
  update(s => {
    const l = s.lessons[slug] ||= { done: {}, completed: false }
    l.done[act] = true
    if (ACTIVITIES.every(([a]) => l.done[a])) l.completed = true
    s.last = slug
  })
}

export function setCompleted(slug, completed) {
  update(s => { (s.lessons[slug] ||= { done: {}, completed: false }).completed = completed })
}

export function lessonProgress(slug, s = getState()) {
  const l = s.lessons[slug] || { done: {}, completed: false }
  const done = ACTIVITIES.filter(([a]) => l.done[a]).length
  return { done, total: ACTIVITIES.length, completed: !!l.completed }
}

export function streak(s = getState()) {
  const active = off => { const d = s.days[today(off)]; return d && (d.listen + d.speak) > 0 }
  let off = active(0) ? 0 : 1          // today not started yet → count from yesterday
  let n = 0
  while (active(off)) { n++; off++ }
  return n
}

export function totalSeconds(s = getState()) {
  return Object.values(s.days).reduce((sum, d) => sum + (d.listen || 0) + (d.speak || 0), 0)
}

// Lesson to resume: last opened unless completed, else first not completed
export function nextLesson(lessons, s = getState()) {
  const last = lessons.find(l => l.slug === s.last)
  if (last && !lessonProgress(last.slug, s).completed) return last
  return lessons.find(l => !lessonProgress(l.slug, s).completed) || last || lessons[0] || null
}

export function getSetting(k, def) { return getState().settings[k] ?? def }
export function setSetting(k, v) { update(s => { s.settings[k] = v }) }
