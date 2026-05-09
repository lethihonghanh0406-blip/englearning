import { supabase } from './client.js'

export async function getLessons() {
  const { data, error } = await supabase.from('lessons').select('*')

  if (error) {
    console.error(error)
    return []
  }

  return data
}