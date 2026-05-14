// Auto-fill CEFR level (A1-C2) for question_vocab words
// Usage: node scripts/fill-vocab-levels.js [--all] [--dry-run]
//   --all     : overwrite words that already have a level
//   --dry-run : print what would change, don't save

const SUPABASE_URL = 'https://trehfvxlqfshfhcapqca.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyZWhmdnhscWZzaGZoY2FwcWNhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzExMDQxMywiZXhwIjoyMDkyNjg2NDEzfQ.q6tjK7xCgnUUbhfeGlxlJo1x9CvdIYRO-NpM_BNqczs'

const DRY_RUN = process.argv.includes('--dry-run')
const FIX_ALL = process.argv.includes('--all')

async function sb(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
      ...(opts.headers || {}),
    },
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`${res.status}: ${text}`)
  return text ? JSON.parse(text) : null
}

// ── CEFR word map ────────────────────────────────────────────────────────────
const CEFR_RAW = {
  A1: `
    a about address after again age all also always am an and another answer any are ask
    at back bad bag bank be because before big book both box boy bus but buy by
    call can car chair cheap city class clean close clothes coffee cold come cook cost
    country cut day desk do door drink drive dry early eat eight email end english every
    family fast few find five food for four free friend from get girl give go good great
    happy have he help here him his home hot hotel hour house how i if in it its
    job just key know language late learn left let like list little live look love
    make man many map market me meet minute money month more morning most much my
    name near need new next night no not now number of office old on open or other
    our out park pay people phone place plan play please price put read red
    restaurant right road room run same school see sell send she shop short sign sit
    six slow small so some sorry speak start stay stop store table take talk ten tell
    than thank that the their them then there they thing think this three ticket time
    to today together too travel two use wait want water we week well what when where
    who why with work write year yes you your
    airplane airport backpack basket bicycle bottle box brush bucket bus
    camera cap clock color colour cup fish flower garden gate glass hat
    iron key lamp letter light lunch lunch menu newspaper park pencil photo
    picture plant pool rain shirt shoe soup sport sun ticket town tree truck umbrella
    window
  `,

  A2: `
    able accept accident across activity add agree air already amount apartment area
    arrive assistant away beautiful believe between bill bit body borrow break bring
    build business busy cancel care change charge check choose club comfortable community
    company complete contact correct customer decide deliver department describe difficult
    direct discount discuss document down each empty enjoy enough even event ever
    exactly example explain face fail fall far feel fill finish follow form forward full
    general glad group grow guess guide happen heart high hold holiday important include
    interest invite join keep kind kitchen large last leave less letter life light line
    local long lose lot low luck main manager maybe mean member message miss move
    offer often only opinion order organise organize outside over page part perhaps pick
    popular possible prepare probably produce program project provide public question quick
    quiet reach ready real receive record remain reply report require reserve return review
    role safe save seat seem service set several share show similar simple since situation
    size skill sleep soon sort special staff stand step study subject support teach test
    touch town try turn type understand until up useful usually view visit voice wonder
    word world would wrong actor afternoon agree agreement already area away
    account admire annual anniversary appear appreciate assign assist assure attend
    bakery balcony bookstore booth brochure calendar carry cashier catering celebrate
    certificate charity checkout closet coffeemaker collaborate color commute competitor
    complain complimentary confirm copy corridor countryside customer damage decorate
    department direct donate downtown empty entrance escalator exercise fall familiar
    fantastic farm fee field finish floor follow game gift graduate grateful grocery
    grow guest gym hallway harbor heavy help hire hobby homeless hotel hour identify
    item journey label lane laundry lease library lunch machine map material mechanic
    medical neighborhood notice number object official outdoor own park passenger
    path permit pharmacy picture playground police pool popular pretty price printer
    professor protect recycle region remark remove repair resident retire return ride
    rural salmon seat sidewalk sign soil someone sometimes staff station stranger
    street supermarket surface surrounding survey swim technician temporary terminal
    ticket tool transfer uniform vehicle volunteer walk weather weekend window
  `,

  B1: `
    abroad absence absence absorb acceptance accessibility accounting accumulate
    advertisement advertising agenda agriculture aisle amenity analyse analyze animation
    appliance applicant appoint artwork assignment attendance attendee automobile
    availability avenue award
    backpack beverage bid bonus bulletin
    cafeteria calculate campaign cargo cashier celebrate celebration champion
    charity claim clinic collaborate colleague commence commercial commute compatible
    competent compensate competitor complain compose confirm construction continue
    cooperate coordinator curriculum
    deadline decline deliver demonstrate develop director distribute documentary
    donation driver duration
    economic editor educator electricity emission employee employment encourage
    enforce enterprise environment equipment estate evaluate executive expand
    experience expert extend
    facility fair festival financial flexible foreign form foundation fund fundraise
    gallery gardener glitch grant graphics guarantee guideline
    harbor headline headquarter highlight highway hire hospitality humidity
    illustrate improvement incentive incorporate increase industry initiative inspection
    installment instruct intake international inventory investigate invitation invoice
    journalist judging
    keynote landlord landmark launch leadership lease lecture licence license limit
    lobby location lounge
    maintain manufacture measure mechanic media medical membership mentor minimize
    municipality navigate negotiate network notice nutrition
    observe occasion offer operate outcome oversee ownership
    participate performance permit personnel photographer policy politician potential
    presentation priority procedure productive proficiency promotion proposal
    quality recognize recommendation recruit regulation relationship renovation
    reputation require researcher reserve residential resource retire revenue
    safety satisfaction seasonal secure selection session settlement showcase signage
    solution specialize sponsor standard strategic subscription supervision survey
    technical technician tenant terminal tourism training transportation trend tuition
    update utilize variety vendor venue volunteer wellness
  `,

  B2: `
    accommodate accommodation accountability accuracy acquisition adequate administrative
    abstract abrupt abruptly absorption abundance accessibility acknowledge
    affidavit aggregate amendment amplitude anthropology aperture apprenticeship
    arbitrary articulate artifact auction auditorium authentic authorize aviation
    biodegradable breach broker
    calculate certification circulate clarify coherent collaborative commodity compensation
    compatible complexity compliance consolidate contingency contractual convergence
    corroborate credential criteria critique
    deficit deliberate designation determination differentiate discourse discrepancy
    disseminate distinctive divestiture documentation dominate
    eligibility eloquent emission enumerate escalate evaluation expedite
    feasibility fiscal fluctuate formulate freight fundamental
    geothermal governance
    hierarchy hypothesis implement incentivize incorporate indication infrastructure
    initiative integrate integrity intervention investigate justification
    jurisdiction legacy legislation leverage liability litigation maximize methodology
    minimize modification momentum monitor
    negotiation notification objective optimize orientation outcome oversight parameter
    perspective preliminary procurement proficiency projection promotion prospective
    qualification rationale recommendation recruitment regulatory reinforce reimbursement
    representation restructure retention revenue revision
    standardize streamline submission supervision sustainability terminate transition
    transparent utilization validation verification versatile viability viable volatility
  `,

  C1: `
    accolade academia acumen adherence adjacent advocacy affiliation aggregate allegation allocation
    ambiguity ameliorate annotation apparatus arbitration articulate assimilation attrition
    circumvent clarification codify coherence commensurate commodify consolidation
    contingency contractual convey corroborate culminate delineate deliberate disseminate
    diversity divestiture enumerate equilibrium escalate exemplify expeditious extrapolate
    governance incentivize indemnify innovative jurisdiction leverage liability litigious
    meticulous mitigate modulate nomenclature obligation oversight perpetuate precedent
    proprietary rationale rectify redundancy reinstate remediate remuneration repatriate
    requisition retrospective scrutinize stipulate strategize subordinate substantiate
    sufficiency supersede synthesize transparency undermine validate
    abstract ambiguity assertive benchmark bias catalyst coherent
    connotation cultivate deter diverge elaborate elicit encapsulate fluctuate
    imply inference inherent nuance paradox phenomenon pragmatic predominantly premise
    prevalent proliferate reinforce resilient rigorous underlying
    commence commencement aperture biographer archival aesthetic abundance amenity aviation
  `,

  C2: `
    abate adjudicate amelioration arbitrate ascertain assiduous attenuate capitulate
    caveat coalesce diligent disambiguate espouse exacerbate expedient germane holistic
    imminent impeccable impervious inaugurate infringe jeopardize modicum obfuscate
    obsolete ostensibly paradigm pervasive prerequisite proliferate redress rescind
    stringent tantamount ubiquitous underpin unilateral verbatim
    abstruse acrimonious anachronistic antipodean arcane bellicose byzantine
    circumlocution convoluted deleterious egregious elusive ephemeral esoteric
    fastidious impervious inimitable inscrutable intransigent laconic
    mendacious obstinate perspicacious propitious querulous recalcitrant
    sagacious sanguine tenacious verbose
  `,
}

