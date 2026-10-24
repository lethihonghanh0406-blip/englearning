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
  ['vocab',    'Từ vựng & mẫu câu'],
  ['practice', 'Luyện tập'],
]

// The daily 45-minute routine (trang "Cách học"); a day counts toward the streak once it reaches the goal
export const ROUTINE = [
  { min: 10, tab: 'main', vi: false, icon: '🎧', title: 'Nghe lần đầu',
    desc: 'Nghe Main Audio (1–3 phút), nghe 2–3 lượt. Cố gắng hiểu ý chính, chưa cần tra từng từ.',
    tip: 'Tắt bản dịch, chỉ nghe. Không hiểu hết cũng không sao.' },
  { min: 10, tab: 'main', vi: true, icon: '📖', title: 'Hiểu nội dung',
    desc: 'Đọc transcript, xem nghĩa tiếng Việt và lưu lại 3–5 cụm từ hữu ích.',
    tip: 'Bấm ☆ ở tab Cụm từ / Từ vựng để lưu cụm từ vào danh sách của bạn.' },
  { min: 15, tab: 'ms', icon: '🗣', title: 'Hỏi và trả lời',
    desc: 'Nghe câu hỏi Mini-Story, tự trả lời thành tiếng. Nếu chưa phản xạ được, nghe câu trả lời mẫu rồi trả lời lại.',
    tip: 'Audio tự dừng sau mỗi câu hỏi. Câu trả lời ngắn 1–2 từ cũng được.' },
  { min: 10, tab: 'main', vi: false, icon: '🔁', title: 'Nghe lại và nói theo',
    desc: 'Nghe lại toàn bộ câu chuyện và nói theo (shadowing) từng câu, bắt chước ngữ điệu của người đọc.',
    tip: 'Bấm vào từng câu để nghe lại, rồi nói to theo ngay sau đó.' },
]
export const DAILY_GOAL_MIN = ROUTINE.reduce((n, r) => n + r.min, 0)

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
// Mini-Story parts: lessons with several mini stories (A, B, …) list them in ms_parts
export function msParts(lesson) {
  const parts = lesson?.ms_parts?.length ? lesson.ms_parts
    : [{ label: '', audio: lesson?.ms_audio, story: lesson?.mini_story || [] }]
  return parts.map(p => ({ label: p.label, audio: p.audio, lines: p.story.map(([t, type, text]) => ({ t, type, text })) }))
}
export function msLines(lesson, part = 0) {
  return msParts(lesson)[part]?.lines || []
}
export function vocabItems(lesson) {
  return (lesson?.vocab || []).map(([word, ipa, vi]) => ({ word, ipa, vi, slug: lesson.slug, lesson }))
}

export function phraseItems(lesson) {
  return (lesson?.phrases || []).map(([en, vi]) => ({ en, vi, slug: lesson.slug, lesson }))
}

// Speaking patterns: "I'm curious about + N" → key "I'm curious about" must appear in the learner's sentence.
// An optional 4th field lists the keys explicitly ("weigh|weighs|weighed" = any of them), for structures
// like "Present perfect + since" where the text before "+" isn't a word the learner says.
export function patternItems(lesson) {
  return (lesson?.patterns || []).map(([structure, example, vi, keys]) => {
    const alts = (keys || structure.split('+')[0]).split('|').map(k => k.trim())
    return { structure, example, vi, key: alts[0], keys: alts }
  })
}

const normSpeech = s => ` ${s.toLowerCase().replace(/[’']/g, "'").replace(/\bi'm\b/g, 'i am').replace(/[^a-z' ]/g, ' ').replace(/\s+/g, ' ').trim()} `

// Did the learner use the pattern, in a sentence of their own?
export function checkPattern(pattern, sentence) {
  const s = normSpeech(sentence)
  const key = pattern.keys.map(normSpeech).find(k => s.includes(k))
  if (!key) return { ok: false, msg: `Câu chưa có cấu trúc “${pattern.key}”.` }
  if (s.trim().split(' ').length < key.trim().split(' ').length + 1) return { ok: false, msg: 'Câu còn thiếu phần sau cấu trúc — hãy nói trọn câu.' }
  if (s === normSpeech(pattern.example)) return { ok: false, msg: 'Câu giống hệt ví dụ — thử đặt một câu của riêng bạn nhé!' }
  return { ok: true, msg: 'Tuyệt! Bạn đã dùng đúng cấu trúc.' }
}

// Main Story line where a phrase occurs (matches its content words by stem)
export function lineForPhrase(lesson, phrase) {
  const stems = phrase.toLowerCase().replace(/\b(something|be|the|a|it|i)\b/g, ' ').split(/\s+/)
    .filter(w => w.length > 2).map(w => w.slice(0, 4))
  if (!stems.length) return null
  return mainLines(lesson).find(l => l.t > 1 && stems.every(st => l.text.toLowerCase().includes(st))) || null
}

// First Main Story sentence that uses the word (or its first word, for phrases)
export function exampleFor(lesson, word) {
  const head = word.toLowerCase().split(' ')[0].replace(/e$/, '')
  return mainLines(lesson).find(l => l.text.toLowerCase().includes(head) && l.t > 1)?.text || ''
}

