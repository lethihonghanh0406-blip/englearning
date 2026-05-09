import { supabase } from './client.js'

export async function saveProgress(score) {
  const { data: { session } } = await supabase.auth.getSession()

  return await supabase.from('progress').insert([
    {
      user_id: session.user.id,
      lesson_id: localStorage.getItem("lessonId"),
      status: score
    }
  ])
}