// Build reverse lookup: word → level
const LOOKUP = new Map()
for (const [lvl, block] of Object.entries(CEFR_RAW)) {
  for (const w of block.trim().split(/\s+/)) {
    const key = w.toLowerCase().trim()
    if (key && !LOOKUP.has(key)) LOOKUP.set(key, lvl) // keep lowest level if duplicate
  }
}

// Level order for comparison
const LEVEL_ORDER = { A1:1, A2:2, B1:3, B2:4, C1:5, C2:6 }

// Common derivational suffix → base form (strip suffix, optionally add replacement)
const SUFFIXES = [
  ['izations','ize'],['izations','ise'],
  ['isation','ise'],['ization','ize'],
  ['ations','ate'],['tion','te'],['ation','ate'],
  ['sions','se'],['sion','se'],
  ['ments',''],['ment',''],
  ['nesses',''],['ness',''],
  ['ities',''],['ity',''],['ity','e'],
  ['fulness',''],['ful',''],
  ['lessness',''],['less',''],
  ['abilities','able'],['ably','able'],['able',''],['ible',''],
  ['ively','ive'],['ives','ive'],['ive','e'],['ive',''],
  ['ously','ous'],['ous',''],
  ['ially','ial'],['ial',''],['ial','y'],
  ['ically','ic'],['ics',''],['ic',''],
  ['ally','al'],['als',''],['al',''],
  ['ers',''],['er',''],['est',''],
  ['ings',''],['ing',''],['ing','e'],
  ['eds',''],['ed',''],['ed','e'],
  ['ies','y'],['ied','y'],
  ['s',''],
]

