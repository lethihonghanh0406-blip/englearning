"""Add American IPA (CMU dictionary via eng_to_ipa) to main_story, phrases and patterns of every lesson.

main_story: [t, en, vi]                 -> [t, en, vi, ipa]
phrases:    [en, vi]                    -> [en, vi, ipa]
patterns:   [structure, example, vi, keys?] -> [structure, example, vi, keys|null, ipa_of_example]
Writes an idempotent SQL file (recomputes from the English text each time).

Usage (after adding a lesson):
  pip install eng-to-ipa num2words
  1. Export: select slug, main_story, phrases, patterns from effortless_lessons order by lesson_no  → save as JSON array
  2. python supabase/effortless_add_ipa.py lessons.json ipa.sql
  3. Run ipa.sql in the Supabase SQL editor
"""
import json, re, sys
import eng_to_ipa as ipa
from num2words import num2words

src, out = sys.argv[1], sys.argv[2]
rows = json.load(open(src, encoding='utf8'))
missing = set()


def spell_numbers(text):
    text = re.sub(r'\$(\d[\d,]*)', lambda m: m.group(1) + ' dollars', text)
    text = re.sub(r'(\d+)(st|nd|rd|th)\b', lambda m: num2words(int(m.group(1)), to='ordinal'), text)
    def decade(m):                                        # 20s → twenties
        w = num2words(int(m.group(1)))
        return w[:-1] + 'ies' if w.endswith('y') else w + 's'
    text = re.sub(r'\b(\d+)s\b', decade, text)
    def year_or_num(m):
        n = int(m.group(0).replace(',', ''))
        return num2words(n, to='year') if 1900 <= n <= 2099 and ',' not in m.group(0) else num2words(n)
    return re.sub(r'\d[\d,]*', year_or_num, text)