// ── Progress state ───────────────────────────────────────────────────────────
// { lessons: { slug: { done: {main,ms,vocab,practice}, completed } },
//   days: { 'YYYY-MM-DD': { listen: sec, speak: sec } },
//   saved: [word], notes: [{ id, slug, t, text, at }], last: slug, settings: {},
//   log: [{ act, slug, at }] — newest first, first completion of each activity }
function key() { return `ee_progress_${user?.id || 'guest'}` }
function empty() { return { lessons: {}, days: {}, saved: [], notes: [], last: null, settings: {}, log: [] } }

function logEvent(s, act, slug) {
  s.log = [{ act, slug, at: Date.now() }, ...(s.log || [])].slice(0, 50)
}

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
    if (!l.done[act]) logEvent(s, act, slug)
    l.done[act] = true
    if (!l.completed && ACTIVITIES.every(([a]) => l.done[a])) { l.completed = true; logEvent(s, 'completed', slug) }
    s.last = slug
  })
}

export function setCompleted(slug, completed) {
  update(s => {
    const l = s.lessons[slug] ||= { done: {}, completed: false }
    if (completed && !l.completed) logEvent(s, 'completed', slug)
    l.completed = completed
  })
}

export function lessonProgress(slug, s = getState()) {
  const l = s.lessons[slug] || { done: {}, completed: false }
  const done = ACTIVITIES.filter(([a]) => l.done[a]).length
  return { done, total: ACTIVITIES.length, completed: !!l.completed }
}

// Study seconds of a day: active time on the section ("study"); older days only have listen + speak
export function daySeconds(d) {
  return d ? Math.max(d.study || 0, (d.listen || 0) + (d.speak || 0)) : 0
}
export function dayMinutes(s = getState(), offset = 0) {
  return Math.floor(daySeconds(s.days[today(offset)]) / 60)
}
export function goalMet(s, offset) { return dayMinutes(s, offset) >= DAILY_GOAL_MIN }

// Consecutive days with the full daily goal; today counts once reached, until then the streak runs to yesterday
export function streak(s = getState()) {
  let off = goalMet(s, 0) ? 0 : 1
  let n = 0
  while (goalMet(s, off)) { n++; off++ }
  return n
}

export function totalSeconds(s = getState()) {
  return Object.values(s.days).reduce((sum, d) => sum + daySeconds(d), 0)
}

// ── Today's routine: { date, slug, step, spent: [sec per step] } ─────────────
export function getRoutine(s = getState()) {
  return s.routine?.date === today() ? s.routine : null
}
export function startRoutine(slug) {
  update(s => {
    const r = getRoutine(s)
    s.routine = r ? { ...r, slug } : { date: today(), slug, step: 0, spent: ROUTINE.map(() => 0) }   // one 45-min routine per day, any lesson
  })
}
export function setRoutineStep(step) {
  update(s => { const r = getRoutine(s); if (r) r.step = Math.max(0, Math.min(ROUTINE.length, step)) })
}

// Active study time: counts while the section is open, the tab visible and the learner active
// (input in the last 90 s, or audio playing). Flushed to localStorage every 10 s.
let pendingStudy = 0, pendingSlug = '', lastAct = Date.now(), ticker = null
const pageSlug = () => decodeURIComponent(location.pathname.split('/lesson/')[1] || '')
export function startStudyTimer() {
  if (ticker) return
  const mark = () => { lastAct = Date.now() }
  for (const ev of ['pointerdown', 'keydown', 'scroll', 'touchstart', 'mousemove']) addEventListener(ev, mark, { passive: true })
  addEventListener('pagehide', flushStudy)
  document.addEventListener('visibilitychange', () => { if (document.hidden) flushStudy() })
  ticker = setInterval(() => {
    if (!location.pathname.startsWith(BASE) || document.hidden) return
    const playing = [...document.querySelectorAll('audio')].some(a => !a.paused)
    if (!playing && Date.now() - lastAct > 90000) return
    if (pageSlug() !== pendingSlug) { flushStudy(); pendingSlug = pageSlug() }
    if (++pendingStudy >= 10) flushStudy()
  }, 1000)
}
export function flushStudy() {
  if (!pendingStudy) return
  const sec = pendingStudy
  pendingStudy = 0
  const lessonSlug = pendingSlug
  update(s => {
    const d = s.days[today()] ||= { listen: 0, speak: 0 }
    d.study = (d.study || 0) + sec
    const r = getRoutine(s)                         // routine time counts only on that lesson's page
    if (r && r.step < ROUTINE.length && r.slug === lessonSlug) r.spent[r.step] += sec
  })
}
// Unflushed seconds, so live counters don't lag up to 10 s
export function pendingSeconds() { return pendingStudy }

// Lesson to resume: last opened unless completed, else first not completed
export function nextLesson(lessons, s = getState()) {
  const last = lessons.find(l => l.slug === s.last)
  if (last && !lessonProgress(last.slug, s).completed) return last
  return lessons.find(l => !lessonProgress(l.slug, s).completed) || last || lessons[0] || null
}

export function getSetting(k, def) { return getState().settings[k] ?? def }
export function setSetting(k, v) { update(s => { s.settings[k] = v }) }