function baseForm(w) {
  for (const [sfx, rep] of SUFFIXES) {
    if (w.endsWith(sfx) && w.length > sfx.length + 2) {
      return w.slice(0, w.length - sfx.length) + rep
    }
  }
  return null
}

function lookupSingle(w) {
  const key = w.toLowerCase().trim()
  if (!key || key.length < 2) return null
  if (LOOKUP.has(key)) return LOOKUP.get(key)
  // Try stripping suffix
  const base = baseForm(key)
  if (base && LOOKUP.has(base)) return LOOKUP.get(base)
  // Try double suffix strip
  if (base) {
    const base2 = baseForm(base)
    if (base2 && LOOKUP.has(base2)) return LOOKUP.get(base2)
  }
  return null
}

// Stop words to ignore when scanning multi-word phrases
const STOP = new Set([
  'a','an','the','of','in','on','at','for','with','by','to','from','and','or',
  'is','are','was','were','be','been','as','up','out','off','over','under',
  'well','all','too','very','some','any','each','per',
])

// Patterns → forced level (for phrases that can't be looked up by word)
// Checked BEFORE word-level lookup
const PHRASE_PATTERNS = [
  [/\b(CEO|CFO|COO|CTO|VP|HR)\b/i,                           'B2'],
  [/\b(headquarter|subsidiary|affiliate|merger|acquisition)\b/i, 'B2'],
  [/\b(biodegradable|sustainable|renewable|geothermal)\b/i,   'C1'],
  [/\b(invoice|receipt|payroll|reimburs|remittance)\b/i,      'B1'],
  [/\b(brochure|leaflet|pamphlet|flyer)\b/i,                  'B1'],
  [/\b(cafeteria|lunchroom|canteen)\b/i,                      'B1'],
  [/\b(aisle|corridor|hallway|lobby|lounge)\b/i,              'B1'],
  [/\b(beverage|appetizer|entree|entrée)\b/i,                 'B1'],
  [/\b(auction|bid|tender|procurement)\b/i,                   'B2'],
  [/\b(freight|cargo|shipment|consignment)\b/i,               'B2'],
  [/\b(warranty|guarantee|refund|exchange)\b/i,               'B1'],
  [/\b(blueprint|schematic|prototype|mock.?up)\b/i,           'B2'],
  [/\b(seminar|symposium|webinar|keynote)\b/i,                'B1'],
  [/\b(apprenticeship|internship|fellowship)\b/i,             'B2'],
  [/\b(pharmaceutical|automotive|aerospace|biotech)\b/i,      'C1'],
  [/\b(agriculture|horticulture|viticulture)\b/i,             'B2'],
  [/\b(architect|architecture|architectural)\b/i,             'B1'],
  [/\b(celebrate|celebration|anniversary|gala|banquet)\b/i,   'B1'],
  [/\b(charity|donation|fundrais|nonprofit|philanthrop)\b/i,  'B1'],
  [/\b(commute|commuter|rush hour)\b/i,                       'B1'],
  [/\b(compatible|incompatible)\b/i,                          'B2'],
  [/\b(complimentary|compliment)\b/i,                         'B2'],
  [/\b(commence|commencement)\b/i,                            'C1'],
  [/\b(campaign|branding|advertising|marketing)\b/i,          'B1'],
  [/\b(renovation|refurbishment|remodel)\b/i,                 'B2'],
  [/\b(tenant|landlord|lease|mortgage|rental)\b/i,            'B1'],
  [/\b(certificate|diploma|credential|qualification)\b/i,     'B1'],
  [/\b(manuscript|bibliography|appendix|abstract)\b/i,        'C1'],
  [/\b(photography|photographer|photograph)\b/i,              'B1'],
  [/\b(auditorium|amphitheater|coliseum)\b/i,                 'B2'],
  [/\b(automobile|automotive|vehicle)\b/i,                    'B1'],
  [/\b(ample|abundant|plentiful|sufficient)\b/i,              'B2'],
  [/\b(authentic|authenticity|genuine)\b/i,                   'B2'],
  [/\b(aesthetic|aesthetics|artistic)\b/i,                    'C1'],
  [/\b(aperture|exposure|shutter)\b/i,                        'C1'],
  [/\b(biograph|memoir|autobiography)\b/i,                    'C1'],
]

