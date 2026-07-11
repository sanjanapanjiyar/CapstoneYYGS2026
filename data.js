// Cultural Sound Studio — curated element library.
// Each element: cultural origin, meaning, status (open / learn-first / restricted),
// a real source citation, tags for the assistant, and a synthesized sound spec.
// status: "open" = free to use · "learn-first" = unlocks after reading context ·
// "restricted" = view-only, never playable or usable (explained in `context`).
// flex: 0 = belongs in its traditional context, 1 = travels well into hybrids.

const ELEMENTS = [
  {
    id: "clave", name: "Son Clave (3–2)", type: "Rhythm",
    tradition: "Afro-Cuban", region: "Cuba",
    meaning: "The five-stroke timeline that anchors son, rumba and salsa. Its roots are West African bell patterns carried across the Atlantic by enslaved people — the clave is a survival story as much as a groove.",
    status: "open", context: null,
    source: "D. Peñalosa, The Clave Matrix: Afro-Cuban Rhythm (2009)",
    tags: ["dance", "celebration", "upbeat", "groove"], flex: 0.55,
    sound: { kind: "rhythm", kit: "wood", bars2: true, pattern: [{i:0,s:"hi"},{i:3,s:"hi"},{i:6,s:"hi"},{i:10,s:"hi"},{i:12,s:"hi"}] }
  },
  {
    id: "kuku", name: "Kuku (Djembe)", type: "Rhythm",
    tradition: "Mandé", region: "Guinea, West Africa",
    meaning: "A circle-dance rhythm from the forest region of Guinea, traditionally played to celebrate when women returned from fishing. Today it opens festivities across West Africa and the diaspora.",
    status: "open", context: null,
    source: "M. Keïta & U. Billmeier, A Life for the Djembé (1999)",
    tags: ["celebration", "communal", "upbeat", "dance"], flex: 0.35,
    sound: { kind: "rhythm", kit: "djembe", pattern: [{i:0,s:"bass"},{i:2,s:"tone"},{i:3,s:"tone"},{i:4,s:"bass"},{i:6,s:"tone"},{i:7,s:"slap"}] }
  },
  {
    id: "taiko", name: "Matsuri-daiko", type: "Rhythm",
    tradition: "Japanese", region: "Japan",
    meaning: "Festival drumming that enlivens shrine processions and summons the community. The modern ensemble form (kumi-daiko) is a 20th-century creation that grew out of these festival roots.",
    status: "open", context: null,
    source: "S. Bender, Taiko Boom: Japanese Drumming in Place and Motion (2012)",
    tags: ["celebration", "energetic", "powerful", "festival"], flex: 0.45,
    sound: { kind: "rhythm", kit: "taiko", pattern: [{i:0,s:"don"},{i:3,s:"don"},{i:4,s:"don"},{i:6,s:"ka"},{i:7,s:"ka"}] }
  },
  {
    id: "bulerias", name: "Bulerías Compás", type: "Rhythm",
    tradition: "Flamenco (Gitano)", region: "Andalusia, Spain",
    meaning: "A fiery 12-beat cycle from Jerez, the fastest and most playful flamenco form. Flamenco grew from the music of Andalusian Roma communities — credit belongs with them, not just 'Spain'.",
    status: "open", context: null,
    source: "R. Totton, Song of the Outcasts: An Introduction to Flamenco (2003)",
    tags: ["fiery", "dance", "celebration", "intense"], flex: 0.35,
    sound: { kind: "rhythm", kit: "palmas", twelve: true, pattern: [{i:2,s:"acc"},{i:5,s:"acc"},{i:7,s:"acc"},{i:9,s:"acc"},{i:11,s:"acc"},{i:0,s:"tick"},{i:3,s:"tick"},{i:6,s:"tick"}] }
  },
  {
    id: "bossa", name: "Bossa Nova Pattern", type: "Rhythm",
    tradition: "Brazilian", region: "Rio de Janeiro, Brazil",
    meaning: "The 'stammering guitar' pulse of late-1950s Rio — samba slowed down and cooled with jazz harmony. Itself a respectful fusion, it shows how borrowing can honor its sources.",
    status: "open", context: null,
    source: "R. Castro, Bossa Nova: The Story of the Brazilian Music (2000)",
    tags: ["relaxed", "romantic", "smooth", "evening"], flex: 0.8,
    sound: { kind: "rhythm", kit: "rim", bars2: true, pattern: [{i:0,s:"hi"},{i:3,s:"hi"},{i:6,s:"hi"},{i:10,s:"hi"},{i:13,s:"hi"}] }
  },
  {
    id: "gong", name: "Gōng Pentatonic Mode", type: "Scale",
    tradition: "Han Chinese", region: "China",
    meaning: "The five-tone gōng mode at the heart of Chinese classical and folk melody. In classical theory each tone maps to an element, a direction and a season — the scale is a small cosmology.",
    status: "open", context: null,
    source: "A. Thrasher, Chinese Musical Instruments (2000)",
    tags: ["calm", "pastoral", "bright"], flex: 0.45,
    sound: { kind: "scale", root: 261.6, notes: [0, 2, 4, 7, 9, 12] }
  },
  {
    id: "sikuri", name: "Sikuri Panpipe Melody", type: "Instrument",
    tradition: "Aymara / Quechua", region: "Andes, Peru & Bolivia",
    meaning: "Siku panpipes are played in interlocking pairs — each player holds half the notes, so no one can play the melody alone. The instrument literally encodes community and complementarity.",
    status: "open", context: null,
    source: "T. Turino, Moving Away from Silence (1993)",
    tags: ["communal", "festive", "breathy", "highland"], flex: 0.4,
    sound: { kind: "pipes", root: 440, notes: [12, 9, 7, 4, 0, 4, 7] }
  },
  {
    id: "kora", name: "Kora Kumbengo", type: "Instrument",
    tradition: "Mandé (Jali)", region: "Mali, Senegal, The Gambia",
    meaning: "A rippling ostinato on the 21-string harp-lute of the jali (griots) — hereditary musician-historians who keep centuries of genealogy and history alive in song.",
    status: "learn-first",
    context: "The kora is not a free-floating 'world music' texture. By tradition it belongs to jali families, and playing it is inseparable from the griot's social role: praising, remembering, mediating. Borrowing its sound while erasing the jali erases the people the instrument exists to serve. Artists like Toumani Diabaté (a 71st-generation jali) have brought the kora into global collaborations — on their own terms, with their lineage named.",
    source: "E. Charry, Mande Music (2000)",
    tags: ["storytelling", "flowing", "calm", "praise"], flex: 0.25,
    sound: { kind: "arp", root: 220, notes: [0, 12, 7, 16, 5, 12, 9, 16] }
  },
  {
    id: "yaman", name: "Raga Yaman", type: "Scale",
    tradition: "Hindustani", region: "North India",
    meaning: "One of the first ragas a student learns, sung in the early evening. Its raised fourth gives it a floating, devotional sweetness.",
    status: "learn-first",
    context: "A raga is not a scale. Yaman comes with a prescribed time of day (early evening), a mood of devotion and romance, and a grammar of characteristic phrases — treating it as just 'seven notes' flattens a living discipline that takes decades to master. Use its color, but know that in Hindustani music the raga is the composition's soul, not its ingredient.",
    source: "J. Bor (ed.), The Raga Guide (1999)",
    tags: ["evening", "devotional", "calm", "romantic"], flex: 0.2,
    sound: { kind: "scale", root: 261.6, notes: [0, 2, 4, 6, 7, 9, 11, 12] }
  },
  {
    id: "hijaz", name: "Maqam Hijaz", type: "Scale",
    tradition: "Arab", region: "Eastern Mediterranean & Levant",
    meaning: "The maqam of longing and distance, named for the Hijaz region of Arabia. Its raised third over a flat second is instantly evocative — and endlessly stereotyped.",
    status: "learn-first",
    context: "Hijaz is the sound most often grabbed for lazy 'desert' and 'snake-charmer' clichés. A real maqam carries microtonal intonation and rules of melodic journey (sayr) that a piano scale can't capture, and it lives in everything from love songs to the call to prayer. Use it for its actual feeling — yearning, distance — not as an 'exotic' costume.",
    source: "S. Marcus, Music in Egypt (2007); maqamworld.com",
    tags: ["longing", "ornate", "soulful"], flex: 0.25,
    sound: { kind: "scale", root: 220, notes: [0, 1, 4, 5, 7, 8, 10, 12] }
  },
  {
    id: "slendro", name: "Gamelan Sléndro", type: "Scale",
    tradition: "Javanese", region: "Java, Indonesia",
    meaning: "One of gamelan's two tuning systems — five roughly equal steps that shimmer against Western tuning. No two gamelan sets are tuned identically; each ensemble has its own voice.",
    status: "learn-first",
    context: "A gamelan is a communal body, not a sample pack. The instruments are often named, honored with offerings, and never stepped over; musicians serve the ensemble rather than solo. Sléndro's five tones only make sense inside that shared practice of interlocking parts. If you borrow the shimmer, credit the culture of togetherness it comes from.",
    source: "H. Spiller, Focus: Gamelan Music of Indonesia (2008)",
    tags: ["shimmering", "communal", "calm", "ritual"], flex: 0.2,
    sound: { kind: "scale", root: 261.6, cents: [0, 240, 480, 720, 960, 1200] }
  },
  {
    id: "yidaki", name: "Yidaki (Didgeridoo)", type: "Instrument",
    tradition: "Yolŋu", region: "Arnhem Land, Australia",
    meaning: "A drone instrument of the Yolŋu people, central to ceremony and connected to specific clans, songlines and country.",
    status: "restricted",
    context: "In Yolŋu law the yidaki is bound to ceremony and to custodians with the right to play it; in several communities protocols also restrict who may play. Yolŋu leaders have asked that it not be treated as a generic 'outback' sound effect. Out of respect, this studio keeps the yidaki view-only — no preview, no sampling. Listen to Yolŋu players instead: that is the sound in its rightful hands.",
    source: "Yothu Yindi Foundation / Garma cultural statements; K. Neuenfeldt (ed.), The Didjeridu (1997)",
    tags: [], flex: 0, sound: null
  },
  {
    id: "sundance", name: "Sun Dance Song", type: "Song",
    tradition: "Lakota", region: "Great Plains, North America",
    meaning: "Ceremonial songs belonging to the Sun Dance, one of the most sacred Lakota ceremonies.",
    status: "restricted",
    context: "Sun Dance songs exist only inside ceremony — they are prayer, not repertoire. The US government banned the ceremony itself until 1978, which makes casual reuse land on an open wound. Lakota spiritual leaders' 1993 'Declaration of War Against Exploiters of Lakota Spirituality' asks outsiders plainly: do not take these. This studio honors that — the element is shown so you learn why it can't be used, not so you can use it.",
    source: "Declaration of War Against Exploiters of Lakota Spirituality (1993)",
    tags: [], flex: 0, sound: null
  }
];

