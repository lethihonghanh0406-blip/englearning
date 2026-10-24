-- Ảnh bìa từng bài Effortless English (ảnh Unsplash, giấy phép miễn phí).
-- cover = URL ảnh gốc, web tự thêm ?w=…&fit=crop theo kích thước cần hiển thị. Chạy lại nhiều lần vẫn an toàn.
alter table public.effortless_lessons add column if not exists cover text;

update public.effortless_lessons set cover = 'https://images.unsplash.com/photo-1698786039156-1e23ed15f7e3' where slug = 'day-of-the-dead';  -- ofrenda, hoa cúc vạn thọ
update public.effortless_lessons set cover = 'https://images.unsplash.com/photo-1543260987-e9801362143f'  where slug = 'a-kiss';           -- cô gái tóc vàng đạp xe
update public.effortless_lessons set cover = 'https://images.unsplash.com/photo-1538128835124-7805d3fd3f43' where slug = 'bubbas-food';     -- mèo cam to béo

-- Catalog (đọc công khai) cũng cần ảnh bìa để hiện các bài đang khóa
create or replace view public.effortless_catalog as
  select slug, course, lesson_no, title, level, description, jsonb_array_length(vocab) as vocab_count, cover
  from public.effortless_lessons;
grant select on public.effortless_catalog to anon, authenticated;
