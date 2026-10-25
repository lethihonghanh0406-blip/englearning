"""Build the SQL for one Effortless English lesson from a small JSON config + cleaned transcripts.

usage: python supabase/effortless_build_lesson.py lesson.json out.sql

lesson.json:
{
  "no": 9, "slug": "double-standard", "title": "Double Standard", "code": "109", "file_title": "Double Standard",
  "description": "…", "cover": "https://images.unsplash.com/photo-…",
  "main": [[t, "English", "Tiếng Việt"], ...],
  "ms":  "ms.json"  (cleaned [[t, sentence], ...]; or {"A": "msA.json", "B": "msB.json"}; leave out for a Main-only lesson),
  "ms_intro_until": "sentence that ends the story-only intro (optional)", "ms_intro": 0,
  "ms_plain_from": "sentence that starts the repeat-after-me part (optional; a list when the Mini-Story has parts)",
  "pov": "pov.json", "com": "com.json",
  "vocab": [...], "phrases": [...], "patterns": [...]          (optional)
  "qa": [["question", "model answer"], ...]                     (optional; else the Q&A tab uses the Mini-Story)
  "course": "Flow English", "bucket": "Flow_English_Lesson", "level": "elementary"   (optional, default Original Course, intermediate)
  "files": {"vocab": null, "ms": "201b … (ms).mp3", "com": "…"}  (optional: audio names that break the pattern; null = none)
}
Audio paths follow the bucket naming: <code>a … (main) / b (vocabulary) / c [A|B] (ms) / d (pov) / e (com).
Mini-Story labels: a "?" sentence (not "…, right?") is a question; in a run of questions only the last pauses;
the sentence after a question is its answer.
"""
import json, os, re, sys

cfg_path, out = sys.argv[1], sys.argv[2]
base = os.path.dirname(os.path.abspath(cfg_path))
cfg = json.load(open(cfg_path, encoding='utf8'))
AUD = cfg.get('bucket', 'Original_Course') + '/'
FILES = cfg.get('files', {})
code, ft = cfg['code'], cfg['file_title']
def load(f):
    v = json.load(open(os.path.join(base, f), encoding='utf8'))
    return next(iter(v.values())) if isinstance(v, dict) else v      # clean_ms.py writes {"name": rows}


def is_q(s):
    s = s.rstrip('”"')
    quoted = re.search(r'\b(said|says|asked|asks|yelled|yells)\b,', s, re.I)    # "He said, why ...?" is story, not a quiz question
    return s.endswith('?') and not re.search(r'right\?$', s, re.I) and not quoted


def label(rows):
    out = [[t, 'q' if is_q(s) else 's', s] for t, s in rows]
    for i, r in enumerate(out):
        if r[1] == 'q' and i + 1 < len(out) and out[i + 1][1] == 'q':
            r[1] = 's'
    for i, r in enumerate(out):
        if r[1] == 's' and i and out[i - 1][1] == 'q':
            r[1] = 'a'
    stop = cfg.get('ms_intro', 0)
    until = cfg.get('ms_intro_until')
    if until:
        stop = next((i + 1 for i, r in enumerate(out) if r[2] == until), stop)
    for r in out[:stop]:
        r[1] = 's'
    plain = cfg.get('ms_plain_from')                              # repeat-after-me part: no Q&A labels
    if plain:
        plain = [plain] if isinstance(plain, str) else plain      # one sentence per Mini-Story part
        start = next((i for i, r in enumerate(out) if r[2] in plain), len(out))
        for r in out[start:]:
            r[1] = 's'
    for i, kind in (cfg.get('ms_overrides') or {}).items():      # {"12": "q"} 1-based line numbers
        out[int(i) - 1][1] = kind
    return out


ms_cfg = cfg['ms'] if isinstance(cfg.get('ms'), dict) else {'': cfg['ms']} if cfg.get('ms') else {}   # none: Main Audio only
ms_files = FILES['ms'] if isinstance(FILES.get('ms'), dict) else {'': FILES['ms']} if 'ms' in FILES else {}
parts = [{'label': lab, 'audio': AUD + ms_files.get(lab, f"{code}c {ft}{(' ' + lab) if lab else ''} (ms).mp3"), 'story': label(load(f))}
         for lab, f in ms_cfg.items()]
pov = load(cfg['pov']) if cfg.get('pov') else []
com = load(cfg['com']) if cfg.get('com') else []


def J(v):
    s = json.dumps(v, ensure_ascii=False)
    assert '$j$' not in s
    return '$j$' + s + '$j$::jsonb'


q = lambda s: "'" + s.replace("'", "''") + "'"
audio = lambda kind, name: 'null' if kind in FILES and FILES[kind] is None else q(AUD + FILES.get(kind, name))
cols = {
    'course': q(cfg.get('course', 'Original Course')), 'lesson_no': str(cfg['no']), 'slug': q(cfg['slug']), 'title': q(cfg['title']),
    'level': q(cfg.get('level', 'intermediate')), 'description': q(cfg['description']), 'cover': q(cfg['cover']),
    'main_audio': audio('main', f'{code}a {ft} (main).mp3'), 'vocab_audio': audio('vocab', f'{code}b {ft} (vocabulary).mp3'),
    'ms_audio': q(parts[0]['audio']) if parts else 'null',
    'pov_audio': audio('pov', f'{code}d {ft} (pov).mp3') if pov else 'null',
    'com_audio': audio('com', f'{code}e {ft} (com).mp3') if com else 'null',
    'main_story': J(cfg['main']), 'mini_story': J(parts[0]['story'] if parts else []), 'ms_parts': J(parts),
    'pov_story': J(pov), 'com_story': J(com),
    'vocab': J(cfg.get('vocab', [])), 'phrases': J(cfg.get('phrases', [])), 'patterns': J(cfg.get('patterns', [])),
}
if cfg.get('qa'):                                                 # own Q&A list (lessons without a Mini-Story)
    cols['qa'] = J(cfg['qa'])
course = '' if cfg.get('course', 'Original Course') == 'Original Course' else cfg['course'] + ' · '
sql = (f"\n-- ── {course}Bài {cfg['no']}: {cfg['title']} (chữ từ audio bằng Whisper, đã soát) ──\n"
       f"insert into public.effortless_lessons ({', '.join(cols)})\nvalues (\n  " + ',\n  '.join(cols.values()) + "\n)\n"
       "on conflict (slug) do update set\n  " +
       ',\n  '.join(f'{c} = excluded.{c}' for c in cols if c != 'slug') + ';\n')
open(out, 'w', encoding='utf8').write(sql)
print(cfg['slug'], '| main', len(cfg['main']), '|', ', '.join(f"ms{p['label']} {len(p['story'])} (q {sum(r[1] == 'q' for r in p['story'])})" for p in parts),
      '| pov', len(pov), '| com', len(com), '| vocab', len(cfg.get('vocab', [])))
with open(out + '.txt', 'w', encoding='utf8') as f:
    for p in parts:
        f.write(f"===== ms {p['label']}\n")
        for i, r in enumerate(p['story']):
            f.write(f'{i + 1:3} {r[0]:6.1f} {r[1]} {r[2]}\n')
