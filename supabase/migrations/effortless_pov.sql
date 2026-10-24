-- POV (cùng câu chuyện kể ở thì / góc nhìn khác) và Commentary (A.J. bình luận) — chỉ một số bài có.
-- pov_story / com_story: [[giây, "câu"], ...]; *_audio: "bucket/đường-dẫn" như các cột audio khác.
-- Chạy lại nhiều lần vẫn an toàn.
alter table public.effortless_lessons add column if not exists pov_audio text;
alter table public.effortless_lessons add column if not exists pov_story jsonb not null default '[]';
alter table public.effortless_lessons add column if not exists com_audio text;
alter table public.effortless_lessons add column if not exists com_story jsonb not null default '[]';
