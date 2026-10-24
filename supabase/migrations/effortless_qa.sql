-- Hỏi đáp (Q&A) từng bài: qa = [["câu hỏi", "đáp án mẫu"], ...]
-- Bài nào để trống thì web tự lấy các cặp hỏi–đáp trong transcript Mini-Story. Chạy lại nhiều lần vẫn an toàn.
alter table public.effortless_lessons add column if not exists qa jsonb not null default '[]';

update public.effortless_lessons set qa = $j$[
  ["Did the daughters buy a business from their mother?", "Yes, they did."],
  ["Who bought the business?", "Sam and Olivia, the daughters."],
  ["What did they buy?", "They bought a dog-cleaning business."],
  ["When did they buy it?", "Twenty years ago."],
  ["Where did they buy it?", "In Canada."],
  ["How did they buy the business?", "They bought it with gold."],
  ["How much gold did they pay every year?", "Five hundred and five pounds of gold."],
  ["Why did they pay their mother every year?", "Because they bought her business."],
  ["Did the mother continue to help them?", "Yes, she did."],
  ["Why didn't the mother wash the little dogs?", "Because the little dogs were very fast."],
  ["Which dogs did the mother wash?", "She only washed the big dogs."],
  ["How many big dogs did she wash every day?", "Half a big dog."],
  ["When did she wash half a big dog?", "At midnight, every night."],
  ["What did she use to wash the dog?", "A toothbrush."],
  ["Why did she use a toothbrush?", "Because her hands were very small."]
]$j$::jsonb
where slug = 'drag';