function lookupPhrase(phrase) {
  const lower = phrase.toLowerCase().trim()
  const words = lower.split(/[\s\-\/]+/).filter(w => w.length > 1)
  if (!words.length) return null

  // Check phrase patterns first
  for (const [pat, lvl] of PHRASE_PATTERNS) {
    if (pat.test(lower)) return lvl
  }

  // If single word, just look it up
  if (words.length === 1) return lookupSingle(words[0])

  // For multi-word phrases: collect levels of content words, return the highest level
  const levels = words
    .filter(w => !STOP.has(w))
    .map(w => lookupSingle(w))
    .filter(Boolean)

  if (!levels.length) return null

  return levels.reduce((best, cur) =>
    (LEVEL_ORDER[cur] || 0) > (LEVEL_ORDER[best] || 0) ? cur : best
  )
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function main() {
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'} | ${FIX_ALL ? 'Overwrite all' : 'Skip already set'}\n`)

  const query = FIX_ALL
    ? 'question_vocab?select=id,word,level&order=word'
    : 'question_vocab?select=id,word,level&level=is.null&order=word'
  const rows = await sb(query)
  console.log(`${rows.length} words to process\n`)

  let updated = 0, skipped = 0, unknown = 0
  const unknownWords = []

  for (const row of rows) {
    const level = lookupPhrase(row.word)
    if (!level) {
      unknownWords.push(row.word)
      unknown++
      continue
    }

    if (DRY_RUN) {
      console.log(`  ${row.word.padEnd(36)} → ${level}`)
      updated++
      continue
    }

    try {
      await sb(`question_vocab?id=eq.${row.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ level }),
      })
      process.stdout.write('.')
      updated++
    } catch(e) {
      console.error(`\n  ✗ ${row.word}: ${e.message}`)
    }
  }

  if (!DRY_RUN) console.log()
  console.log(`\nDone. Updated: ${updated}, Unknown (skipped): ${unknown}`)

  if (unknownWords.length) {
    console.log(`\n── Từ chưa map được (${unknownWords.length}) ──`)
    unknownWords.forEach(w => console.log(`  ${w}`))
  }
}

main().catch(console.error)
