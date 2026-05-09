export default function ipaPage(app) {

  // ── Phoneme data ─────────────────────────────────────────────────────────
  // Each phoneme: [symbol, exampleWord, wordIPA, vietnameseMeaning, [moreExamples]]
  const GROUPS = [
    {
      label: 'Nguyên âm ngắn', color: '#2563eb', bg: '#eff6ff',
      phonemes: [
        { sym:'ɪ',  word:'sit',   ipa:'sɪt',   vi:'ngồi',    examples:['sit','bit','hit','fish','win'] },
        { sym:'e',  word:'bed',   ipa:'bed',   vi:'giường',  examples:['bed','red','ten','tell','end'] },
        { sym:'æ',  word:'cat',   ipa:'kæt',   vi:'con mèo', examples:['cat','bad','man','hand','black'] },
        { sym:'ɒ',  word:'hot',   ipa:'hɒt',   vi:'nóng',    examples:['hot','lot','box','stop','rock'] },
        { sym:'ʊ',  word:'book',  ipa:'bʊk',   vi:'cuốn sách',examples:['book','put','good','look','full'] },
        { sym:'ʌ',  word:'cup',   ipa:'kʌp',   vi:'cái cốc', examples:['cup','love','run','fun','some'] },
        { sym:'ə',  word:'about', ipa:'əˈbaʊt',vi:'về',      examples:['about','sofa','banana','teacher','China'] },
      ]
    },
    {
      label: 'Nguyên âm dài', color: '#16a34a', bg: '#f0fdf4',
      phonemes: [
        { sym:'iː', word:'feet',  ipa:'fiːt',  vi:'bàn chân',examples:['feet','see','me','tea','cheese'] },
        { sym:'ɑː', word:'car',   ipa:'kɑː',   vi:'xe hơi',  examples:['car','far','art','heart','calm'] },
        { sym:'ɔː', word:'law',   ipa:'lɔː',   vi:'luật',    examples:['law','saw','more','door','floor'] },
        { sym:'uː', word:'boot',  ipa:'buːt',  vi:'ủng',     examples:['boot','food','moon','blue','true'] },
        { sym:'ɜː', word:'bird',  ipa:'bɜːd',  vi:'con chim',examples:['bird','word','turn','learn','girl'] },
      ]
    },
    {
      label: 'Nguyên âm đôi', color: '#d97706', bg: '#fffbeb',
      phonemes: [
        { sym:'eɪ', word:'day',   ipa:'deɪ',   vi:'ngày',    examples:['day','say','name','make','rain'] },
        { sym:'aɪ', word:'my',    ipa:'maɪ',   vi:'của tôi', examples:['my','try','time','like','night'] },
        { sym:'ɔɪ', word:'boy',   ipa:'bɔɪ',   vi:'cậu bé',  examples:['boy','toy','oil','voice','noise'] },
        { sym:'aʊ', word:'now',   ipa:'naʊ',   vi:'bây giờ', examples:['now','cow','out','house','down'] },
        { sym:'əʊ', word:'go',    ipa:'ɡəʊ',   vi:'đi',      examples:['go','no','home','phone','road'] },
        { sym:'ɪə', word:'ear',   ipa:'ɪə',    vi:'tai',     examples:['ear','here','near','beer','clear'] },
        { sym:'eə', word:'air',   ipa:'eə',    vi:'không khí',examples:['air','there','care','share','bare'] },
        { sym:'ʊə', word:'pure',  ipa:'pjʊə',  vi:'thuần túy',examples:['pure','cure','tourist','sure','poor'] },
      ]
    },
    {
      label: 'Phụ âm — Vô thanh', color: '#7c3aed', bg: '#f5f3ff',
      phonemes: [
        { sym:'p',  word:'pen',   ipa:'pen',   vi:'cái bút', examples:['pen','cup','top','speak','apple'] },
        { sym:'t',  word:'tea',   ipa:'tiː',   vi:'trà',     examples:['tea','bit','sit','tell','stop'] },
        { sym:'k',  word:'key',   ipa:'kiː',   vi:'chìa khóa',examples:['key','back','cat','cool','milk'] },
        { sym:'f',  word:'fan',   ipa:'fæn',   vi:'cái quạt',examples:['fan','left','phone','food','laugh'] },
        { sym:'θ',  word:'thin',  ipa:'θɪn',   vi:'mỏng',    examples:['thin','bath','think','three','tooth'] },
        { sym:'s',  word:'see',   ipa:'siː',   vi:'nhìn',    examples:['see','miss','sun','class','nice'] },
        { sym:'ʃ',  word:'she',   ipa:'ʃiː',   vi:'cô ấy',   examples:['she','push','shop','fish','nation'] },
        { sym:'h',  word:'hat',   ipa:'hæt',   vi:'cái mũ',  examples:['hat','ahead','hot','hair','house'] },
        { sym:'tʃ', word:'chair', ipa:'tʃeə',  vi:'cái ghế', examples:['chair','watch','cheese','teach','church'] },
      ]
    },
    {
      label: 'Phụ âm — Hữu thanh', color: '#dc2626', bg: '#fef2f2',
      phonemes: [
        { sym:'b',  word:'bed',   ipa:'bed',   vi:'giường',  examples:['bed','rub','ball','big','baby'] },
        { sym:'d',  word:'dog',   ipa:'dɒɡ',   vi:'con chó', examples:['dog','bad','door','day','body'] },
        { sym:'ɡ',  word:'get',   ipa:'ɡet',   vi:'lấy',     examples:['get','big','go','good','again'] },
        { sym:'v',  word:'van',   ipa:'væn',   vi:'xe tải',  examples:['van','of','voice','love','live'] },
        { sym:'ð',  word:'the',   ipa:'ðə',    vi:'cái (mạo từ)',examples:['the','this','with','that','other'] },
        { sym:'z',  word:'zoo',   ipa:'zuː',   vi:'vườn thú',examples:['zoo','is','has','zone','music'] },
        { sym:'ʒ',  word:'vision',ipa:'ˈvɪʒən',vi:'thị giác',examples:['vision','measure','leisure','Asia','usual'] },
        { sym:'dʒ', word:'judge', ipa:'dʒʌdʒ', vi:'thẩm phán',examples:['judge','age','job','large','bridge'] },
      ]
    },
    {
      label: 'Phụ âm — Mũi & Tiếp cận', color: '#0891b2', bg: '#ecfeff',
      phonemes: [
        { sym:'m',  word:'man',   ipa:'mæn',   vi:'đàn ông', examples:['man','some','more','home','swim'] },
        { sym:'n',  word:'no',    ipa:'nəʊ',   vi:'không',   examples:['no','in','nine','name','moon'] },
        { sym:'ŋ',  word:'sing',  ipa:'sɪŋ',   vi:'hát',     examples:['sing','long','ring','thing','young'] },
        { sym:'l',  word:'leg',   ipa:'leɡ',   vi:'chân',    examples:['leg','pull','like','feel','call'] },
        { sym:'r',  word:'red',   ipa:'red',   vi:'đỏ',      examples:['red','try','right','bring','through'] },
        { sym:'j',  word:'yes',   ipa:'jes',   vi:'có',      examples:['yes','yellow','you','year','use'] },
        { sym:'w',  word:'wet',   ipa:'wet',   vi:'ướt',     examples:['wet','window','we','away','swim'] },
      ]
    },
  ]

  // ── Audio ─────────────────────────────────────────────────────────────────
  const AUDIO_BASE = 'https://trehfvxlqfshfhcapqca.supabase.co/storage/v1/object/public/ipa-audio'
  const IPA_FILE = {
    'ɪ':'i-short', 'e':'e',  'æ':'ae',    'ʌ':'uh',     'ɒ':'o-short', 'ʊ':'u-short', 'ə':'schwa',
    'iː':'i-long', 'ɜː':'er','ɑː':'a-long','ɔː':'o-long','uː':'u-long',
    'eɪ':'ei', 'aɪ':'ai', 'ɔɪ':'oi', 'əʊ':'ou', 'aʊ':'au', 'ɪə':'ia', 'eə':'ea', 'ʊə':'ua',
    'p':'p', 'b':'b', 't':'t', 'd':'d', 'k':'k', 'ɡ':'g',
    'tʃ':'ch', 'dʒ':'dj',
    'f':'f', 'v':'v', 'θ':'th', 'ð':'dh', 's':'s', 'z':'z', 'ʃ':'sh', 'ʒ':'zh', 'h':'h',
    'm':'m', 'n':'n', 'ŋ':'ng', 'l':'l', 'r':'r', 'j':'y', 'w':'w',
  }

  // ── State ─────────────────────────────────────────────────────────────────
  let popup = null

  // ── Speak ─────────────────────────────────────────────────────────────────
  window.ipaSpeak = (sym, word) => {
    const file = IPA_FILE[sym]
    if (file) {
      new Audio(`${AUDIO_BASE}/${file}.mp3`).play().catch(() => {
        const utt = new SpeechSynthesisUtterance(word)
        utt.lang = 'en-GB'; utt.rate = 0.85
        speechSynthesis.speak(utt)
      })
    } else {
      const utt = new SpeechSynthesisUtterance(word)
      utt.lang = 'en-GB'; utt.rate = 0.85
      speechSynthesis.speak(utt)
    }
  }

  window.ipaWordSpeak = (word) => {
    speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(word)
    utt.lang = 'en-GB'; utt.rate = 0.85
    speechSynthesis.speak(utt)
  }

  window.ipaOpen = (sym) => {
    for (const g of GROUPS)
      for (const p of g.phonemes)
        if (p.sym === sym) { popup = p; render(); return }
  }
  window.ipaClose = () => { popup = null; render() }

  // ── Render ────────────────────────────────────────────────────────────────
  function render() {
    const popupHTML = popup ? (() => {
      const p = popup
      return `
        <div onclick="if(event.target===this)ipaClose()"
          style="position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:200;display:flex;align-items:center;justify-content:center">
          <div style="background:white;border-radius:20px;padding:28px 32px;min-width:340px;max-width:440px;box-shadow:0 24px 60px rgba(0,0,0,.2);position:relative">
            <button onclick="ipaClose()" style="position:absolute;top:14px;right:16px;background:none;border:none;font-size:20px;cursor:pointer;color:#94a3b8">×</button>
            <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px">
              <div style="display:flex;flex-direction:column;align-items:center;gap:8px">
                <div style="font-size:52px;font-weight:800;color:#0f172a;font-family:'Space Grotesk',sans-serif;line-height:1">${p.sym}</div>
                <button onclick="ipaSpeak('${p.sym.replace(/'/g,"\\'")}','${p.word}')"
                  style="display:flex;align-items:center;gap:6px;padding:8px 16px;border:none;border-radius:20px;background:#2563eb;color:white;font-size:13px;font-weight:600;cursor:pointer">
                  ▶ Nghe âm
                </button>
              </div>
              <div>
                <div style="font-size:13px;color:#94a3b8;margin-bottom:2px">VÍ DỤ CHÍNH</div>
                <button onclick="ipaWordSpeak('${p.word}')"
                  style="display:flex;align-items:center;gap:8px;border:none;background:#f1f5f9;border-radius:8px;padding:8px 14px;cursor:pointer">
                  <span style="font-size:16px">▶</span>
                  <div>
                    <div style="font-size:16px;font-weight:700">${p.word}</div>
                    <div style="font-size:12px;color:#64748b">/${p.ipa}/</div>
                  </div>
                </button>
              </div>
            </div>
            <div style="font-size:12px;color:#94a3b8;margin-bottom:10px;letter-spacing:.5px">NGHE THÊM VÍ DỤ</div>
            <div style="display:flex;flex-direction:column;gap:8px">
              ${p.examples.map(w => `
                <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:#f8fafc;border-radius:8px">
                  <span style="font-size:15px;font-weight:500">${w}</span>
                  <button onclick="ipaWordSpeak('${w}')"
                    style="width:32px;height:32px;border-radius:50%;border:none;background:#e2e8f0;cursor:pointer;font-size:14px">▶</button>
                </div>`).join('')}
            </div>
          </div>
        </div>`
    })() : ''

    const groupsHTML = GROUPS.map(g => `
      <div style="margin-bottom:32px">
        <h2 style="font-size:14px;font-weight:700;color:${g.color};text-transform:uppercase;letter-spacing:1px;margin:0 0 12px">${g.label}</h2>
        <div style="display:flex;flex-wrap:wrap;gap:10px">
          ${g.phonemes.map(p => `
            <div onclick="ipaSpeak('${p.sym.replace(/'/g,"\\'")}','${p.word}');ipaOpen('${p.sym.replace(/'/g, "\\'")}')"
              style="background:${g.bg};border:1.5px solid ${g.color}22;border-radius:14px;padding:14px 18px;
                     min-width:100px;cursor:pointer;transition:.15s;text-align:center"
              onmouseover="this.style.borderColor='${g.color}';this.style.transform='translateY(-2px)'"
              onmouseout="this.style.borderColor='${g.color}22';this.style.transform='translateY(0)'">
              <div style="font-size:28px;font-weight:800;color:${g.color};font-family:'Space Grotesk',sans-serif;line-height:1.2">${p.sym}</div>
              <div style="font-size:13px;font-weight:600;color:#0f172a;margin-top:6px">${p.word}</div>
              <div style="font-size:11px;color:#94a3b8;margin-top:2px">${p.vi}</div>
            </div>`).join('')}
        </div>
      </div>`).join('')

    app.innerHTML = `
      ${popupHTML}
      <div style="min-height:100vh;background:#f8faff">

        <div style="background:white;border-bottom:1px solid #e2e8f0;padding:24px 40px">
          <div style="max-width:960px;margin:auto">
            <h1 style="font-size:24px;font-weight:800;color:#0f172a;margin:0 0 4px;font-family:'Space Grotesk',sans-serif">
              🔤 Bảng phiên âm IPA tiếng Anh
            </h1>
            <p style="margin:0;font-size:13px;color:#64748b">44 âm vị tiếng Anh — click vào từng ký hiệu để nghe phát âm</p>
          </div>
        </div>

        <div style="max-width:960px;margin:32px auto;padding:0 24px 64px">

          <div style="background:#fefce8;border:1px solid #fde68a;border-radius:12px;padding:14px 18px;margin-bottom:28px;font-size:13px;color:#92400e">
            💡 <strong>Mẹo:</strong> Mỗi ký hiệu IPA đại diện cho <em>một âm duy nhất</em>. Click để nghe từ ví dụ có chứa âm đó.
          </div>

          ${groupsHTML}
        </div>
      </div>`
  }

  render()
}
