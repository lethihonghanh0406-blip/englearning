"""mp3 → sentences with real start times (faster-whisper, word timestamps).
usage: python transcribe.py out.json file1.mp3 [file2.mp3 ...]   → {"file1.mp3": [[start, "sentence"], ...], ...}

Whisper sometimes drops punctuation for a long stretch of question/answer drill. Those stretches are split
at pauses between words, and a piece starting with a question word gets a "?".
"""
import sys, json, re, time
import av, numpy as np
from faster_whisper import WhisperModel

PROMPT = ("Did the woman hesitate? Yes, she hesitated. Who did she love? She loved her colleague. "
          "Was she afraid of snakes? No, she was not afraid of snakes.")
Q_START = re.compile(r"^(did|didn't|does|doesn't|do|don't|was|wasn't|were|weren't|is|isn't|are|aren't|who|whom|whose|"
                     r"what|where|when|why|how|which|can|could|would|will|should|had|has|have)\b", re.I)


def load_audio(path, rate=16000):
    out = []
    with av.open(path) as c:
        rs = av.AudioResampler(format='s16', layout='mono', rate=rate)
        for frame in c.decode(audio=0):
            for f in rs.resample(frame):
                out.append(f.to_ndarray().reshape(-1))
        for f in rs.resample(None):
            out.append(f.to_ndarray().reshape(-1))
    return np.concatenate(out).astype(np.float32) / 32768.0


def finish(words):
    """[(start, end, text)] → sentence text, punctuated and capitalised if Whisper left it bare."""
    text = ''.join(w[2] for w in words).strip()
    if not re.search(r'[.?!]["”]?$', text):
        text += '?' if Q_START.match(text) else '.'
    return text[0].upper() + text[1:]


def sentences_from(words, pause=0.45, long_run=18):
    # 1) split at sentence punctuation
    runs, cur = [], []
    for w in words:
        cur.append(w)
        if re.search(r'[.?!]["”]?$', w[2].strip()):
            runs.append(cur); cur = []
    if cur: runs.append(cur)
    # 2) long runs without inner punctuation: split again at pauses
    out = []
    for run in runs:
        if len(run) <= long_run:
            out.append(run); continue
        piece = [run[0]]
        for prev, w in zip(run, run[1:]):
            if w[0] - prev[1] >= pause or re.search(r'[.?!]$', prev[2].strip()):
                out.append(piece); piece = []
            piece.append(w)
        out.append(piece)
    return [[round(p[0][0], 1), finish(p)] for p in out if ''.join(w[2] for w in p).strip()]


out_path, files = sys.argv[1], sys.argv[2:]
model = WhisperModel('small.en', device='cpu', compute_type='int8')
result = {}
for path in files:
    t0 = time.time()
    audio = load_audio(path)
    segs, _ = model.transcribe(audio, language='en', word_timestamps=True, vad_filter=True,
                               condition_on_previous_text=False, initial_prompt=PROMPT)
    words = [(w.start, w.end, w.word) for seg in segs for w in seg.words]
    name = path.replace('\\', '/').split('/')[-1]
    result[name] = sentences_from(words)
    json.dump(result, open(out_path, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    print(f'{name}: {len(result[name])} sentences, audio {len(audio) // 16000}s, took {time.time() - t0:.0f}s', flush=True)
print('done')