// Prompt keywords → element tags (the transparent, rule-based "AI").
const KEYWORD_TAGS = [
  [/celebrat|party|festival|wedding|birthday|carnival/i, "celebration"],
  [/happy|joy|upbeat|fun|cheer/i, "upbeat"],
  [/danc|groove|move|bounce/i, "dance"],
  [/calm|peace|chill|relax|meditat|study|sleep|gentle/i, "calm"],
  [/sad|longing|miss |nostalg|yearn|melanchol/i, "longing"],
  [/love|romantic|date|tender/i, "romantic"],
  [/night|evening|sunset|dusk/i, "evening"],
  [/story|narrat|history|epic tale/i, "storytelling"],
  [/energy|energetic|power|strong|epic|hype|intense/i, "energetic"],
  [/community|together|friends|gather/i, "communal"],
  [/smooth|soft|mellow/i, "smooth"],
  [/fire|fiery|passion/i, "fiery"],
];

// Prompts that frame cultures as flavors get a clarifying question, not a guess.
const STEREOTYPE_PATTERNS = [
  { re: /\b(exotic|oriental|tribal|primitive|savage|voodoo|gypsy|mystical east)\b/i,
    reply: "I'd rather not guess from that word — terms like “exotic” or “tribal” frame someone's everyday music as strange, and they don't tell me what you actually want to hear. What's the feeling or occasion? Calm, festive, longing, a celebration, an evening piece?" },
  { re: /\b(african|asian|indian|arab\w*|native|chinese|japanese|latin|eastern)\s+(vibes?|sounds?|feel|chants?|drums?|beats?|music)\b/i,
    reply: "A whole continent or people isn't one sound — “African drums” alone spans hundreds of distinct traditions, and picking one at random would flatten them. Tell me the mood or event, and I'll suggest specific traditions from the library with their names and sources attached." },
];