# Words the CMU dictionary lacks or gets wrong (placeholders survive ipa.convert as "word*")
CUSTOM = {"bubba's": 'ˈbʌbəz', 'amtoken': 'ˌeɪˈɛm', 'imtoken': 'aɪm', 'eyeful': 'ˈaɪfʊl', 'soulmates': 'ˈsoʊlmeɪts', 'ocd': 'ˌoʊsiːˈdiː', 'damnable': 'ˈdæmnəbəl', 'emote': 'ɪˈmoʊt', 'foci': 'ˈfoʊsaɪ', 'iwagaki': 'ˌiwəˈɡɑki', 'mohandas': 'moʊˈhɑndəs', 'resisters': 'rɪˈzɪstərz', 'shiori': 'ʃiˈɔri', 'chomsky': 'ˈtʃɑmski', 'counterposing': 'ˌkaʊntərˈpoʊzɪŋ', 'pacifistic': 'ˌpæsəˈfɪstɪk', 'agnosticism': 'æɡˈnɑstəˌsɪzəm', 'bc': 'ˌbiˈsi', 'falun': 'ˈfɑˌlun', 'image': 'ˈɪmɪdʒ', 'korzybski': 'kɔrˈʒɪbski', 'lowercase': 'ˈloʊərˌkeɪs', 'msn': 'ˌɛmɛsˈɛn', 'org': 'ɔrɡ', 'theist': 'ˈθiɪst', 'tprs': 'ˌtiˌpiˌɑrˈɛs', 'transmuted': 'trænzˈmjutɪd', 'unachieved': 'ˌʌnəˈtʃivd', 'a': 'eɪ', "advisor's": 'ədˈvaɪzərz', 'alg': 'ˌeɪˌɛlˈdʒi', 'com': 'kɑm', 'goenka': 'ɡoʊˈɛŋkə', 'h': 'eɪtʃ', 'h-a': 'eɪtʃ eɪ', 'ibm': 'ˌaɪˌbiˈɛm', 'ii': 'tu', 'impermanence': 'ɪmˈpərmənəns', 'impermanent': 'ɪmˈpərmənənt', 'insincerity': 'ˌɪnsɪnˈsɛrəti', 'j': 'dʒeɪ', 'jakobovits': 'jəˈkoʊbəvɪts', 'lingq': 'lɪŋk', 'lingual': 'ˈlɪŋɡwəl', 'm': 'ɛm', 'm-m': 'ɛm ɛm', 'mythologist': 'mɪˈθɑlədʒɪst', 'n': 'ɛn', 'podcasts': 'ˈpɑdˌkæsts', 'pointlessness': 'ˈpɔɪntləsnəs', 'postovsky': 'pəˈstɔfski', 'schleschler': 'ˈʃlɛʃlər', 'toefl': 'ˈtoʊfəl', 'toeic': 'ˈtoʊɪk', 'tpr': 'ˌtiˌpiˈɑr', 'unforced': 'ʌnˈfɔrst', 'vipassana': 'vɪˈpɑsənə', 'caffe': 'kəˈfeɪ', 'ferlinghetti': 'ˌfərlɪŋˈɡɛti', "ginsberg's": 'ˈɡɪnzbərɡz', 'armoring': 'ˈɑrmərɪŋ', 'atlantia': 'ætˈlæntiə', 'baronies': 'ˈbærəniz', 'blacksmithing': 'ˈblækˌsmɪθɪŋ', 'costuming': 'ˈkɑˌstumɪŋ', 'creatives': 'kriˈeɪtɪvz', 'gautama': 'ˈɡaʊtəmə', 'giotta': 'ˈdʒɑtə', "goddard's": 'ˈɡɑdərdz', 'goosebumps': 'ˈɡusˌbʌmps', 'hammy': 'ˈhæmi', "kerouac's": 'ˈkɛruˌæks', "marx's": 'ˈmɑrksɪz', 'meridies': 'məˈrɪdiˌeɪz', 'nineteen': 'ˌnaɪnˈtin', 'om': 'oʊm', 'pennsic': 'ˈpɛnsɪk', 'sca': 'ˌɛsˌsiˈeɪ', 'segway': 'ˈsɛɡweɪ', 'st': 'seɪnt', 't': 'ti', 'tailrank': 'ˈteɪlræŋk', 'tendrils': 'ˈtɛndrəlz', 'thudded': 'ˈθʌdɪd', 'trimaris': 'trɪˈmɑrɪs', 'wi': 'waɪ', 'aj': 'ˈeɪˌdʒeɪ', "buffy's": 'ˈbʌfiz', "bug's": 'bʌɡz', 'café': 'kæˈfeɪ', 'nha': 'njɑ', 'pho': 'fʌ', 'popsicles': 'ˈpɑpsɪkəlz', 'regrowing': 'riˈɡroʊɪŋ', 'sheepdog': 'ˈʃipˌdɔɡ', 'skateboards': 'ˈskeɪtˌbɔrdz', 'usda': 'ˌjuˌɛsˌdiˈeɪ', "waitress's": 'ˈweɪtrəsɪz', 'xander': 'ˈzændər', "xander's": 'ˈzændərz', "roach's": 'ˈroʊtʃɪz', 'thirty': 'ˈθɝdi', 'f': 'ɛf', "godin's": 'ˈɡoʊdɪnz', 'jetblue': 'ˈdʒɛtˌblu', 'kiyosaki': 'ˌkioʊˈsɑki', 'uncriticized': 'ʌnˈkrɪtɪˌsaɪzd', "'s": 'z', 'adwords': 'ˈædˌwɝdz', 'audiobook': 'ˈɔdioʊˌbʊk', 'bootstrapper': 'ˈbutˌstræpər', 'bootstrapping': 'ˈbutˌstræpɪŋ', 'bull': 'bʊl', 'ctr': 'ˌsiˌtiˈɑr', 'e-t': 'i ti', 'ebook': 'ˈiˌbʊk', 'ebooks': 'ˈiˌbʊks', 'endingly': 'ˈɛndɪŋli', 'freakin': 'ˈfrikɪn', 'gmail': 'ˈdʒiˌmeɪl', 'godaddy': 'ˈɡoʊˌdædi', "google's": 'ˈɡuɡəlz', "headline's": 'ˈhɛdˌlaɪnz', 'i-c': 'aɪ si', 'i-k': 'aɪ keɪ', 'i-n': 'aɪ ɛn', 'ing': 'ɪŋ', 'kaizen': 'ˈkaɪzən', 'l-o': 'ɛl oʊ', 'mentalities': 'mɛnˈtælətiz', 'mpthree': 'ˌɛmˌpiˈθri', 'nine': 'naɪn', 'o-d': 'oʊ di', 'o-m': 'oʊ ɛm', 'paypal': 'ˈpeɪˌpæl', 'username': 'ˈjuzərˌneɪm', 'wikinomics': 'ˌwɪkiˈnɑmɪks', 'a-h': 'eɪ eɪtʃ', 'a-i': 'eɪ aɪ', 'a-u': 'eɪ ju', 'aliveness': 'əˈlaɪvnəs', 'audiobooks': 'ˈɔdioʊˌbʊks', 'bandler': 'ˈbændlər', "bragg's": 'ˈbræɡz', 'e-n': 'i ɛn', 'incantations': 'ˌɪnkænˈteɪʃənz', 'jr': 'ˈdʒunjər', 'krashen': 'ˈkræʃən', "krashen's": 'ˈkræʃənz', 'lalanne': 'ləˈleɪn', 'loudness': 'ˈlaʊdnəs', 'metastatic': 'ˌmɛtəˈstætɪk', 'nlp': 'ˌɛnˌɛlˈpi', 'p-h': 'pi eɪtʃ', 'r-a': 'ɑr eɪ', 'r-e': 'ɑr i', "repetition's": 'ˌrɛpəˈtɪʃənz', 's-h': 'ɛs eɪtʃ', 'shallowly': 'ˈʃæloʊli', 't-e': 'ti i', 'tomoe': 'toʊˈmoʊeɪ', 'uk': 'ˌjuˈkeɪ', 'vocab': 'ˈvoʊkæb', 'vocabularies': 'voʊˈkæbjəˌlɛriz', 'z-e': 'zi i', 'deida': 'ˈdeɪdə', 'd-e': 'di i', 'i-d': 'aɪ di', 'd-a': 'di eɪ', 'episcopalian': 'ɪˌpɪskəˈpeɪliən', 'daoism': 'ˈdaʊɪzəm', 'w-a': 'ˈdʌbəlju eɪ', 't-t': 'ti ti', 't-s': 'ti ɛs', 'l-a': 'ɛl eɪ', 'a-n': 'eɪ ɛn', 'o-i': 'oʊ aɪ', 'i-s': 'aɪ ɛs', 's-m': 'ɛs ɛm', 't-a': 'ti eɪ', 'a-o': 'eɪ oʊ', 'alanwatts': 'ˈælənˌwɑts', 'thoreau': 'θəˈroʊ', "thoreau's": 'θəˈroʊz', 'walden': 'ˈwɔldən', 'okinawa': 'ˌoʊkɪˈnɑwə', 'taoist': 'ˈdaʊɪst', 'taoism': 'ˈdaʊɪzəm', 'a-t': 'eɪ ti', 'arbus': 'ˈɑrbəs', 'attractor': 'əˈtræktər', 'churchills': 'ˈtʃɝtʃɪlz', "dinosaur's": 'ˈdaɪnəˌsɔrz', 'e-i': 'i aɪ', 'e-m': 'i ɛm', 'fatness': 'ˈfætnəs', 'galileos': 'ˌɡæləˈleɪoʊz', 'gaulles': 'ɡoʊlz', 'hanh': 'hɑn', "hanh's": 'hɑnz', 'humanization': 'ˌhjumənəˈzeɪʃən', 'hypercompetitive': 'ˌhaɪpərkəmˈpɛtɪtɪv', 'i-t': 'aɪ ti', 'inka': 'ˈɪŋkə', 'littky': 'ˈlɪtki', 'magliozzi': 'ˌmæliˈɑtsi', "mittleman's": 'ˈmɪtəlmənz', 'moronic': 'məˈrɑnɪk', 'nhat': 'njʌt', 'sarason': 'ˈsærəsən', 'scherwitz': 'ˈʃɝwɪts', "stu's": 'stuz', 't-k': 'ti keɪ', 't-l': 'ti ɛl', 't-u': 'ti ju', 'thich': 'tɪk', 'two': 'tu', 'ultramarathon': 'ˌʌltrəˈmɛrəˌθɑn', 'mittleman': 'ˈmɪtəlmən', 'frankl': 'ˈfræŋkəl', 'vitale': 'vɪˈtɑli', 'schumacher': 'ˈʃuˌmɑkər', 'louganis': 'luˈɡeɪnɪs', 'vidmar': 'ˈvɪdmɑr', 'skyhook': 'ˈskaɪˌhʊk', 'ferriss': 'ˈfɛrɪs', 'godin': 'ˈɡoʊdɪn', 'm-e': 'ɛm i', 'm-a': 'ɛm eɪ', 'l-e': 'ɛl i', 'bmws': 'ˌbiˌɛmˈdʌbəljuz', "frankl's": 'ˈfræŋkəlz', 'plateaus': 'plæˈtoʊz', 'possessives': 'pəˈzɛsɪvz'}


