// Supabase Edge Function — nhận webhook từ SePay / Casso
// Deploy: supabase functions deploy payment-webhook
//
// SePay dashboard → Webhooks → URL: https://<project>.supabase.co/functions/v1/payment-webhook
// Thêm header: x-webhook-token: <WEBHOOK_SECRET>  (set trong Supabase env)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL    = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY     = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const WEBHOOK_SECRET  = Deno.env.get('WEBHOOK_SECRET') || ''

const db = createClient(SUPABASE_URL, SERVICE_KEY)

Deno.serve(async (req) => {
  // ── Verify secret ──────────────────────────────────────────────────────────
  const token = req.headers.get('x-webhook-token') || req.headers.get('apikey') || ''
  if (WEBHOOK_SECRET && token !== WEBHOOK_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }

  let body: any
  try { body = await req.json() } catch { return new Response('Bad JSON', { status: 400 }) }

  // ── Parse — SePay format ───────────────────────────────────────────────────
  // SePay: { content, amountIn, transferType, ... }
  // Casso: { data: [{ description, amount, when }] }
  const isCasso = Array.isArray(body?.data)

  const transfers: { content: string; amount: number }[] = isCasso
    ? (body.data as any[]).map(t => ({ content: t.description || '', amount: t.amount || 0 }))
    : [{ content: body.content || body.description || '', amount: body.amountIn || body.amount || 0 }]

  for (const { content, amount } of transfers) {
    if (!content) continue

    // Extract mã LEARNLANG từ nội dung (đề phòng content có text thừa)
    const upper = content.toUpperCase()
    const match = upper.match(/LEARNLANG\s+(\d+)/)
    const code  = match ? `LEARNLANG ${match[1]}` : content.trim()

    let payment: any = null

    // 1. Khớp chính xác mã trích xuất
    const { data: exact } = await db
      .from('payments')
      .select('id, user_id, amount, plan, duration_days, status')
      .ilike('transfer_code', code)
      .eq('status', 'pending')
      .single()
    payment = exact

    // 2. Fallback: content chứa transfer_code (tìm trong tất cả pending)
    if (!payment) {
      const { data: pendings } = await db
        .from('payments')
        .select('id, user_id, amount, plan, duration_days, status, transfer_code')
        .eq('status', 'pending')
      payment = (pendings || []).find(p =>
        upper.includes(p.transfer_code.toUpperCase())
      ) || null
    }

    if (!payment) continue

    // Kiểm tra số tiền (cho phép sai lệch ±1000đ)
    if (Math.abs(amount - payment.amount) > 1000) {
      console.warn(`[webhook] Amount mismatch: expected ${payment.amount}, got ${amount}`)
      continue
    }

    // Xác nhận thanh toán
    await db.from('payments').update({
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
    }).eq('id', payment.id)

    // Tính expiry: null = trọn đời, có days = cộng thêm
    let expiresAt: string | null = null
    if (payment.duration_days) {
      const d = new Date()
      d.setDate(d.getDate() + payment.duration_days)
      expiresAt = d.toISOString()
    }

    await db.from('profiles').upsert({
      id: payment.user_id,
      plan: 'pro',
      plan_expires_at: expiresAt,
    }, { onConflict: 'id' })

    console.log(`[webhook] ✅ User ${payment.user_id} upgraded to ${payment.plan}`)
  }

  return new Response('ok', { status: 200 })
})
