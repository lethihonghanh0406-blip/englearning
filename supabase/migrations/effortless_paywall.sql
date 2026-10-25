-- Effortless English paywall + single lifetime plan (199.000đ)
-- Chạy trong Supabase Dashboard → SQL Editor. Chạy lại nhiều lần vẫn an toàn.

-- ── Pro check for RLS ────────────────────────────────────────────────────────
create or replace function public.is_pro() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and plan = 'pro' and (plan_expires_at is null or plan_expires_at > now())
  )
$$;
grant execute on function public.is_pro() to anon, authenticated;

-- ── Lesson content: Bài 1 of the Original Course free, the rest Pro only ─────
drop policy if exists "effortless_lessons public read" on public.effortless_lessons;
drop policy if exists "effortless_lessons free or pro" on public.effortless_lessons;
create policy "effortless_lessons free or pro" on public.effortless_lessons
  for select using ((course = 'Original Course' and lesson_no = 1) or public.is_pro());

-- Catalog (titles only) readable by everyone, so locked lessons can still be listed with 🔒
create or replace view public.effortless_catalog as
  select slug, course, lesson_no, title, level, description, jsonb_array_length(vocab) as vocab_count
  from public.effortless_lessons;
grant select on public.effortless_catalog to anon, authenticated;

-- ── Payments: the server sets the price, never the browser ───────────────────
create or replace function public.payments_set_price() returns trigger
language plpgsql as $$
begin
  if new.plan is distinct from 'lifetime' then
    raise exception 'Gói không hợp lệ: %', new.plan;
  end if;
  new.amount        := 199000;
  new.duration_days := null;          -- trọn đời
  new.status        := 'pending';
  new.confirmed_at  := null;
  return new;
end $$;
drop trigger if exists payments_set_price on public.payments;
create trigger payments_set_price before insert on public.payments
  for each row execute function public.payments_set_price();

-- Old plans are gone: pending orders at other prices can no longer be confirmed
update public.payments set status = 'expired'
  where status = 'pending' and (plan is distinct from 'lifetime' or amount <> 199000);
