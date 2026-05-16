export default function ipaPage(app) {

  // yt: { id, t } — BBC Learning English individual sound videos
  const GROUPS = [
    {
      label: 'Nguyên âm ngắn', color: '#2563eb', bg: '#eff6ff',
      phonemes: [
        { sym:'ɪ',  word:'sit',   ipa:'sɪt',   vi:'ngồi',      examples:['sit','bit','hit','fish','win'],
          category:'KIT', position:'Lưỡi gần cao phía trước, môi hơi căng',
          tip:'Giống "i" tiếng Việt nhưng ngắn và không căng môi.',
          yt:{ id:'TNFKG0yvDx4', t:0 } },
        { sym:'e',  word:'bed',   ipa:'bed',   vi:'giường',    examples:['bed','red','ten','tell','end'],
          category:'DRESS', position:'Lưỡi giữa-cao phía trước, miệng hơi mở',
          tip:'Mở miệng hơn /ɪ/, căng lưỡi về phía trước.',
          yt:{ id:'hLN1cdSTDo8', t:0 } },
        { sym:'æ',  word:'cat',   ipa:'kæt',   vi:'con mèo',   examples:['cat','bad','man','hand','black'],
          category:'TRAP', position:'Miệng mở rộng, lưỡi thấp phía trước',
          tip:'Kéo miệng sang hai bên và mở rộng — kết hợp "a"+"e".',
          yt:{ id:'qVhaIHk88a8', t:0 } },
        { sym:'ɒ',  word:'hot',   ipa:'hɒt',   vi:'nóng',      examples:['hot','lot','box','stop','rock'],
          category:'LOT', position:'Miệng mở tròn, lưỡi thấp phía sau',
          tip:'Tròn môi nhẹ, mở miệng rộng nhất có thể.',
          yt:{ id:'MAk-XtHsyzM', t:0 } },
        { sym:'ʊ',  word:'book',  ipa:'bʊk',   vi:'cuốn sách', examples:['book','put','good','look','full'],
          category:'FOOT', position:'Lưỡi cao phía sau, môi tròn nhẹ',
          tip:'Ngắn hơn /uː/, không tròn môi quá nhiều.',
          yt:{ id:'eJ7dM_LU9t4', t:0 } },
        { sym:'ʌ',  word:'cup',   ipa:'kʌp',   vi:'cái cốc',   examples:['cup','love','run','fun','some'],
          category:'STRUT', position:'Lưỡi giữa-thấp, miệng hơi mở',
          tip:'Thư giãn miệng hoàn toàn — âm tự nhiên nhất.',
          yt:{ id:'PZwKFFp7V50', t:0 } },
        { sym:'ə',  word:'about', ipa:'əˈbaʊt',vi:'về',         examples:['about','sofa','banana','teacher','China'],
          category:'SCHWA', position:'Lưỡi ở chính giữa, miệng thư giãn',
          tip:'Âm yếu nhất tiếng Anh — chỉ xuất hiện ở âm tiết KHÔNG có trọng âm.',
          yt:{ id:'wg0P0oYkniE', t:0 } },
      ]
    },
    {
      label: 'Nguyên âm dài', color: '#16a34a', bg: '#f0fdf4',
      phonemes: [
        { sym:'iː', word:'feet',  ipa:'fiːt',  vi:'bàn chân',  examples:['feet','see','me','tea','cheese'],
          category:'FLEECE', position:'Lưỡi rất cao phía trước, môi căng ngang',
          tip:'Kéo dài /ɪ/ và căng môi hơn — giống "i" tiếng Việt nhưng dài hơn.',
          yt:{ id:'RZmGzSb-6OM', t:0 } },
        { sym:'ɑː', word:'car',   ipa:'kɑː',   vi:'xe hơi',    examples:['car','far','art','heart','calm'],
          category:'PALM', position:'Miệng mở rộng nhất, lưỡi thấp phía sau',
          tip:'Giống "a" tiếng Việt nhưng mở to miệng hơn và kéo dài.',
          yt:{ id:'uDHMuMQdBNw', t:0 } },
        { sym:'ɔː', word:'law',   ipa:'lɔː',   vi:'luật',      examples:['law','saw','more','door','floor'],
          category:'THOUGHT', position:'Miệng tròn vừa, lưỡi giữa-thấp',
          tip:'Tròn môi và kéo dài — giống "ô" tiếng Việt.',
          yt:{ id:'KHllC40_u1Q', t:0 } },
        { sym:'uː', word:'boot',  ipa:'buːt',  vi:'ủng',       examples:['boot','food','moon','blue','true'],
          category:'GOOSE', position:'Lưỡi rất cao phía sau, môi tròn chặt',
          tip:'Tròn môi chặt và kéo dài — giống "u" tiếng Việt.',
          yt:{ id:'mnKEGLuEzV4', t:0 } },
        { sym:'ɜː', word:'bird',  ipa:'bɜːd',  vi:'con chim',  examples:['bird','word','turn','learn','girl'],
          category:'NURSE', position:'Lưỡi ở giữa, miệng hơi mở, không tròn môi',
          tip:'KHÔNG tròn môi! Giữ lưỡi ở trung tâm và kéo dài âm.',
          yt:{ id:'zSJJWHymEPw', t:0 } },
      ]
    },
    {
      label: 'Nguyên âm đôi', color: '#d97706', bg: '#fffbeb',
      phonemes: [
        { sym:'eɪ', word:'day',   ipa:'deɪ',   vi:'ngày',      examples:['day','say','name','make','rain'],
          category:'FACE', position:'Đôi âm: e → ɪ',
          tip:'Bắt đầu từ /e/ rồi trượt lên /ɪ/ — miệng thu nhỏ dần.',
          yt:{ id:'5FMPlqlFt9g', t:0 } },
        { sym:'aɪ', word:'my',    ipa:'maɪ',   vi:'của tôi',   examples:['my','try','time','like','night'],
          category:'PRICE', position:'Đôi âm: a → ɪ',
          tip:'Mở miệng rộng (/a/) rồi đóng và dàn ngang (/ɪ/).',
          yt:{ id:'Hb8COxAtl14', t:0 } },
        { sym:'ɔɪ', word:'boy',   ipa:'bɔɪ',   vi:'cậu bé',    examples:['boy','toy','oil','voice','noise'],
          category:'CHOICE', position:'Đôi âm: ɔ → ɪ',
          tip:'Tròn môi (/ɔ/) rồi dàn ngang (/ɪ/).',
          yt:{ id:'lFRrEI85IcM', t:0 } },
        { sym:'aʊ', word:'now',   ipa:'naʊ',   vi:'bây giờ',   examples:['now','cow','out','house','down'],
          category:'MOUTH', position:'Đôi âm: a → ʊ',
          tip:'Mở miệng rộng (/a/) rồi tròn môi (/ʊ/).',
          yt:{ id:'F35cNwiCPHE', t:0 } },
        { sym:'əʊ', word:'go',    ipa:'ɡəʊ',   vi:'đi',        examples:['go','no','home','phone','road'],
          category:'GOAT', position:'Đôi âm: ə → ʊ',
          tip:'Bắt đầu thư giãn (/ə/) rồi tròn môi (/ʊ/).',
          yt:{ id:'r1BRCG0P9C8', t:0 } },
        { sym:'ɪə', word:'ear',   ipa:'ɪə',    vi:'tai',       examples:['ear','here','near','beer','clear'],
          category:'NEAR', position:'Đôi âm: ɪ → ə',
          tip:'Bắt đầu từ /ɪ/ rồi thư giãn về /ə/.',
          yt:{ id:'vC0h4S0YPJc', t:0 } },
        { sym:'eə', word:'air',   ipa:'eə',    vi:'không khí', examples:['air','there','care','share','bare'],
          category:'SQUARE', position:'Đôi âm: e → ə',
          tip:'Bắt đầu từ /e/ rồi thư giãn về /ə/.',
          yt:{ id:'0J7-5maJJIk', t:0 } },
        { sym:'ʊə', word:'pure',  ipa:'pjʊə',  vi:'thuần túy', examples:['pure','cure','tourist','sure','poor'],
          category:'CURE', position:'Đôi âm: ʊ → ə',
          tip:'Bắt đầu từ /ʊ/ rồi thư giãn về /ə/.',
          yt:{ id:'nHSqluHrD-U', t:0 } },
      ]
    },
    {
      label: 'Phụ âm — Vô thanh', color: '#7c3aed', bg: '#f5f3ff',
      phonemes: [
        { sym:'p',  word:'pen',   ipa:'pen',   vi:'cái bút',   examples:['pen','cup','top','speak','apple'],
          category:'Bilabial stop', position:'Hai môi chạm nhau, bật hơi ra',
          tip:'Bật hơi mạnh — đặt tay trước miệng và cảm nhận luồng hơi.',
          yt:{ id:'AZRREr7DqqM', t:0 } },
        { sym:'t',  word:'tea',   ipa:'tiː',   vi:'trà',       examples:['tea','bit','sit','tell','stop'],
          category:'Alveolar stop', position:'Đầu lưỡi chạm lợi răng trên, bật hơi ra',
          tip:'Lưỡi chạm phía sau răng trên rồi bật ra, có hơi.',
          yt:null },
        { sym:'k',  word:'key',   ipa:'kiː',   vi:'chìa khóa', examples:['key','back','cat','cool','milk'],
          category:'Velar stop', position:'Gốc lưỡi chạm vòm mềm phía sau',
          tip:'Âm phát từ cuống họng, bật hơi ra.',
          yt:null },
        { sym:'f',  word:'fan',   ipa:'fæn',   vi:'cái quạt',  examples:['fan','left','phone','food','laugh'],
          category:'Labiodental fricative', position:'Răng trên cắn nhẹ môi dưới, thổi hơi',
          tip:'Răng trên nhẹ lên môi dưới rồi thổi hơi ra.',
          yt:null },
        { sym:'θ',  word:'thin',  ipa:'θɪn',   vi:'mỏng',      examples:['thin','bath','think','three','tooth'],
          category:'Dental fricative', position:'Đầu lưỡi giữa hai hàm răng, thổi hơi',
          tip:'Đặt đầu lưỡi giữa răng và thổi hơi nhẹ — KHÔNG có giọng.',
          yt:{ id:'b4Aj3k65HSo', t:0 } },
        { sym:'s',  word:'see',   ipa:'siː',   vi:'nhìn',      examples:['see','miss','sun','class','nice'],
          category:'Alveolar fricative', position:'Lưỡi gần lợi, luồng hơi ở giữa',
          tip:'Hơi sắc không có giọng — khác với /z/ có rung dây thanh.',
          yt:null },
        { sym:'ʃ',  word:'she',   ipa:'ʃiː',   vi:'cô ấy',     examples:['she','push','shop','fish','nation'],
          category:'Palato-alveolar fricative', position:'Lưỡi rộng hơn /s/, môi hơi tròn',
          tip:'Giống "sh" — lưỡi lùi ra sau hơn /s/, tròn môi nhẹ.',
          yt:{ id:'NF92RdZC6wE', t:0 } },
        { sym:'h',  word:'hat',   ipa:'hæt',   vi:'cái mũ',    examples:['hat','ahead','hot','hair','house'],
          category:'Glottal fricative', position:'Hơi thở qua thanh hầu, không cản',
          tip:'Chỉ là luồng hơi nhẹ từ cổ họng — như thở ra có âm.',
          yt:null },
        { sym:'tʃ', word:'chair', ipa:'tʃeə',  vi:'cái ghế',   examples:['chair','watch','cheese','teach','church'],
          category:'Affricate', position:'Kết hợp /t/ + /ʃ/ — lưỡi chặn rồi thổi',
          tip:'Bắt đầu bằng /t/ rồi ngay lập tức chuyển sang /ʃ/.',
          yt:null },
      ]
    },
    {
      label: 'Phụ âm — Hữu thanh', color: '#dc2626', bg: '#fef2f2',
      phonemes: [
        { sym:'b',  word:'bed',   ipa:'bed',   vi:'giường',    examples:['bed','rub','ball','big','baby'],
          category:'Bilabial stop', position:'Hai môi chạm nhau, có rung dây thanh',
          tip:'Như /p/ nhưng có giọng — dây thanh rung.',
          yt:null },
        { sym:'d',  word:'dog',   ipa:'dɒɡ',   vi:'con chó',   examples:['dog','bad','door','day','body'],
          category:'Alveolar stop', position:'Đầu lưỡi chạm lợi, có rung dây thanh',
          tip:'Như /t/ nhưng có giọng.',
          yt:null },
        { sym:'ɡ',  word:'get',   ipa:'ɡet',   vi:'lấy',       examples:['get','big','go','good','again'],
          category:'Velar stop', position:'Gốc lưỡi chạm vòm mềm, có rung dây thanh',
          tip:'Như /k/ nhưng có giọng.',
          yt:null },
        { sym:'v',  word:'van',   ipa:'væn',   vi:'xe tải',    examples:['van','of','voice','love','live'],
          category:'Labiodental fricative', position:'Răng trên cắn nhẹ môi dưới, có rung dây thanh',
          tip:'Như /f/ nhưng có giọng — dây thanh rung khi thổi.',
          yt:null },
        { sym:'ð',  word:'the',   ipa:'ðə',    vi:'mạo từ',    examples:['the','this','with','that','other'],
          category:'Dental fricative', position:'Đầu lưỡi giữa hai hàm răng, có rung dây thanh',
          tip:'Như /θ/ nhưng có giọng — lưỡi giữa răng và rung họng.',
          yt:{ id:'tu1t3Fn5Lw8', t:0 } },
        { sym:'z',  word:'zoo',   ipa:'zuː',   vi:'vườn thú',  examples:['zoo','is','has','zone','music'],
          category:'Alveolar fricative', position:'Lưỡi gần lợi, có rung dây thanh',
          tip:'Như /s/ nhưng có giọng — rung cổ họng khi phát âm.',
          yt:null },
        { sym:'ʒ',  word:'vision',ipa:'ˈvɪʒən',vi:'thị giác',  examples:['vision','measure','leisure','Asia','usual'],
          category:'Palato-alveolar fricative', position:'Như /ʃ/ nhưng có rung dây thanh',
          tip:'Như /ʃ/ nhưng có giọng — hiếm gặp trong tiếng Anh.',
          yt:null },
        { sym:'dʒ', word:'judge', ipa:'dʒʌdʒ', vi:'thẩm phán', examples:['judge','age','job','large','bridge'],
          category:'Affricate', position:'Kết hợp /d/ + /ʒ/ — có rung dây thanh',
          tip:'Như /tʃ/ nhưng có giọng.',
          yt:null },
      ]
    },
    {
      label: 'Phụ âm — Mũi & Tiếp cận', color: '#0891b2', bg: '#ecfeff',
      phonemes: [
        { sym:'m',  word:'man',   ipa:'mæn',   vi:'đàn ông',   examples:['man','some','more','home','swim'],
          category:'Bilabial nasal', position:'Môi khép lại, hơi thoát qua mũi',
          tip:'Ngậm miệng lại và để hơi thoát qua mũi.',
          yt:null },
        { sym:'n',  word:'no',    ipa:'nəʊ',   vi:'không',     examples:['no','in','nine','name','moon'],
          category:'Alveolar nasal', position:'Lưỡi chạm lợi, hơi qua mũi',
          tip:'Lưỡi chạm sau răng trên, hơi thoát qua mũi.',
          yt:null },
        { sym:'ŋ',  word:'sing',  ipa:'sɪŋ',   vi:'hát',       examples:['sing','long','ring','thing','young'],
          category:'Velar nasal', position:'Gốc lưỡi chạm vòm mềm, hơi qua mũi',
          tip:'Như "ng" cuối từ tiếng Việt — gốc lưỡi lên cao.',
          yt:{ id:'rgWse3tloTw', t:0 } },
        { sym:'l',  word:'leg',   ipa:'leɡ',   vi:'chân',      examples:['leg','pull','like','feel','call'],
          category:'Lateral approximant', position:'Đầu lưỡi chạm lợi, hơi thoát hai bên',
          tip:'Lưỡi chạm lợi, hơi đi vòng quanh hai bên lưỡi.',
          yt:null },
        { sym:'r',  word:'red',   ipa:'red',   vi:'đỏ',        examples:['red','try','right','bring','through'],
          category:'Approximant', position:'Lưỡi cong nhẹ ra sau, không chạm vòm',
          tip:'Lưỡi cong lên nhưng KHÔNG chạm đâu — khác với /r/ tiếng Việt.',
          yt:null },
        { sym:'j',  word:'yes',   ipa:'jes',   vi:'có',        examples:['yes','yellow','you','year','use'],
          category:'Palatal approximant', position:'Lưỡi gần vòm cứng, không cản hơi',
          tip:'Giống bắt đầu âm /iː/ rồi nhanh chóng chuyển sang nguyên âm tiếp theo.',
          yt:null },
        { sym:'w',  word:'wet',   ipa:'wet',   vi:'ướt',       examples:['wet','window','we','away','swim'],
          category:'Labio-velar approximant', position:'Môi tròn, lưỡi cao phía sau',
          tip:'Giống bắt đầu âm /uː/ rồi nhanh chuyển sang nguyên âm tiếp theo.',
          yt:null },
      ]
    },
  ]

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

  let popup = null

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

  function buildPopup(p) {
    const ytSrc = p.yt
      ? `https://www.youtube.com/embed/${p.yt.id}?start=${p.yt.t}&rel=0&modestbranding=1`
      : null

    const videoPanel = ytSrc
      ? `<div style="flex:0 0 340px;background:#000;border-radius:12px;overflow:hidden;aspect-ratio:16/9;max-height:192px">
           <iframe src="${ytSrc}" style="width:100%;height:100%;border:none"
             allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
             allowfullscreen loading="lazy"></iframe>
         </div>`
      : `<div style="flex:0 0 340px;background:#0f172a;border-radius:12px;aspect-ratio:16/9;max-height:192px;
                     display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px">
           <div style="font-size:40px;opacity:.3">▶</div>
           <div style="font-size:12px;color:#475569;text-align:center;padding:0 16px">Chưa có video<br>cho âm này</div>
           <a href="https://www.youtube.com/results?search_query=english+pronunciation+IPA+/${encodeURIComponent(p.sym)}/"
              target="_blank" rel="noopener"
              style="font-size:12px;color:#3b82f6;text-decoration:none;padding:6px 14px;border:1px solid #3b82f6;border-radius:20px">
             Tìm trên YouTube
           </a>
         </div>`

    const examplesHTML = p.examples.map(w => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 10px;background:#f8fafc;border-radius:8px">
        <span style="font-size:14px;font-weight:500">${w}</span>
        <button onclick="event.stopPropagation();ipaWordSpeak('${w}')"
          style="width:28px;height:28px;border-radius:50%;border:none;background:#e2e8f0;cursor:pointer;font-size:12px">▶</button>
      </div>`).join('')

    const ytLink = p.yt
      ? `<a href="https://www.youtube.com/watch?v=${p.yt.id}&t=${p.yt.t}" target="_blank" rel="noopener"
           style="display:inline-flex;align-items:center;gap:6px;font-size:12px;color:#3b82f6;text-decoration:none;font-weight:600">
           🔗 Mở YouTube đầy đủ
         </a>`
      : ''

    return `
      <div onclick="if(event.target===this)ipaClose()"
        style="position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:300;display:flex;align-items:center;justify-content:center;padding:20px">
        <div style="background:white;border-radius:20px;padding:24px;width:100%;max-width:720px;box-shadow:0 24px 60px rgba(0,0,0,.25);position:relative;display:flex;flex-direction:column;gap:16px"
             onclick="event.stopPropagation()">

          <button onclick="ipaClose()"
            style="position:absolute;top:14px;right:16px;background:none;border:none;font-size:22px;cursor:pointer;color:#94a3b8;line-height:1">×</button>

          <!-- Top row: video + info -->
          <div style="display:flex;gap:20px;align-items:flex-start">
            ${videoPanel}

            <!-- Info -->
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:baseline;gap:10px;margin-bottom:4px">
                <div style="font-size:48px;font-weight:800;color:#0f172a;font-family:'Space Grotesk',sans-serif;line-height:1">/${p.sym}/</div>
                <button onclick="ipaSpeak('${p.sym.replace(/'/g,"\\'")}','${p.word}')"
                  style="padding:6px 14px;border:none;border-radius:20px;background:#2563eb;color:white;font-size:12px;font-weight:600;cursor:pointer;flex-shrink:0">
                  ▶ Nghe âm
                </button>
              </div>
              <div style="font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:1px;text-transform:uppercase;margin-bottom:10px">${p.category}</div>

              <div style="font-size:12px;color:#64748b;margin-bottom:4px">Ví dụ:</div>
              <button onclick="ipaWordSpeak('${p.word}')"
                style="display:inline-flex;align-items:center;gap:8px;border:none;background:#f1f5f9;border-radius:8px;padding:6px 12px;cursor:pointer;margin-bottom:12px">
                <span style="font-size:14px">▶</span>
                <div style="text-align:left">
                  <div style="font-size:15px;font-weight:700">${p.word}</div>
                  <div style="font-size:11px;color:#64748b">/${p.ipa}/</div>
                </div>
              </button>

              <div style="font-size:12px;color:#64748b;margin-bottom:3px">Vị trí:</div>
              <div style="font-size:13px;color:#374151;margin-bottom:10px">${p.position}</div>

              <div style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:8px 12px;font-size:12px;color:#92400e;margin-bottom:10px">
                ${p.tip}
              </div>

              ${ytLink}
            </div>
          </div>

          <!-- More examples -->
          <div>
            <div style="font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:.5px;margin-bottom:8px">NGHE THÊM VÍ DỤ</div>
            <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px">
              ${examplesHTML}
            </div>
          </div>

        </div>
      </div>`
  }

  function render() {
    const popupHTML = popup ? buildPopup(popup) : ''

    const groupsHTML = GROUPS.map(g => `
      <div style="margin-bottom:32px">
        <h2 style="font-size:14px;font-weight:700;color:${g.color};text-transform:uppercase;letter-spacing:1px;margin:0 0 12px">${g.label}</h2>
        <div style="display:flex;flex-wrap:wrap;gap:10px">
          ${g.phonemes.map(p => `
            <div onclick="ipaSpeak('${p.sym.replace(/'/g,"\\'")}','${p.word}');ipaOpen('${p.sym.replace(/'/g, "\\'")}')"
              style="background:${g.bg};border:1.5px solid ${g.color}22;border-radius:14px;padding:14px 18px;
                     min-width:100px;cursor:pointer;transition:.15s;text-align:center;position:relative"
              onmouseover="this.style.borderColor='${g.color}';this.style.transform='translateY(-2px)'"
              onmouseout="this.style.borderColor='${g.color}22';this.style.transform='translateY(0)'">
              <div style="font-size:28px;font-weight:800;color:${g.color};font-family:'Space Grotesk',sans-serif;line-height:1.2">${p.sym}</div>
              <div style="font-size:13px;font-weight:600;color:#0f172a;margin-top:6px">${p.word}</div>
              <div style="font-size:11px;color:#94a3b8;margin-top:2px">${p.vi}</div>
              ${p.yt ? `<div style="position:absolute;top:6px;right:6px;width:8px;height:8px;border-radius:50%;background:#ef4444" title="Có video"></div>` : ''}
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
            <p style="margin:0;font-size:13px;color:#64748b">44 âm vị — click vào từng ký hiệu để xem video giáo viên phát âm · <span style="display:inline-flex;align-items:center;gap:4px"><span style="width:8px;height:8px;border-radius:50%;background:#ef4444;display:inline-block"></span> có video</span></p>
          </div>
        </div>

        <div style="max-width:960px;margin:32px auto;padding:0 24px 64px">
          <div style="background:#fefce8;border:1px solid #fde68a;border-radius:12px;padding:14px 18px;margin-bottom:28px;font-size:13px;color:#92400e">
            💡 <strong>Mẹo:</strong> Mỗi ký hiệu IPA đại diện cho <em>một âm duy nhất</em>. Click để xem video giáo viên BBC phát âm và nghe ví dụ.
          </div>
          ${groupsHTML}
        </div>
      </div>`
  }

  render()
}