def to_ipa(text):
    clean = text.replace('—', ', ').replace('“', '').replace('”', '').replace('’', "'").replace('…', '')
    clean = re.sub(r'\ba\.m\.', 'amtoken', clean)
    clean = re.sub(r"\bI'm\b", 'imtoken', clean)
    clean = spell_numbers(clean)
    clean = re.sub(r'(\w)-(\w)', r'\1 \2', clean)        # fifty-eight, dog-cleaning → separate words
    res = ipa.convert(clean)
    def fix(m):
        w = m.group(1).lower()
        if w in CUSTOM: return CUSTOM[w]
        missing.add(w)
        return m.group(1)                               # unknown: keep the spelling
    res = re.sub(r"([\w'-]+)\*", fix, res)
    return '/' + re.sub(r'\s+', ' ', res).strip() + '/'


def sql_json(v):
    s = json.dumps(v, ensure_ascii=False, indent=None)
    assert '$j$' not in s
    return '$j$' + s + '$j$::jsonb'


parts = ['-- IPA (giọng Mỹ, từ điển CMU) cho Main Story, Cụm từ và câu ví dụ Mẫu câu. Chạy lại nhiều lần vẫn an toàn.']
for r in rows:
    main = [[l[0], l[1], l[2], to_ipa(l[1])] for l in r['main_story']]
    phrases = [[p[0], p[1], to_ipa(p[0])] for p in r['phrases']]
    patterns = [[p[0], p[1], p[2], p[3] if len(p) > 3 else None, to_ipa(p[1])] for p in r['patterns']]
    parts.append(f"update public.effortless_lessons set\n  main_story = {sql_json(main)},\n  phrases = {sql_json(phrases)},\n  patterns = {sql_json(patterns)}\nwhere slug = '{r['slug']}';")
    print(r['slug'], len(main), len(phrases), len(patterns))

open(out, 'w', encoding='utf8').write('\n\n'.join(parts) + '\n')
print('not in dictionary:', sorted(missing))
