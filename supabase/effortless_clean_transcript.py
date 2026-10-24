"""Clean Whisper sentences: re-join "Dr." splits, drop stutters and one-word echo fragments,
then apply manual fixes: {"exact sentence": ["replacement 1", "replacement 2", ...]} ([] deletes).
Replacement sentences share the original's time span (to the next sentence), split by word count.
usage: python clean_ms.py in.json out.json fixes.json
"""
import json, re, sys

src, out, fixes_file = sys.argv[1:4]
data = json.load(open(src, encoding='utf8'))
fixes = json.load(open(fixes_file, encoding='utf8'))


def tidy(s):
    s = re.sub(r'\b(\w+)( \1\b)+', r'\1', s, flags=re.I)          # "Well Well", "How How"
    s = re.sub(r"\b(\w+)[,.]? \1\b", r'\1', s, flags=re.I) if re.match(r'^(\w+)[,.]? \1\b', s, re.I) else s
    s = re.sub(r'\bdr\.', 'Dr.', s)
    s = re.sub(r'\bat At\b', 'at', s)
    s = re.sub(r'\s+([,.?!])', r'\1', s).replace(',.', '.')
    return s[0].upper() + s[1:] if s else s


result = {}
for name, rows in data.items():
    merged = []
    for t, s in rows:
        if merged and re.search(r'\bDr\.$', merged[-1][1], re.I):             # "… Dr." + "Fred …"
            merged[-1][1] += ' ' + s
        else:
            merged.append([t, s])
    rows = [[t, tidy(s)] for t, s in merged]
    # one-word echoes like "Him." / "Alice." right after a sentence that ends with that word
    rows = [r for i, r in enumerate(rows)
            if not (i and re.fullmatch(r"[A-Z][a-z']+[.!]", r[1]) and rows[i - 1][1].rstrip('.!?').lower().endswith(r[1][:-1].lower()))]
    fixed = []
    for i, (t, s) in enumerate(rows):
        if s not in fixes:
            fixed.append([t, s]); continue
        reps = fixes.pop(s)
        end = rows[i + 1][0] if i + 1 < len(rows) else t + 4
        total = sum(len(r.split()) for r in reps) or 1
        acc = 0
        for r in reps:
            fixed.append([round(t + (end - t) * acc / total, 1), r]); acc += len(r.split())
    result[name] = fixed
json.dump(result, open(out, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
for name, rows in result.items():
    print('=====', name, len(rows))
    for i, (t, s) in enumerate(rows):
        print(f'{i + 1:3} {t:6.1f} {s}')
if fixes:
    print('UNUSED FIXES:', list(fixes))
