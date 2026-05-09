export default function pinyinPage(app) {

  // ── Tone helpers ────────────────────────────────────────────────────────
  const TONE_VOWELS = {
    a:['ā','á','ǎ','à','a'], e:['ē','é','ě','è','e'],
    i:['ī','í','ǐ','ì','i'], o:['ō','ó','ǒ','ò','o'],
    u:['ū','ú','ǔ','ù','u'], v:['ǖ','ǘ','ǚ','ǜ','ü'],
  }

  function applyTone(syl, t) {
    // t: 0-4 (index), 4 = neutral
    if (t === 4) return syl.replace('v','ü')
    const s = syl.replace('v','ü')
    if (/a/.test(s)) return s.replace('a', TONE_VOWELS.a[t])
    if (/e/.test(s)) return s.replace('e', TONE_VOWELS.e[t])
    if (/ou/.test(s)) return s.replace('o', TONE_VOWELS.o[t])
    for (let i = s.length - 1; i >= 0; i--) {
      const c = s[i]
      if (TONE_VOWELS[c]) return s.slice(0, i) + TONE_VOWELS[c][t] + s.slice(i + 1)
    }
    return s
  }

  // ── Valid syllables ─────────────────────────────────────────────────────
  const VALID = new Set([
    'a','o','e','er','ai','ei','ao','ou','an','en','ang','eng',
    'yi','wu','yu','ya','ye','yao','you','yan','yin','yang','ying','yong','yo',
    'wa','wo','wai','wei','wan','wen','wang','weng','yue','yuan','yun',
    // b
    'ba','bo','bai','bei','bao','ban','ben','bang','beng','bi','bie','biao','bian','bin','bing','bu',
    // p
    'pa','po','pai','pei','pao','pou','pan','pen','pang','peng','pi','pie','piao','pian','pin','ping','pu',
    // m
    'ma','mo','me','mai','mei','mao','mou','man','men','mang','meng','mi','mie','miao','miu','mian','min','ming','mu',
    // f
    'fa','fo','fei','fou','fan','fen','fang','feng','fu',
    // d
    'da','de','dai','dei','dao','dou','dan','den','dang','deng','di','dia','die','diao','diu','dian','ding','du','duo','duan','dun',
    // t
    'ta','te','tai','tao','tou','tan','tang','teng','ti','tie','tiao','tian','ting','tu','tuo','tuan','tun',
    // n
    'na','ne','nai','nei','nao','nou','nan','nen','nang','neng','ni','nie','niao','niu','nian','nin','niang','ning','nu','nuo','nuan','nv','nve',
    // l
    'la','lo','le','lai','lei','lao','lou','lan','lang','leng','li','lia','lie','liao','liu','lian','lin','liang','ling','lu','luo','luan','lun','lv','lve',
    // g
    'ga','ge','gai','gei','gao','gou','gan','gen','gang','geng','gu','gua','guo','guai','gui','guan','gun','guang',
    // k
    'ka','ke','kai','kao','kou','kan','ken','kang','keng','ku','kua','kuo','kuai','kui','kuan','kun','kuang',
    // h
    'ha','he','hai','hei','hao','hou','han','hen','hang','heng','hu','hua','huo','huai','hui','huan','hun','huang',
    // j q x
    'ji','jia','jie','jiao','jiu','jian','jin','jiang','jing','jiong','ju','jue','juan','jun',
    'qi','qia','qie','qiao','qiu','qian','qin','qiang','qing','qiong','qu','que','quan','qun',
    'xi','xia','xie','xiao','xiu','xian','xin','xiang','xing','xiong','xu','xue','xuan','xun',
    // zh
    'zhi','zha','zhe','zhai','zhei','zhao','zhou','zhan','zhen','zhang','zheng','zhu','zhua','zhuo','zhuai','zhui','zhuan','zhun','zhuang',
    // ch
    'chi','cha','che','chai','chao','chou','chan','chen','chang','cheng','chu','chua','chuo','chuai','chui','chuan','chun','chuang',
    // sh
    'shi','sha','she','shai','shei','shao','shou','shan','shen','shang','sheng','shu','shua','shuo','shuai','shui','shuan','shun','shuang',
    // r
    'ri','re','rao','rou','ran','ren','rang','reng','ru','ruo','rui','ruan','run',
    // z
    'zi','za','ze','zai','zei','zao','zou','zan','zen','zang','zeng','zu','zuo','zui','zuan','zun',
    // c
    'ci','ca','ce','cai','cao','cou','can','cen','cang','ceng','cu','cuo','cui','cuan','cun',
    // s
    'si','sa','se','sai','sao','sou','san','sen','sang','seng','su','suo','sui','suan','sun',
  ])

  // ── Table layout ────────────────────────────────────────────────────────
  const INITIALS = ['','b','p','m','f','d','t','n','l','g','k','h','j','q','x','zh','ch','sh','r','z','c','s']
  const FINALS   = [
    'a','o','e','-i','er',
    'ai','ei','ao','ou',
    'an','en','ang','eng',
    'i','ia','ie','iao','iu','ian','in','iang','ing','iong',
    'u','ua','uo','uai','ui','uan','un','uang',
    'v','ve',
  ]

  // Map display finals to actual pinyin finals used in syllable construction
  const FINAL_MAP = { '-i':'i', 'v':'ü', 've':'üe', 'iu':'iou', 'ui':'uei', 'un':'uen' }
  const FINAL_DISPLAY = { '-i':'−i', 'v':'ü', 've':'üe', 'iu':'iu', 'ui':'ui', 'un':'un' }

  function getSyllable(ini, fin) {
    // Special -i (apical vowel after zh/ch/sh/r/z/c/s)
    if (fin === '-i') {
      return ['zh','ch','sh','r','z','c','s'].includes(ini) ? ini + 'i' : null
    }
    // j/q/x + v → ju/qu/xu spelling
    const actualFin = FINAL_MAP[fin] || fin
    let syl
    if (['j','q','x'].includes(ini) && (fin === 'v' || fin === 've')) {
      syl = ini + (fin === 'v' ? 'u' : 'ue')
    } else if (ini === '' ) {
      // Standalone finals → use yi/wu/yu forms
      const YI_MAP = {
        'i':'yi','ia':'ya','ie':'ye','iao':'yao','iu':'you','ian':'yan','in':'yin',
        'iang':'yang','ing':'ying','iong':'yong','u':'wu','ua':'wa','uo':'wo',
        'uai':'wai','ui':'wei','uan':'wan','un':'wen','uang':'wang','v':'yu','ve':'yue',
        // üan, ün handled below
      }
      syl = YI_MAP[fin] || fin
    } else {
      syl = ini + (fin === 'v' ? 'v' : fin === 've' ? 've' : fin)
    }
    return VALID.has(syl) ? syl : null
  }

  // ── Hanzi lookup for accurate TTS (index = tone 0-4) ──────────────────
  // Each entry: [tone1, tone2, tone3, tone4, neutral]  null = fall back to toned pinyin
  const CHAR_TONES = {
    a:['啊',null,null,'啊','啊'], o:['哦',null,null,null,null], e:['鹅',null,'呃','恶',null],
    er:['耳','儿','耳','二','二'], ai:['哀','挨','矮','爱',null], ei:['诶',null,null,null,'诶'],
    ao:['熬',null,'袄','奥',null], ou:['欧',null,'偶','呕',null],
    an:['安',null,'俺','暗',null], en:['恩',null,null,'摁',null],
    ang:['肮','昂',null,'盎',null], eng:[null,null,null,null,null],
    yi:['衣','疑','已','意',null], ya:['鸭',null,'雅','亚',null],
    ye:['耶',null,'也','夜',null], yao:['腰','摇','咬','要',null],
    you:['忧','由','有','又',null], yan:['烟','言','眼','燕',null],
    yin:['音','寅','引','印',null], yang:['央','阳','养','样',null],
    ying:['英','营','影','映',null], yong:['拥','用','勇','用',null],
    yo:[null,null,null,null,'哟'], wu:['乌','吴','五','雾',null],
    wa:['蛙',null,'瓦','袜',null], wo:['窝','蜗','我','卧',null],
    wai:['歪',null,'歪','外',null], wei:['威','微','尾','位',null],
    wan:['弯','完','晚','万',null], wen:['温','文','稳','问',null],
    wang:['汪','王','往','望',null], weng:['翁',null,'嗡','瓮',null],
    yu:['于','鱼','雨','遇',null], yue:['约','岳','月','跃',null],
    yuan:['鸳','元','远','愿',null], yun:['云','云','允','运',null],
    ba:['巴','拔','把','爸',null], bo:['波','薄','跛','播',null],
    bai:['掰','白','百','拜',null], bei:['杯','贝','背','备',null],
    bao:['包','薄','宝','报',null], ban:['班','板','版','半',null],
    ben:['奔','苯','本','笨',null], bang:['帮','膀','绑','棒',null],
    beng:['崩','蚌','泵','迸',null], bi:['逼','鼻','比','必',null],
    bie:['憋','别','别','别',null], biao:['标','表','表','表',null],
    bian:['边','便','贬','变',null], bin:['宾','频','品','殡',null],
    bing:['冰','平','饼','病',null], bu:['不','部','补','布',null],
    pa:['趴','爬','怕','拍',null], po:['坡','婆','叵','破',null],
    pai:['拍','排','派','怕',null], pei:['坯','赔','配','配',null],
    pao:['泡','袍','跑','炮',null], pou:['剖',null,'剖',null,null],
    pan:['盘','攀','盼','判',null], pen:['盆',null,'喷','喷',null],
    pang:['乒','庞','胖','胖',null], peng:['烹','鹏','捧','碰',null],
    pi:['批','皮','匹','屁',null], pie:['撇',null,'撇','撇',null],
    piao:['漂','飘','瞟','漂',null], pian:['偏','便','骗','骗',null],
    pin:['拼','贫','品','聘',null], ping:['乒','平','品','聘',null],
    pu:['铺','朴','普','瀑',null],
    ma:['妈','麻','马','骂','吗'], mo:['摸','膜','末','磨',null],
    me:[null,null,null,null,'么'], mai:['买','麦','买','卖',null],
    mei:['没','眉','美','妹',null], mao:['猫','毛','矛','帽',null],
    mou:['谋',null,'某','谋',null], man:['蛮','慢','满','漫',null],
    men:['门','闷','们','闷','们'], mang:['忙','茫','莽','忘',null],
    meng:['蒙','猛','梦','懵',null], mi:['迷','泌','米','密',null],
    mie:[null,'灭','灭','灭',null], miao:['描','苗','秒','庙',null],
    miu:[null,null,null,'谬',null], mian:['棉','绵','免','面',null],
    min:['民','敏','悯','民',null], ming:['名','明','命','命',null],
    mu:['木','目','母','墓',null],
    fa:['发','罚','法','发',null], fo:[null,null,'佛','佛',null],
    fei:['飞','肥','废','费',null], fou:[null,'否','否','否',null],
    fan:['番','反','反','饭',null], fen:['分','坟','粪','份',null],
    fang:['方','房','访','放',null], feng:['风','逢','讽','凤',null],
    fu:['夫','服','府','父',null],
    da:['搭','达','打','大',null], de:[null,null,null,'得','的'],
    dai:['带','呆','待','代',null], dao:['刀','道','倒','到',null],
    dou:['都','读','抖','豆',null], dan:['单','淡','胆','旦',null],
    dang:['当','党','挡','当',null], deng:['登','等','凳','邓',null],
    di:['低','迪','底','地',null], die:['爹','喋','跌','跌',null],
    diao:['凋','调','吊','掉',null], diu:[null,null,'丢',null,null],
    dian:['点','电','典','店',null], ding:['丁','钉','顶','定',null],
    du:['度','读','肚','督',null], duo:['多','夺','朵','铎',null],
    duan:['端','断','短','断',null], dun:['敦','顿','盾','钝',null],
    ta:['他','塔','踏','踏',null], te:[null,null,null,'特',null],
    tai:['台','苔','太','太',null], tao:['掏','淘','讨','套',null],
    tou:['投','头','透','透',null], tan:['摊','谈','坦','探',null],
    tang:['汤','唐','躺','趟',null], teng:['腾','腾','腾','疼',null],
    ti:['梯','啼','体','剃',null], tie:['铁','贴','铁','铁',null],
    tiao:['跳','条','跳','跳',null], tian:['天','填','舔','甜',null],
    ting:['厅','停','挺','听',null], tu:['图','土','土','兔',null],
    tuo:['拖','驼','妥','拓',null], tuan:['团','团','团','团',null],
    tun:['吞','屯','褪','褪',null],
    na:['拿','那','哪','纳','哪'], ne:[null,null,null,null,'呢'],
    nai:['奶','乃','奶','耐',null], nao:['挠','脑','脑','闹',null],
    nan:['南','难','男','难',null], neng:[null,'能','能','能',null],
    ni:['妮','泥','你','腻',null], nie:['捏',null,'捏','捏',null],
    niao:['鸟',null,'鸟','尿',null], niu:['妞','牛','扭','拗',null],
    nian:['年',null,'捻','念',null], nin:['您',null,null,null,null],
    niang:['娘',null,'酿','酿',null], ning:['宁',null,'拧','泞',null],
    nu:['努',null,'努','怒',null], nuo:['挪',null,null,'懦',null],
    nuan:[null,null,'暖','暖',null],
    la:['拉','啦','垃','辣','啦'], lo:[null,null,null,null,'哦'],
    le:[null,null,null,'乐','了'], lai:['来',null,'赖','赖',null],
    lei:['雷',null,'泪','累',null], lao:['捞','劳','老','涝',null],
    lou:['楼','漏','搂','漏',null], lan:['蓝','懒','懒','烂',null],
    lang:['狼','朗','朗','浪',null], leng:['冷',null,'冷','楞',null],
    li:['离','里','李','利',null], lie:['列','列','裂','裂',null],
    liao:['撩','辽','了','料',null], liu:['流','留','六','六',null],
    lian:['连','廉','脸','练',null], lin:['林','邻','凛','淋',null],
    liang:['凉','粮','两','辆',null], ling:['零','灵','领','令',null],
    lu:['录','卤','路','鹿',null], luo:['落','罗','裸','落',null],
    luan:['乱','乱','卵','乱',null], lun:['轮','伦','论','论',null],
    ga:['噶',null,'嘎',null,null], ge:['歌','个','隔','各',null],
    gai:['该','盖','改','盖',null], gei:[null,null,null,'给',null],
    gao:['高',null,'稿','告',null], gou:['钩','沟','狗','够',null],
    gan:['干','干','敢','感',null], gen:['根',null,'跟','亘',null],
    gang:['钢','缸','港','杠',null], geng:['更',null,'梗','更',null],
    gu:['古','孤','鼓','固',null], gua:['瓜',null,'寡','挂',null],
    guo:['锅','国','果','过',null], guai:[null,'乖','拐','怪',null],
    gui:['归','桂','鬼','贵',null], guan:['关','官','管','贯',null],
    gun:[null,'滚','辊','棍',null], guang:['光',null,'广','逛',null],
    ka:['卡',null,'卡','卡',null], ke:['科','科','可','课',null],
    kai:['开',null,'凯','慨',null], kao:['烤',null,'考','靠',null],
    kou:['抠','叩','口','扣',null], kan:['看','看','坎','砍',null],
    ken:[null,'肯','肯','垦',null], kang:['康','抗','炕','炕',null],
    keng:['坑',null,null,'坑',null], ku:['哭',null,'苦','酷',null],
    kua:['夸',null,'垮','跨',null], kuo:[null,'扩','括','阔',null],
    kuai:['快',null,'快','筷',null], kui:['亏','魁','葵','馈',null],
    kuan:['宽',null,'款','款',null], kun:['昆',null,'捆','困',null],
    kuang:['框','狂','旷','矿',null],
    ha:['哈',null,null,'哈',null], he:['喝','合','喝','和','和'],
    hai:['还','孩','海','害',null], hei:['黑',null,null,null,'嘿'],
    hao:['蒿','毫','好','号',null], hou:['猴','喉','吼','后',null],
    han:['含','喊','汉','汗',null], hen:['痕','很','恨','很',null],
    hang:['航','行','巷','杭',null], heng:['哼','横','横','横',null],
    hu:['呼','狐','虎','互',null], hua:['花','华','话','化',null],
    huo:['火','霍','货','活',null], huai:['怀',null,'坏','坏',null],
    hui:['灰','回','毁','会',null], huan:['欢','环','缓','换',null],
    hun:['昏','魂','混','混',null], huang:['荒','黄','谎','晃',null],
    ji:['鸡','及','己','技',null], jia:['加','甲','假','价',null],
    jie:['街','结','解','借',null], jiao:['交','叫','脚','教',null],
    jiu:['纠','旧','九','就',null], jian:['间','减','建','见',null],
    jin:['金','尽','紧','进',null], jiang:['江','讲','将','酱',null],
    jing:['京','晶','境','靖',null], ju:['居','局','举','据',null],
    jue:['撅','绝','觉','厥',null], juan:['卷','倦','卷','捐',null],
    jun:['军','俊','均','竣',null],
    qi:['期','其','起','气',null], qia:[null,'洽','掐',null,null],
    qie:['切','茄','切','且',null], qiao:['敲','桥','巧','撬',null],
    qiu:['秋','球','丘','仇',null], qian:['签','钱','浅','欠',null],
    qin:['亲','勤','寝','沁',null], qiang:['腔','强','抢','墙',null],
    qing:['清','情','请','庆',null], qiong:[null,'穷','琼',null,null],
    qu:['区','渠','取','去',null], que:['缺',null,'却','确',null],
    quan:['圈','全','犬','权',null], qun:['群',null,null,'裙',null],
    xi:['西','习','洗','细',null], xia:['虾','狭','下','夏',null],
    xie:['些','鞋','写','谢',null], xiao:['消','效','小','笑',null],
    xiu:['修','休','秀','嗅',null], xian:['先','贤','显','现',null],
    xin:['心','新','信','辛',null], xiang:['香','翔','想','向',null],
    xing:['星','行','醒','性',null], xiong:['凶','熊','兄','雄',null],
    xu:['需','续','许','叙',null], xue:['雪','学','穴','血',null],
    xuan:['宣','旋','选','选',null], xun:['熏','寻','训','迅',null],
    zhi:['之','直','只','志',null], zha:['扎','查','炸','渣',null],
    zhe:['这','折','折','者','着'], zhai:['摘','宅','窄','斋',null],
    zhao:['招','着','找','照',null], zhou:['州','周','肘','住',null],
    zhan:['沾','占','展','站',null], zhen:['针','珍','枕','阵',null],
    zhang:['张','章','掌','帐',null], zheng:['争','蒸','整','正',null],
    zhu:['猪','竹','主','住',null], zhuo:['桌','着','拙','卓',null],
    zhui:['追','坠','锥','缀',null], zhuan:['专','转','砖','赚',null],
    zhun:[null,'准','准','准',null], zhuang:['装','壮','撞','庄',null],
    chi:['吃','迟','齿','翅',null], cha:['插','茶','查','差',null],
    che:['车',null,'扯','撤',null], chai:['拆','柴','差','差',null],
    chao:['抄','朝','炒','超',null], chou:['抽','仇','臭','丑',null],
    chan:['产','搀','禅','阐',null], chen:['沉','趁','辰','衬',null],
    chang:['唱','常','厂','场',null], cheng:['成','承','撑','秤',null],
    chu:['出','初','楚','处',null], chuo:['戳',null,'戳','绰',null],
    chui:['吹','锤','锤','炊',null], chuan:['船','传','串','喘',null],
    chun:['春','纯','蠢','春',null], chuang:['床','窗','创','闯',null],
    shi:['诗','时','史','是',null], sha:['沙','杀','啥','刹',null],
    she:['蛇','舍','射','折',null], shei:['谁',null,null,null,null],
    shao:['烧','哨','少','绍',null], shou:['收','受','手','授',null],
    shan:['山','扇','闪','善',null], shen:['申','深','肾','甚',null],
    shang:['上','商','赏','伤',null], sheng:['声','生','圣','盛',null],
    shu:['书','树','鼠','数',null], shuo:['说',null,null,'说',null],
    shui:['水',null,'水','税',null], shuan:[null,'拴','涮','涮',null],
    shun:[null,'顺','瞬','瞬',null], shuang:['双',null,'爽','爽',null],
    ri:[null,null,null,'日',null], re:[null,'热',null,'惹',null],
    rao:['饶',null,'扰','绕',null], rou:['柔',null,null,'肉',null],
    ran:['燃',null,'染','染',null], ren:['人','任','忍','认',null],
    rang:['嚷','让','壤','让',null], reng:[null,'仍',null,null,null],
    ru:['儒','乳','入','如',null], ruo:[null,null,'若','弱',null],
    rui:[null,'瑞','蕊','锐',null], ruan:[null,'软',null,null,null],
    run:[null,'润',null,null,null],
    zi:['姿','字','子','自',null], za:['杂',null,null,'砸',null],
    ze:['择',null,'则','贼',null], zai:['灾',null,'再','在',null],
    zei:[null,'贼',null,null,null], zao:['遭','糟','早','造',null],
    zou:['走','奏','凑','走',null], zan:['赞',null,'攒','赞',null],
    zen:[null,'怎',null,null,null], zang:['赃',null,'葬','脏',null],
    zeng:['增',null,'曾','赠',null], zu:['祖','族','阻','足',null],
    zuo:['坐','昨','左','做',null], zui:['最',null,'嘴','罪',null],
    zuan:['钻',null,'纂','攥',null], zun:[null,'遵','尊',null,null],
    ci:['词','慈','次','此',null], ca:['擦',null,null,null,null],
    ce:['测',null,null,'策',null], cai:['猜','才','采','菜',null],
    cao:['操','槽','草','操',null], cou:[null,null,'凑','凑',null],
    can:['参','惨','残','灿',null], cen:[null,'岑',null,null,null],
    cang:['仓',null,'藏','苍',null], ceng:['层',null,'曾','蹭',null],
    cu:['粗',null,'促','醋',null], cuo:['搓','锉','措','错',null],
    cui:['崔','脆','摧','翠',null], cuan:[null,null,'蹿','窜',null],
    cun:['村',null,'寸','存',null],
    si:['思','斯','死','四',null], sa:['撒','萨',null,'撒',null],
    se:['色',null,null,'色',null], sai:['赛',null,'塞','赛',null],
    sao:['骚',null,'扫','嫂',null], sou:['搜',null,'叟',null,null],
    san:['三','散','伞','散',null], sen:[null,'森','森',null,null],
    sang:['丧',null,'嗓','丧',null], seng:[null,'僧',null,null,null],
    su:['苏','速','素','宿',null], suo:['锁',null,'所','缩',null],
    sui:['碎','虽','随','岁',null], suan:['酸',null,'算','蒜',null],
    sun:['孙',null,'损','笋',null],
  }

  // ── State ────────────────────────────────────────────────────────────────
  let popup = null   // { syl }
  let search = ''

  // ── Speak ────────────────────────────────────────────────────────────────
  // Change AUDIO_BASE to your Supabase bucket URL after uploading the files there
  const AUDIO_BASE = 'https://trehfvxlqfshfhcapqca.supabase.co/storage/v1/object/public/pinyin-audio'

  window.pinyinSpeak = (syl, tone) => {
    if (tone < 4) {
      // tones 1-4: play MP3 file
      new Audio(`${AUDIO_BASE}/${syl}${tone + 1}.mp3`).play().catch(() => {
        // fallback to TTS with Hanzi if audio fails (e.g. rare tone combo)
        const char = CHAR_TONES[syl]?.[tone]
        if (!char) return
        speechSynthesis.cancel()
        const utt = new SpeechSynthesisUtterance(char)
        utt.lang = 'zh-CN'; utt.rate = 0.85
        speechSynthesis.speak(utt)
      })
    } else {
      // neutral tone: no standard audio file, use Hanzi TTS
      const char = CHAR_TONES[syl]?.[4]
      if (!char) return
      speechSynthesis.cancel()
      const utt = new SpeechSynthesisUtterance(char)
      utt.lang = 'zh-CN'; utt.rate = 0.85
      speechSynthesis.speak(utt)
    }
  }

  window.pinyinOpen  = syl => { popup = syl; render() }
  window.pinyinClose = ()  => { popup = null; render() }
  window.pinyinSearch = val => { search = val; render() }

  // ── Render ───────────────────────────────────────────────────────────────
  function render() {
    const TONE_LABELS = ['1st ─', '2nd /', '3rd ∨', '4th \\', 'neutral']
    const TONE_COLORS = ['#2563eb','#16a34a','#d97706','#dc2626','#64748b']

    // Popup
    const popupHTML = popup ? (() => {
      const tones = [0,1,2,3,4]
      return `
        <div onclick="if(event.target===this)pinyinClose()"
          style="position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:200;display:flex;align-items:center;justify-content:center">
          <div style="background:white;border-radius:20px;padding:28px 32px;min-width:300px;box-shadow:0 24px 60px rgba(0,0,0,.2);position:relative">
            <button onclick="pinyinClose()" style="position:absolute;top:14px;right:16px;background:none;border:none;font-size:20px;cursor:pointer;color:#94a3b8">×</button>
            <div style="font-size:22px;font-weight:800;color:#0f172a;margin-bottom:6px;font-family:'Space Grotesk',sans-serif">${popup}</div>
            <div style="font-size:12px;color:#94a3b8;margin-bottom:20px;letter-spacing:.5px">BỐN THANH ĐIỆU</div>
            <div style="display:flex;flex-direction:column;gap:10px">
              ${tones.map(t => {
                const toned = applyTone(popup, t)
                return `
                  <div style="display:flex;align-items:center;gap:14px">
                    <button onclick="pinyinSpeak('${popup}',${t})"
                      style="width:36px;height:36px;border-radius:50%;border:none;background:#f1f5f9;cursor:pointer;font-size:16px;flex-shrink:0">▶</button>
                    <div style="flex:1">
                      <span style="font-size:26px;font-weight:700;color:${TONE_COLORS[t]};font-family:'Space Grotesk',sans-serif">${toned}</span>
                    </div>
                    <span style="font-size:11px;color:#94a3b8;font-weight:600">${TONE_LABELS[t]}</span>
                  </div>`
              }).join('')}
            </div>
          </div>
        </div>`
    })() : ''

    // Filter by search
    const sq = search.trim().toLowerCase()

    // Table
    const headerCols = `
      <th style="${TH}background:#0f172a;color:white;border-color:#1e293b"></th>
      ${INITIALS.map(ini => `
        <th style="${TH}background:${ini?'#0f172a':'#334155'};color:white;border-color:#1e293b;font-size:13px">
          ${ini || '∅'}
        </th>`).join('')}`

    const rows = FINALS.map(fin => {
      const label = FINAL_DISPLAY[fin] || fin
      const cells = INITIALS.map(ini => {
        const syl = getSyllable(ini, fin)
        if (!syl) return `<td style="${TD}color:#e2e8f0">·</td>`
        const highlight = sq && syl.includes(sq)
        return `
          <td style="${TD}">
            <button onclick="pinyinOpen('${syl}')"
              style="padding:5px 8px;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600;
                background:${highlight?'#fef3c7':'transparent'};color:${highlight?'#92400e':'#0f172a'};
                width:100%;transition:background .15s"
              onmouseover="this.style.background='#dbeafe';this.style.color='#1d4ed8'"
              onmouseout="this.style.background='${highlight?'#fef3c7':'transparent'}';this.style.color='${highlight?'#92400e':'#0f172a'}'">
              ${syl}
            </button>
          </td>`
      }).join('')
      return `
        <tr>
          <td style="${TD}background:#0891b2;color:white;font-weight:700;font-size:13px;text-align:center">${label}</td>
          ${cells}
        </tr>`
    }).join('')

    app.innerHTML = `
      ${popupHTML}
      <div style="min-height:100vh;background:#f8faff">

        <div style="background:white;border-bottom:1px solid #e2e8f0;padding:24px 40px">
          <div style="max-width:1200px;margin:auto;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px">
            <div>
              <h1 style="font-size:24px;font-weight:800;color:#0f172a;margin:0 0 4px;font-family:'Space Grotesk',sans-serif">
                🀄 Bảng Phiên âm Pinyin
              </h1>
              <p style="margin:0;font-size:13px;color:#64748b">Click vào âm tiết để nghe phát âm 4 thanh điệu</p>
            </div>
            <input oninput="pinyinSearch(this.value)" value="${search}"
              placeholder="🔍 Tìm âm tiết (vd: ba, zhi...)"
              style="padding:10px 16px;border:1px solid #e2e8f0;border-radius:10px;font-size:13px;width:240px;outline:none">
          </div>
        </div>

        <div style="max-width:1200px;margin:24px auto;padding:0 20px 48px;overflow-x:auto">

          <div style="display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap">
            ${[0,1,2,3,4].map((t,_,arr) => `
              <div style="display:flex;align-items:center;gap:6px;background:white;border:1px solid #e2e8f0;border-radius:8px;padding:6px 12px">
                <span style="font-size:15px;font-weight:700;color:${['#2563eb','#16a34a','#d97706','#dc2626','#64748b'][t]}">${applyTone('ma', t)}</span>
                <span style="font-size:11px;color:#94a3b8">${['Thanh 1 (ngang)','Thanh 2 (hỏi)','Thanh 3 (hỏi lửng)','Thanh 4 (nặng)','Thanh nhẹ'][t]}</span>
              </div>`).join('')}
          </div>

          <table style="border-collapse:collapse;min-width:100%;background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.06)">
            <thead><tr>${headerCols}</tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`
  }

  const TH = 'padding:10px 6px;border:1px solid #374151;text-align:center;font-weight:700;min-width:42px;'
  const TD = 'padding:3px;border:1px solid #f1f5f9;text-align:center;'

  render()
}
