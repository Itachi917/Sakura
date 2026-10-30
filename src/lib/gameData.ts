// ============================================================
// SAKURA DEFAULT CONTENT & SEED DATA
// Fully bilingual (English & Arabic) curated anime, Japanese culture,
// and Spacetoon nostalgia trivia.
// ============================================================

export interface QuizQuestionData {
  id: string
  question_text: string
  question_text_ar: string
  question_type: 'multiple_choice' | 'image_question' | 'text_clue'
  media_url?: string
  media_metadata?: {
    reveal_style?: 'silhouette' | 'blur' | 'crop' | 'normal'
    audio_preview_url?: string
  }
  options: {
    id: string
    text: string
    text_ar: string
    is_correct: boolean
  }[]
  explanation?: string
  explanation_ar?: string
  time_limit_seconds: number
  points: number
}

export interface FeudQuestionData {
  id: string
  question: string
  question_ar: string
  answers: {
    answer_text: string
    answer_text_ar: string
    points: number
    sort_order: number
  }[]
}

export interface DrawingWordData {
  id?: string
  word: string
  word_ar: string
  category: string
  category_ar: string
  difficulty: 'easy' | 'medium' | 'hard'
  aliases?: string[]
}

export interface AudioGuessQuestionData {
  id: string
  title: string
  title_ar: string
  audio_url: string
  answer: string
  answer_ar: string
  aliases: string[]
  anime_origin: string
  anime_origin_ar: string
  hint: string
  hint_ar: string
  image_url?: string
  total_time_seconds: number
  base_points: number
  options?: {
    id: string
    text: string
    text_ar: string
    is_correct: boolean
  }[]
}

export interface AudioPreset {
  name: string
  name_ar: string
  audio_url: string
  answer: string
  answer_ar: string
  anime_origin: string
  anime_origin_ar: string
  aliases: string[]
  hint: string
  hint_ar: string
  image_url: string
  options: { text: string; text_ar: string; is_correct: boolean }[]
}

export interface SilhouetteQuestionData {
  id: string
  character_name: string
  character_name_ar: string
  anime_origin: string
  anime_origin_ar: string
  image_url: string
  aliases: string[]
  hint: string
  hint_ar: string
  total_time_seconds: number
  base_points: number
  options?: { id: string; text: string; text_ar: string; is_correct: boolean }[]
}

export interface EmojiRiddleData {
  id: string
  emojis: string
  answer: string
  answer_ar: string
  anime_origin: string
  anime_origin_ar: string
  aliases: string[]
  hint: string
  hint_ar: string
  total_time_seconds: number
  base_points: number
  options?: { id: string; text: string; text_ar: string; is_correct: boolean }[]
}

export interface GarticPhoneTurn {
  participantId: string
  nickname: string
  type: 'prompt' | 'drawing' | 'description'
  content: string // Text prompt or description, or canvas dataUrl
  timestamp?: string
}

export interface GarticPhoneChain {
  id: string
  ownerId: string
  ownerNickname: string
  turns: GarticPhoneTurn[]
}

export interface GarticPhonePromptPreset {
  id: string
  prompt: string
  prompt_ar: string
  category: string
}

// ------------------------------------------------------------
// 1. "WHO'S THAT CHARACTER?"
// ------------------------------------------------------------
export const WHOS_THAT_CHARACTER_QUESTIONS: QuizQuestionData[] = [
  {
    id: 'wtc-1',
    question_text: "Who's that character? Known for orange jumpsuit, spiky blonde hair, and infinite willpower!",
    question_text_ar: "من هذه الشخصية؟ يرتدي بزة برتقالية، شعر أشقر شائك، وعزيمة لا تلين!",
    question_type: 'image_question',
    media_url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop',
    media_metadata: { reveal_style: 'silhouette' },
    options: [
      { id: 'wtc-1-a', text: 'Naruto Uzumaki', text_ar: 'ناروتو أوزوماكي', is_correct: true },
      { id: 'wtc-1-b', text: 'Goku', text_ar: 'غوكو', is_correct: false },
      { id: 'wtc-1-c', text: 'Edward Elric', text_ar: 'إدوارد إلريك', is_correct: false },
      { id: 'wtc-1-d', text: 'Boruto Uzumaki', text_ar: 'بوروتو أوزوماكي', is_correct: false },
    ],
    explanation: 'Naruto Uzumaki of Konohagakure, the Seventh Hokage and hero of the Hidden Leaf!',
    explanation_ar: 'ناروتو أوزوماكي من قرية كونوها، الهوكاجي السابع وبطل عالم النينجا!',
    time_limit_seconds: 20,
    points: 1000,
  },
  {
    id: 'wtc-2',
    question_text: "Who's that character? Always wears a straw hat, loves meat, and aims to be King of the Pirates!",
    question_text_ar: "من هذه الشخصية؟ يرتدي قبعة قش، يعشق اللحم، ويطمح ليصبح ملك القراصنة!",
    question_type: 'image_question',
    media_url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop',
    media_metadata: { reveal_style: 'silhouette' },
    options: [
      { id: 'wtc-2-a', text: 'Roronoa Zoro', text_ar: 'رورونوا زورو', is_correct: false },
      { id: 'wtc-2-b', text: 'Monkey D. Luffy', text_ar: 'مونكي دي لوفي', is_correct: true },
      { id: 'wtc-2-c', text: 'Portgas D. Ace', text_ar: 'بورتغاس دي إيس', is_correct: false },
      { id: 'wtc-2-d', text: 'Shanks', text_ar: 'شانكس', is_correct: false },
    ],
    explanation: 'Captain of the Straw Hat Pirates, Monkey D. Luffy, wielder of the Hito Hito no Mi: Model Nika!',
    explanation_ar: 'قائد قراصنة قبعة القش، مونكي دي لوفي، صاحب فاكهة الإله الشمسي نيكا!',
    time_limit_seconds: 20,
    points: 1000,
  },
  {
    id: 'wtc-3',
    question_text: "Who's that genius high school detective trapped in an elementary boy's body by a secret poison?",
    question_text_ar: "من هذا المحقق العبقري الذي تقلص جسده ليصبح طفلاً في الابتدائية بسبب عقار سري؟",
    question_type: 'image_question',
    media_url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop',
    media_metadata: { reveal_style: 'silhouette' },
    options: [
      { id: 'wtc-3-a', text: 'Heiji Hattori', text_ar: 'هيجي هاتوري', is_correct: false },
      { id: 'wtc-3-b', text: 'Kaito Kuroba', text_ar: 'كايتو كيد', is_correct: false },
      { id: 'wtc-3-c', text: 'Shinichi Kudo (Conan)', text_ar: 'سينشي كودو (كونان إيدوجاوا)', is_correct: true },
      { id: 'wtc-3-d', text: 'Kogoro Mouri', text_ar: 'توغو موري', is_correct: false },
    ],
    explanation: 'Shinichi Kudo took the alias Conan Edogawa to conceal his identity while solving crimes with Professor Agasa!',
    explanation_ar: 'سينشي كودو انتحل شخصية كونان إيدوجاوا بمساعدة الدكتور أغاسا لحماية من حوله!',
    time_limit_seconds: 20,
    points: 1000,
  },
  {
    id: 'wtc-4',
    question_text: "Who's that humanity's strongest soldier with an obsession for cleanliness and lightning-fast dual blades?",
    question_text_ar: "من هذا الجندي الأقوى للبشرية المهووس بالنظافة وصاحب ضربات الشفرات الخاطفة؟",
    question_type: 'image_question',
    media_url: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop',
    media_metadata: { reveal_style: 'silhouette' },
    options: [
      { id: 'wtc-4-a', text: 'Levi Ackerman', text_ar: 'ليفاي أكرمان', is_correct: true },
      { id: 'wtc-4-b', text: 'Erwin Smith', text_ar: 'إروين سميث', is_correct: false },
      { id: 'wtc-4-c', text: 'Eren Jaeger', text_ar: 'إيرين ييغر', is_correct: false },
      { id: 'wtc-4-d', text: 'Mikasa Ackerman', text_ar: 'ميكاسا أكرمان', is_correct: false },
    ],
    explanation: 'Captain Levi Ackerman of the Scout Regiment Special Operations Squad!',
    explanation_ar: 'القائد ليفاي أكرمان، قائد فرقة العمليات الخاصة في فيلق الاستكشاف!',
    time_limit_seconds: 20,
    points: 1000,
  },
  {
    id: 'wtc-5',
    question_text: "Who's that giant, gentle grey forest spirit who holds an umbrella at the bus stop in the rain?",
    question_text_ar: "من هذا الكائن الضخم الودود حارس الغابة الذي يقف بمظلته عند محطة الحافلات تحت المطر؟",
    question_type: 'image_question',
    media_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop',
    media_metadata: { reveal_style: 'silhouette' },
    options: [
      { id: 'wtc-5-a', text: 'No-Face', text_ar: 'بلا وجه (كاوناشي)', is_correct: false },
      { id: 'wtc-5-b', text: 'Totoro', text_ar: 'توتورو', is_correct: true },
      { id: 'wtc-5-c', text: 'Jiji', text_ar: 'جيجي', is_correct: false },
      { id: 'wtc-5-d', text: 'Snorlax', text_ar: 'سنورلاكس', is_correct: false },
    ],
    explanation: 'My Neighbor Totoro, created by Hayao Miyazaki and Studio Ghibli!',
    explanation_ar: 'جاري توتورو، الأيقونة الخالدة لاستوديو غيبلي والمخرج هاياو ميازاكي!',
    time_limit_seconds: 20,
    points: 1000,
  },
]

// ------------------------------------------------------------
// 2. "SPACETOON NOSTALGIA"
// ------------------------------------------------------------
export const SPACETOON_NOSTALGIA_QUESTIONS: QuizQuestionData[] = [
  {
    id: 'st-1',
    question_text: "In the legendary Spacetoon Arabic dub of Digimon Adventure, complete the iconic theme song opening: 'في فخٍ غريب وقعنا.. في عالم الأرقام ____'?",
    question_text_ar: "في شارة أبطال الديجيتال الأسطورية على سبيستون، أكمل الكلمات: 'في فخٍ غريبٍ وقعنا.. في عالم الأرقام ____'؟",
    question_type: 'multiple_choice',
    options: [
      { id: 'st-1-a', text: 'تهنا (We were lost)', text_ar: 'ضِعْنَا', is_correct: true },
      { id: 'st-1-b', text: 'طرنا (We flew)', text_ar: 'طِرْنَا', is_correct: false },
      { id: 'st-1-c', text: 'مشينا (We walked)', text_ar: 'مَشَيْنَا', is_correct: false },
      { id: 'st-1-d', text: 'عدنا (We returned)', text_ar: 'عُدْنَا', is_correct: false },
    ],
    explanation: "'في فخ غريب وقعنا، في عالم الأرقام ضعنا.. حارس أبطال كبار، يسبح في الفضاء كالأوتار' — lyrics by Tarek Al-Arabi Tourgane!",
    explanation_ar: "'في فخ غريب وقعنا، في عالم الأرقام ضعنا.. حارس أبطال كبار' — من إبداع طارق العربي طرقان ورشا رزق!",
    time_limit_seconds: 25,
    points: 1000,
  },
  {
    id: 'st-2',
    question_text: "What was the name of Thunder Jet's (Hazim Al-Ra'ad) legendary invincible battleship in the Arabic dub?",
    question_text_ar: "ما هو اسم سفينة الفضاء الأسطورية الحربية الخاصة بـ 'هزيم الرعد' في الدبلجة العربية؟",
    question_type: 'multiple_choice',
    options: [
      { id: 'st-2-a', text: 'The Thunderbolt (الصاعقة)', text_ar: 'الصاعقة', is_correct: true },
      { id: 'st-2-b', text: 'The Golden Eagle (النسر الذهبي)', text_ar: 'النسر الذهبي', is_correct: false },
      { id: 'st-2-c', text: 'The Storm (العاصفة)', text_ar: 'العاصفة', is_correct: false },
      { id: 'st-2-d', text: 'The Dragon (التنين الفضائي)', text_ar: 'التنين الفضائي', is_correct: false },
    ],
    explanation: "Battleship 'Al-Sa'eqah' (الصاعقة) commanded by Hazim Al-Ra'ad to unite the galaxy!",
    explanation_ar: "السفينة الفضائية الحربية 'الصاعقة' التي قادها هزيم الرعد لتوحيد المجرة!",
    time_limit_seconds: 25,
    points: 1000,
  },
  {
    id: 'st-3',
    question_text: "Who voiced Conan Edogawa's unforgettable character in the Arabic dub by Venus Center (مركز الزهرة)?",
    question_text_ar: "من الفنانة السورية القديرة صاحبة الصوت الأيقوني للمحقق 'كونان إيدوجاوا' في مركز الزهرة؟",
    question_type: 'multiple_choice',
    options: [
      { id: 'st-3-a', text: 'Amal Saad El Din', text_ar: 'آمال سعد الدين', is_correct: true },
      { id: 'st-3-b', text: 'Rasha Rizk', text_ar: 'رشا رزق', is_correct: false },
      { id: 'st-3-c', text: 'Fatima Saad', text_ar: 'فاطمة سعد', is_correct: false },
      { id: 'st-3-d', text: 'Anan Al Khayyat', text_ar: 'عنان الخياط', is_correct: false },
    ],
    explanation: 'The wonderful Amal Saad El Din gave Conan his sharp, iconic voice for hundreds of episodes!',
    explanation_ar: 'الفنانة القديرة آمال سعد الدين هي التي أبدعت بصوت كونان على مدى عقود!',
    time_limit_seconds: 25,
    points: 1000,
  },
  {
    id: 'st-4',
    question_text: "In Remi (دروب ريمي), what is the memorable first line of the heartfelt opening song?",
    question_text_ar: "في أنمي 'دروب ريمي'، ما هو مطلع أغنية الشارة المؤثرة بصوت رشا رزق؟",
    question_type: 'multiple_choice',
    options: [
      { id: 'st-4-a', text: 'أمي كم أهواها.. أشتاق لمرآها', text_ar: 'أمي كم أهواها.. أشتاق لمرآها', is_correct: false },
      { id: 'st-4-b', text: 'أنتِ الأمان.. أنتِ الحنان', text_ar: 'أنتِ الأمان.. أنتِ الحنان', is_correct: true },
      { id: 'st-4-c', text: 'مهما طال الزمان.. سأبقى إنسان', text_ar: 'مهما طال الزمان.. سأبقى إنسان', is_correct: false },
      { id: 'st-4-d', text: 'دروبي حزينة.. وشمسي دفينة', text_ar: 'دروبي حزينة.. وشمسي دفينة', is_correct: false },
    ],
    explanation: "'أنتِ الأمان، أنتِ الحنان، من تحت قدميك لنا الجنان' — one of the most emotional anime openings ever produced!",
    explanation_ar: "'أنتِ الأمان، أنتِ الحنان، من تحت قدميكِ لنا الجنان' — أغنية الشارة الأسطورية الخالدة لدروب ريمي!",
    time_limit_seconds: 25,
    points: 1000,
  },
  {
    id: 'st-5',
    question_text: "What was Captain Majed's (Tsubasa) signature ultimate shot called in Arabic?",
    question_text_ar: "ما اسم الركلة الخارقة الشهيرة التي يتميز بها الكابتن ماجد في الدبلجة العربية؟",
    question_type: 'multiple_choice',
    options: [
      { id: 'st-5-a', text: 'Tiger Shot (ضربة النمر)', text_ar: 'ضربة النمر (بسام)', is_correct: false },
      { id: 'st-5-b', text: 'Falcon Drive Shot (ضربة الصقر)', text_ar: 'ضربة الصقر (Drive Shoot)', is_correct: true },
      { id: 'st-5-c', text: 'Tornado Shot (ضربة الإعصار)', text_ar: 'ضربة الإعصار', is_correct: false },
      { id: 'st-5-d', text: 'Lightning Shot (ضربة البرق)', text_ar: 'ضربة البرق', is_correct: false },
    ],
    explanation: "Captain Majed perfected 'Darbat Al-Saqr' (The Falcon Drive Shot) while Bassam (Hyuga) perfected 'Darbat Al-Nimr'!",
    explanation_ar: "الكابتن ماجد تميز بـ 'ضربة الصقر'، بينما كان بسام صاحب 'ضربة النمر' الشهيرة!",
    time_limit_seconds: 25,
    points: 1000,
  },
]

// ------------------------------------------------------------
// 3. "ANIME EXPERT EXAM"
// ------------------------------------------------------------
export const ANIME_EXPERT_EXAM_QUESTIONS: QuizQuestionData[] = [
  {
    id: 'ae-1',
    question_text: "Which Studio Ghibli film won the Academy Award for Best Animated Feature at the 75th Academy Awards in 2003?",
    question_text_ar: "أي من أفلام استوديو غيبلي فاز بجائزة الأوسكار لأفضل فيلم رسوم متحركة عام 2003؟",
    question_type: 'multiple_choice',
    options: [
      { id: 'ae-1-a', text: 'Princess Mononoke', text_ar: 'الأميرة مونونوكي', is_correct: false },
      { id: 'ae-1-b', text: 'Spirited Away (Sen to Chihiro)', text_ar: 'المخطوفة (Spirited Away)', is_correct: true },
      { id: 'ae-1-c', text: "Howl's Moving Castle", text_ar: 'قلعة هاول المتحركة', is_correct: false },
      { id: 'ae-1-d', text: 'My Neighbor Totoro', text_ar: 'جاري توتورو', is_correct: false },
    ],
    explanation: 'Spirited Away remains the only hand-drawn, non-English language animated film to win the Oscar!',
    explanation_ar: 'فيلم Spirited Away كان وما زال الفيلم الوحيد باللغة اليابانية والمرسوم يدوياً الذي فاز بالأوسكار!',
    time_limit_seconds: 30,
    points: 1200,
  },
  {
    id: 'ae-2',
    question_text: "In Fullmetal Alchemist: Brotherhood, what is the ironclad law of Equivalent Exchange in Alchemy?",
    question_text_ar: "في أنمي الخيميائي الفولاذي (Fullmetal Alchemist)، ما هو قانون التبادل المتكافئ الأساسي؟",
    question_type: 'multiple_choice',
    options: [
      { id: 'ae-2-a', text: 'To obtain something, something of equal value must be lost', text_ar: 'للحصول على شيء، يجب تقديم شيء مساوٍ له في القيمة', is_correct: true },
      { id: 'ae-2-b', text: 'Gold can only be traded for Philosopher Stone', text_ar: 'الذهب لا يُستبدل إلا بحجر الفلاسفة', is_correct: false },
      { id: 'ae-2-c', text: 'Energy cannot be created or destroyed', text_ar: 'الطاقة لا تفنى ولا تستحدث', is_correct: false },
      { id: 'ae-2-d', text: 'Blood sacrifice is mandatory for transmutation', text_ar: 'التضحية بالدم شرط لأي تحويل كيميائي', is_correct: false },
    ],
    explanation: "'Humankind cannot gain anything without first giving something in return. To obtain, something of equal value must be lost.'",
    explanation_ar: "'لا يمكن للبشر الحصول على أي شيء دون تقديم مقابل.. للحصول على شيء لا بد من التضحية بما يساويه قيمة.'",
    time_limit_seconds: 25,
    points: 1200,
  },
  {
    id: 'ae-3',
    question_text: "What is the true identity and surname of 'L' in Death Note?",
    question_text_ar: "ما هو الاسم الحقيقي واللقب الكامل للمحقق 'L' في أنمي ديث نوت (Death Note)؟",
    question_type: 'multiple_choice',
    options: [
      { id: 'ae-3-a', text: 'L Lawliet', text_ar: 'إل لولايت (L Lawliet)', is_correct: true },
      { id: 'ae-3-b', text: 'L Ryuzaki', text_ar: 'إل ريوزاكي', is_correct: false },
      { id: 'ae-3-c', text: 'L Yagami', text_ar: 'إل ياغامي', is_correct: false },
      { id: 'ae-3-d', text: 'L Lind Taylor', text_ar: 'ليند إل تايلور', is_correct: false },
    ],
    explanation: "Revealed in the 13th volume How to Read, L's true full name is L Lawliet!",
    explanation_ar: "الاسم الحقيقي لـ L كما كشفه الكاتب تسوجومي أوبا هو 'L Lawliet'!",
    time_limit_seconds: 25,
    points: 1200,
  },
  {
    id: 'ae-4',
    question_text: "In Attack on Titan, which Titan power possesses the unique ability to peer into the memories of future inheritors?",
    question_text_ar: "في هجوم العمالقة (Attack on Titan)، أي عملاق يمتلك القدرة الفريدة على استشراف ذكريات ورثته المستقبليين؟",
    question_type: 'multiple_choice',
    options: [
      { id: 'ae-4-a', text: 'The Founding Titan', text_ar: 'العملاق المؤسس', is_correct: false },
      { id: 'ae-4-b', text: 'The Attack Titan (Shingeki no Kyojin)', text_ar: 'العملاق المهاجم (Shingeki no Kyojin)', is_correct: true },
      { id: 'ae-4-c', text: 'The War Hammer Titan', text_ar: 'عملاق مطرقة الحرب', is_correct: false },
      { id: 'ae-4-d', text: 'The Beast Titan', text_ar: 'العملاق الوحش', is_correct: false },
    ],
    explanation: 'The Attack Titan has always pushed forward for freedom by receiving memories from future inheritors!',
    explanation_ar: 'العملاق المهاجم يمضي دائماً للأمام ساعياً نحو الحرية عبر استلام ذكريات وراثه في المستقبل!',
    time_limit_seconds: 30,
    points: 1200,
  },
]

// ------------------------------------------------------------
// 4. "SAKURA FEUD" (Anime Family Feud)
// ------------------------------------------------------------
export const SAKURA_FEUD_ROUNDS: FeudQuestionData[] = [
  {
    id: 'feud-1',
    question: "We surveyed 100 anime fans: What is the most iconic Shonen anime of all time?",
    question_ar: "سألنا 100 من عشاق الأنمي: ما هو أفضل وأشهر أنمي شونين في كل العصور؟",
    answers: [
      { answer_text: 'One Piece', answer_text_ar: 'ون بيس (One Piece)', points: 38, sort_order: 1 },
      { answer_text: 'Naruto', answer_text_ar: 'ناروتو (Naruto)', points: 26, sort_order: 2 },
      { answer_text: 'Dragon Ball Z', answer_text_ar: 'دراغون بول (Dragon Ball)', points: 19, sort_order: 3 },
      { answer_text: 'Attack on Titan', answer_text_ar: 'هجوم العمالقة (Attack on Titan)', points: 11, sort_order: 4 },
      { answer_text: 'Bleach', answer_text_ar: 'بليتش (Bleach)', points: 6, sort_order: 5 },
    ],
  },
  {
    id: 'feud-2',
    question: "We surveyed 100 students: What Japanese food do you crave most when watching anime?",
    question_ar: "سألنا 100 طالب: ما هو الطعام الياباني الأكثر شهية الذي ترغب بأكله أثناء متابعة الأنمي؟",
    answers: [
      { answer_text: 'Ramen', answer_text_ar: 'رامن (Ramen)', points: 45, sort_order: 1 },
      { answer_text: 'Sushi / Sashimi', answer_text_ar: 'سوشي (Sushi)', points: 24, sort_order: 2 },
      { answer_text: 'Onigiri (Rice Ball)', answer_text_ar: 'أونيغيري - كرة الأرز (Onigiri)', points: 15, sort_order: 3 },
      { answer_text: 'Takoyaki', answer_text_ar: 'تاكوياكي (Takoyaki)', points: 9, sort_order: 4 },
      { answer_text: 'Dango / Mochi', answer_text_ar: 'دانغو أو موتشي (Dango)', points: 7, sort_order: 5 },
    ],
  },
  {
    id: 'feud-3',
    question: "We asked 100 Arab anime fans: Which Spacetoon anime opening hits you with the most nostalgia?",
    question_ar: "سألنا 100 من متابعي سبيستون: أي شارة بداية كرتون تشعرك بأكبر موجة نوستالجيا؟",
    answers: [
      { answer_text: 'Digimon (أبطال الديجيتال)', answer_text_ar: 'أبطال الديجيتال', points: 34, sort_order: 1 },
      { answer_text: 'Hunter x Hunter (القناص)', answer_text_ar: 'القناص (Hunter x Hunter)', points: 27, sort_order: 2 },
      { answer_text: 'Detective Conan (المحقق كونان)', answer_text_ar: 'المحقق كونان', points: 18, sort_order: 3 },
      { answer_text: "Romeo's Blue Skies (عهد الأصدقاء)", answer_text_ar: 'عهد الأصدقاء', points: 14, sort_order: 4 },
      { answer_text: 'Hazim Al-Raad (هزيم الرعد)', answer_text_ar: 'هزيم الرعد', points: 7, sort_order: 5 },
    ],
  },
]

// ------------------------------------------------------------
// 5. "DRAW IT, GUESS IT"
// ------------------------------------------------------------
export const DRAWING_WORDS: DrawingWordData[] = [
  {
    word: 'Kunai',
    word_ar: 'كوناي',
    category: 'Ninja Weapon',
    category_ar: 'سلاح نينجا',
    difficulty: 'easy',
    aliases: ['كوناي', 'سلاح نينجا', 'خنجر', 'خنجر نينجا', 'kunai', 'dagger'],
  },
  {
    word: 'Straw Hat',
    word_ar: 'قبعة القش',
    category: 'Clothing',
    category_ar: 'ملابس وأزياء',
    difficulty: 'easy',
    aliases: ['قبعة القش', 'قبعة لوفي', 'قبعة', 'straw hat', 'luffy hat'],
  },
  {
    word: 'Ramen Bowl',
    word_ar: 'وعاء رامن',
    category: 'Food',
    category_ar: 'طعام ياباني',
    difficulty: 'easy',
    aliases: ['رامن', 'وعاء رامن', 'نودلز', 'حساء رامن', 'ramen', 'ramen bowl', 'noodles'],
  },
  {
    word: 'Sharingan',
    word_ar: 'شارينغان',
    category: 'Anime Power',
    category_ar: 'قوة أنمي',
    difficulty: 'medium',
    aliases: ['شارينغان', 'شارينجان', 'عين الشارينغان', 'عين ساسكي', 'sharingan'],
  },
  {
    word: 'Death Note',
    word_ar: 'مذكرة الموت',
    category: 'Object',
    category_ar: 'أداة',
    difficulty: 'medium',
    aliases: ['مذكرة الموت', 'دفتر الموت', 'كتاب الموت', 'death note'],
  },
  {
    word: 'Katana Sword',
    word_ar: 'سيف كاتانا',
    category: 'Weapon',
    category_ar: 'سلاح ساموراي',
    difficulty: 'easy',
    aliases: ['سيف كاتانا', 'كاتانا', 'سيف ساموراي', 'سيف', 'katana', 'sword'],
  },
  {
    word: 'Dragon Ball',
    word_ar: 'كرة التنين',
    category: 'Artifact',
    category_ar: 'أداة سحرية',
    difficulty: 'medium',
    aliases: ['كرة التنين', 'دراغون بول', 'دراغونبول', 'كرات التنين', 'dragon ball', 'dragonball'],
  },
  {
    word: 'Sakura Petal',
    word_ar: 'بتلة ساكورا',
    category: 'Nature',
    category_ar: 'طبيعة وثقافة',
    difficulty: 'easy',
    aliases: ['بتلة ساكورا', 'ساكورا', 'زهرة الكرز', 'وردة', 'sakura', 'cherry blossom', 'petal'],
  },
  {
    word: 'Catbus',
    word_ar: 'حافلة القط',
    category: 'Ghibli Creature',
    category_ar: 'مخلوق غيبلي',
    difficulty: 'hard',
    aliases: ['حافلة القط', 'باص القط', 'توتورو باص', 'قط باص', 'catbus', 'cat bus'],
  },
  {
    word: 'Giant Titan',
    word_ar: 'عملاق ضخم',
    category: 'Creature',
    category_ar: 'مخلوق ضخم',
    difficulty: 'medium',
    aliases: ['عملاق', 'عملاق ضخم', 'تايتن', 'titan', 'giant titan'],
  },
  {
    word: 'Pikachu',
    word_ar: 'بيكاتشو',
    category: 'Creature',
    category_ar: 'بوكيمون',
    difficulty: 'easy',
    aliases: ['بيكاتشو', 'بوكيمون', 'pikachu'],
  },
  {
    word: 'Pokeball',
    word_ar: 'كرة بوكيمون',
    category: 'Artifact',
    category_ar: 'أداة بوكيمون',
    difficulty: 'easy',
    aliases: ['كرة بوكيمون', 'بوكيبول', 'بوكيبول كروية', 'pokeball', 'poke ball'],
  },
  {
    word: 'Ninja Headband',
    word_ar: 'عصابة رأس نينجا',
    category: 'Accessory',
    category_ar: 'إكسسوار نينجا',
    difficulty: 'medium',
    aliases: ['عصابة راس', 'عصابة رأس نينجا', 'حامية جبين', 'شعار كونوها', 'headband', 'ninja headband'],
  },
  {
    word: 'Shuriken',
    word_ar: 'شوريكين',
    category: 'Ninja Weapon',
    category_ar: 'سلاح نينجا',
    difficulty: 'easy',
    aliases: ['شوريكين', 'نجمة نينجا', 'نجمة', 'shuriken', 'ninja star'],
  },
  {
    word: 'Pirate Ship',
    word_ar: 'سفينة قراصنة',
    category: 'Vehicle',
    category_ar: 'مركبة وقوارب',
    difficulty: 'medium',
    aliases: ['سفينة قراصنة', 'سفينة', 'مركب قراصنة', 'ميري', 'قارب', 'pirate ship', 'ship', 'going merry', 'sunny'],
  },
  {
    word: 'Luffy',
    word_ar: 'لوفي',
    category: 'Character',
    category_ar: 'شخصيات أنمي',
    difficulty: 'easy',
    aliases: ['لوفي', 'مونكي دي لوفي', 'قبعة القش', 'luffy', 'monkey d luffy'],
  },
  {
    word: 'Zoro Swords',
    word_ar: 'سيوف زورو الثلاثة',
    category: 'Weapon',
    category_ar: 'أسلحة أنمي',
    difficulty: 'medium',
    aliases: ['سيوف زورو', 'سيف زورو', 'ثلاثة سيوف', 'زورو', 'zoro swords', 'zoro'],
  },
  {
    word: 'Conan Glasses',
    word_ar: 'نظارة كونان',
    category: 'Accessory',
    category_ar: 'أدوات كونان',
    difficulty: 'easy',
    aliases: ['نظارة كونان', 'نظارات كونان', 'نظارة', 'conan glasses', 'glasses'],
  },
  {
    word: 'Goku',
    word_ar: 'غوكو',
    category: 'Character',
    category_ar: 'شخصيات أنمي',
    difficulty: 'easy',
    aliases: ['غوكو', 'سون غوكو', 'سوبر سايان', 'goku', 'son goku'],
  },
  {
    word: 'Nine-Tailed Fox (Kurama)',
    word_ar: 'الكيوبي (ثعلب التسعة ذيول)',
    category: 'Creature',
    category_ar: 'وحوش وكرامات',
    difficulty: 'hard',
    aliases: ['كيوبي', 'كوراما', 'ثعلب الكيوبي', 'ثعلب الذيول التسعة', 'kurama', 'nine tails'],
  },
  {
    word: 'Onigiri Rice Ball',
    word_ar: 'أونيغيري (مثلث الأرز)',
    category: 'Food',
    category_ar: 'طعام ياباني',
    difficulty: 'easy',
    aliases: ['اونيغيري', 'أونيغيري', 'مثلث أرز', 'كرة ارز', 'onigiri', 'rice ball'],
  },
  {
    word: 'Hollow Mask',
    word_ar: 'قناع الهولو (إيتشيغو)',
    category: 'Accessory',
    category_ar: 'بليتش',
    difficulty: 'medium',
    aliases: ['قناع الهولو', 'قناع ايتشيغو', 'هولو', 'hollow mask', 'ichigo mask'],
  },
  {
    word: 'Mecha Robot',
    word_ar: 'روبوت ميكا فضائي',
    category: 'Robot',
    category_ar: 'آليون وعمالقة',
    difficulty: 'medium',
    aliases: ['روبوت', 'ميكا', 'رجل الي', 'غرندايزر', 'mecha', 'robot', 'gundam'],
  },
  {
    word: 'Pokeball Belt',
    word_ar: 'حزام كرات البوكيمون',
    category: 'Accessory',
    category_ar: 'بوكيمون',
    difficulty: 'medium',
    aliases: ['حزام بوكيمون', 'كرات بوكيمون', 'pokeball belt'],
  },
  {
    word: 'Spacetoon Logo',
    word_ar: 'شارة سبيستون (شباب المستقبل)',
    category: 'Nostalgia',
    category_ar: 'سبيستون',
    difficulty: 'medium',
    aliases: ['سبيستون', 'شعار سبيستون', 'كوكب سبيستون', 'spacetoon'],
  },
]

// ------------------------------------------------------------
// 5b. GARTIC PHONE ANIME PROMPTS PRESETS (عبارات هاتف جارتك المضحكة 📞)
// ------------------------------------------------------------
export const GARTIC_PHONE_PROMPTS: GarticPhonePromptPreset[] = [
  {
    id: 'gpp-1',
    prompt: 'Luffy stealing meat from Goku while flying on Nimbus',
    prompt_ar: 'لوفي يسرق قطعة لحم من غوكو وهو يطير على غيمة نيمبوس',
    category: 'One Piece x Dragon Ball',
  },
  {
    id: 'gpp-2',
    prompt: 'Detective Conan investigating the mystery of missing ramen in Konoha',
    prompt_ar: 'المحقق كونان يحقق في لغز اختفاء رامن ناروتو في كونوها',
    category: 'Conan x Naruto',
  },
  {
    id: 'gpp-3',
    prompt: 'Zoro getting lost in Sohar University campus looking for his katana',
    prompt_ar: 'زورو يضيع في ممرات جامعة صحار وهو يبحث عن سيوفه الثلاثة',
    category: 'Zoro x Campus',
  },
  {
    id: 'gpp-4',
    prompt: 'Gojo Satoru wearing sunglasses backwards and tripping on a banana peel',
    prompt_ar: 'غوجو ساتورو يرتدي نظارته بالمقلوب ويتعثر بقشرة موزة أمام الطلاب',
    category: 'Jujutsu Kaisen',
  },
  {
    id: 'gpp-5',
    prompt: 'Pikachu angrily charging Levi Ackerman cleaning broom',
    prompt_ar: 'بيكاتشو غاضب يشحن مكنسة ليفاي بالكهرباء أثناء التنظيف',
    category: 'Pokemon x AoT',
  },
  {
    id: 'gpp-6',
    prompt: 'Sailor Moon fighting a giant Armored Titan using magic sparkles',
    prompt_ar: 'سيلور مون تقاتل العملاق المدرع بعصا سحرية وبريق نجوم ملون',
    category: 'Sailor Moon x AoT',
  },
  {
    id: 'gpp-7',
    prompt: 'Itachi using Mangekyo Sharingan to fry the perfect sunny side up egg',
    prompt_ar: 'إيتاشي أوتشيها يستخدم الشارينغان لطهي بيضة مقلية مثالية بدون حرقها',
    category: 'Naruto Cooking',
  },
  {
    id: 'gpp-8',
    prompt: 'Captain Tsubasa shooting a soccer ball so hard it breaks the Spacetoon logo',
    prompt_ar: 'كابتن ماجد يسدد ضربة صاعقة في الهواء ويهدم شارة قناة سبيستون',
    category: 'Spacetoon Sports',
  },
  {
    id: 'gpp-9',
    prompt: 'Totoro driving the Catbus through Muscat mountains under cherry blossoms',
    prompt_ar: 'توتورو يقود حافلة القط السريعة بين جبال مسقط تحت أزهار الساكورا',
    category: 'Ghibli Oman',
  },
  {
    id: 'gpp-10',
    prompt: 'Light Yagami writing a grocery shopping list in the Death Note',
    prompt_ar: 'لايت ياغامي يكتب قائمة مشتريات البقالة بالغلط في مذكرة الموت',
    category: 'Death Note',
  },
  {
    id: 'gpp-11',
    prompt: 'Tanjiro trying to teach Nezuko how to use an iPad at anime club',
    prompt_ar: 'تانجيرو يحاول تعليم نيزوكو كيف تفتح آيباد نادي ساكورا للأنمي',
    category: 'Demon Slayer',
  },
  {
    id: 'gpp-12',
    prompt: 'Grendizer serving hot Karak tea to the audience at university gathering',
    prompt_ar: 'غرندايزر يصب شاي كرك ساخن لجمهور نادي ساكورا في الصالة الرئيسية',
    category: 'Mecha x Club',
  },
]

// ------------------------------------------------------------
// 6. DEFAULT PASSPORT STAMPS
// ------------------------------------------------------------
export const DEFAULT_STAMPS = [
  {
    id: 'stamp-fresh-leaf',
    name: 'Fresh Leaf',
    name_ar: 'الورقة الغضة 🍃',
    description: 'Awarded to everyone who has an account logged in to Sakura.',
    description_ar: 'تُمنح لكل عضو أنشأ حساباً وسجّل دخوله في منصة ساكورا.',
    icon_name: 'leaf',
    rarity: 'common' as const,
    unlock_type: 'manual' as const,
  },
  {
    id: 'stamp-first-bloom',
    name: 'First Bloom',
    name_ar: 'أول تفتح 🌸',
    description: 'Attended your first Sakura Club physical event.',
    description_ar: 'حضرت أول فعالية حضورية لنادي ساكورا.',
    icon_name: 'cherry-blossom',
    rarity: 'common' as const,
    unlock_type: 'event_attendance' as const,
  },
  {
    id: 'stamp-spacetoon-veteran',
    name: 'Spacetoon Child',
    name_ar: 'جيل الطيبين 📺',
    description: 'Scored over 800 points in a Spacetoon Nostalgia session.',
    description_ar: 'حققت أكثر من 800 نقطة في جولة نوستالجيا سبيستون.',
    icon_name: 'tv',
    rarity: 'uncommon' as const,
    unlock_type: 'score_threshold' as const,
  },
  {
    id: 'stamp-anime-scholar',
    name: 'Anime Scholar',
    name_ar: 'عالم الأنمي 📜',
    description: 'Answered all Anime Expert Exam questions correctly.',
    description_ar: 'أجبت على جميع أسئلة اختبار خبير الأنمي بشكل صحيح.',
    icon_name: 'scroll',
    rarity: 'rare' as const,
    unlock_type: 'activity_win' as const,
  },
  {
    id: 'stamp-feud-champion',
    name: 'Feud Strategist',
    name_ar: 'قائد الفيود ⚔️',
    description: 'Led your team to victory in a Sakura Feud match.',
    description_ar: 'قدت فريقك للفوز في منافسة فيود ساكورا.',
    icon_name: 'swords',
    rarity: 'rare' as const,
    unlock_type: 'activity_win' as const,
  },
  {
    id: 'stamp-master-mangaka',
    name: 'Master Mangaka',
    name_ar: 'مانغاكا محترف 🎨',
    description: 'Drew a masterpiece that was guessed in under 10 seconds in Draw It, Guess It.',
    description_ar: 'رسمت رسماً خمنه الحضور في أقل من 10 ثوانٍ في ارسم واخمّن.',
    icon_name: 'brush',
    rarity: 'rare' as const,
    unlock_type: 'activity_win' as const,
  },
  {
    id: 'stamp-sakura-legend',
    name: 'Sakura Legend',
    name_ar: 'أسطورة الساكورا 👑',
    description: 'Awarded to supreme champions of club major tournament events.',
    description_ar: 'تُمنح لأبطال البطولات الكبرى والمناسبات الخاصة في النادي.',
    icon_name: 'crown',
    rarity: 'legendary' as const,
    unlock_type: 'manual' as const,
  },
]

// ------------------------------------------------------------
// 7. DEFAULT PASSPORT TITLES
// ------------------------------------------------------------
export const DEFAULT_TITLES = [
  {
    id: 'title-novice',
    name: 'Club Novice',
    name_ar: 'عضو جديد',
    unlock_condition_text: 'Join the club platform',
    unlock_condition_text_ar: 'الانضمام للمنصة',
  },
  {
    id: 'title-spacetoon-generation',
    name: 'Spacetoon Generation',
    name_ar: 'جيل سبيستون الذهبي',
    unlock_condition_text: 'Collect 2 stamps',
    unlock_condition_text_ar: 'جمع ختمين',
  },
  {
    id: 'title-hokage-scholar',
    name: 'Hokage Scholar',
    name_ar: 'باحث الهوكاجي',
    unlock_condition_text: 'Win an Anime Expert session',
    unlock_condition_text_ar: 'الفوز في جلسة خبير الأنمي',
  },
  {
    id: 'title-feud-emperor',
    name: 'Feud Emperor',
    name_ar: 'إمبراطور الفيود',
    unlock_condition_text: 'Achieve a clean sweep in Sakura Feud',
    unlock_condition_text_ar: 'الفوز باكتساح في فيود ساكورا',
  },
  {
    id: 'title-sakura-pillar',
    name: 'Pillar of the Club (Hashira)',
    name_ar: 'هاشيرا النادي 🌸',
    unlock_condition_text: 'Attend 5 physical events',
    unlock_condition_text_ar: 'حضور 5 فعاليات حضورية',
  },
]

// ------------------------------------------------------------
// 6. "ZOOM & GUESS" (خمن بالزووم — عدسة ساكورا)
// Image starts heavily cropped / zoomed in, zooming out every 10 seconds.
// ------------------------------------------------------------
export interface ZoomGuessQuestionData {
  id: string
  image_url: string
  character_name: string
  character_name_ar: string
  aliases: string[]
  anime_origin: string
  anime_origin_ar: string
  hint: string
  hint_ar: string
  focus_point?: string // CSS transform-origin: e.g. '50% 25%'
  total_time_seconds: number // default 40s (10s intervals)
  base_points: number // default 1000
}

export const ZOOM_GUESS_QUESTIONS: ZoomGuessQuestionData[] = [
  {
    id: 'zg-1',
    image_url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1000&auto=format&fit=crop',
    character_name: 'Naruto Uzumaki',
    character_name_ar: 'ناروتو أوزوماكي',
    aliases: ['ناروتو', 'اوزوماكي', 'Naruto', 'Uzumaki', 'Hokage', 'الهوكاجي'],
    anime_origin: 'Naruto Shippuden',
    anime_origin_ar: 'ناروتو شيبودن',
    hint: 'Wears an iconic orange jumpsuit and carries the Nine-Tails!',
    hint_ar: 'نينجا من قرية كونوها صاحب عزيمة لا تلين ورمز الثعلب ذو الذيول التسعة!',
    focus_point: '50% 25%',
    total_time_seconds: 40,
    base_points: 1000,
  },
  {
    id: 'zg-2',
    image_url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=1000&auto=format&fit=crop',
    character_name: 'Monkey D. Luffy',
    character_name_ar: 'مونكي دي لوفي',
    aliases: ['لوفي', 'Luffy', 'Straw Hat', 'قبعة القش', 'مونكي'],
    anime_origin: 'One Piece',
    anime_origin_ar: 'ون بيس',
    hint: 'Aims to find the greatest treasure and become King of the Pirates!',
    hint_ar: 'قبطان قراصنة قبعة القش وصاحب جسد المطاط الذي يطمح لملك القراصنة!',
    focus_point: '48% 28%',
    total_time_seconds: 40,
    base_points: 1000,
  },
  {
    id: 'zg-3',
    image_url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1000&auto=format&fit=crop',
    character_name: 'Conan Edogawa',
    character_name_ar: 'كونان إيدوجاوا',
    aliases: ['كونان', 'سينشي', 'سينشي كودو', 'Conan', 'Shinichi', 'Detective Conan', 'المحقق كونان'],
    anime_origin: 'Detective Conan',
    anime_origin_ar: 'المحقق كونان',
    hint: 'Genius detective shrunk into an elementary school child!',
    hint_ar: 'المحقق الذكي الذي تقلص جسده بسبب عقار المنظمة السوداء!',
    focus_point: '52% 42%',
    total_time_seconds: 40,
    base_points: 1000,
  },
  {
    id: 'zg-4',
    image_url: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=1000&auto=format&fit=crop',
    character_name: 'Levi Ackerman',
    character_name_ar: 'ليفاي أكرمان',
    aliases: ['ليفاي', 'اكرمان', 'Levi', 'Ackerman', 'Captain Levi', 'القائد ليفاي'],
    anime_origin: 'Attack on Titan',
    anime_origin_ar: 'هجوم العمالقة',
    hint: 'Humanity’s strongest soldier with dual blades and cravat!',
    hint_ar: 'الجندي الأقوى في البشرية وقائد العمليات الخاصة في فيلق الاستكشاف!',
    focus_point: '50% 32%',
    total_time_seconds: 40,
    base_points: 1000,
  },
  {
    id: 'zg-5',
    image_url: 'https://images.unsplash.com/photo-1569003339405-ea396a5a8a90?w=1000&auto=format&fit=crop',
    character_name: 'Goku',
    character_name_ar: 'غوكو',
    aliases: ['سون غوكو', 'غوكو', 'Goku', 'Son Goku', 'Kakarot', 'كاكاروت'],
    anime_origin: 'Dragon Ball Z',
    anime_origin_ar: 'دراغون بول',
    hint: 'Saiyan warrior raised on Earth who protects the universe with Kamehameha!',
    hint_ar: 'محارب السايان الأسطوري صاحب الشعر الذهبي وضربة الكامي هامي ها!',
    focus_point: '50% 20%',
    total_time_seconds: 40,
    base_points: 1000,
  },
  {
    id: 'zg-6',
    image_url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=1000&auto=format&fit=crop',
    character_name: 'Tanjiro Kamado',
    character_name_ar: 'تانجيرو كامادو',
    aliases: ['تانجيرو', 'Tanjiro', 'Kamado', 'كامادو', 'قاتل الشياطين'],
    anime_origin: 'Demon Slayer (Kimetsu no Yaiba)',
    anime_origin_ar: 'قاتل الشياطين',
    hint: 'Wears hanafuda earrings and checkered haori, wielding water & sun breathing!',
    hint_ar: 'صاحب قرطي الهانافودا والسترة المربعة الذي يسعى لإعادة أخته إنسية!',
    focus_point: '52% 35%',
    total_time_seconds: 40,
    base_points: 1000,
  },
  {
    id: 'zg-7',
    image_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&auto=format&fit=crop',
    character_name: 'Satoru Gojo',
    character_name_ar: 'ساتورو غوجو',
    aliases: ['غوجو', 'ساتورو', 'Gojo', 'Satoru', 'Gojo Satoru'],
    anime_origin: 'Jujutsu Kaisen',
    anime_origin_ar: 'جوجوتسو كايسن',
    hint: 'The strongest modern jujutsu sorcerer with infinite void and blindfold!',
    hint_ar: 'أقوى مستعمل لعنات حديث، صاحب العيون الستة وتقنية اللانهاية!',
    focus_point: '50% 28%',
    total_time_seconds: 40,
    base_points: 1000,
  },
  {
    id: 'zg-8',
    image_url: 'https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?w=1000&auto=format&fit=crop',
    character_name: 'Pikachu',
    character_name_ar: 'بيكاتشو',
    aliases: ['بيكاتشو', 'Pikachu', 'بوكيمون', 'Pokemon'],
    anime_origin: 'Pokemon',
    anime_origin_ar: 'بوكيمون',
    hint: 'Electric-type mouse with red cheeks and lightning bolt tail!',
    hint_ar: 'البوكيمون الكهربائي الأصفر المحبوب، رفيق آش كيتشوم الأبدي!',
    focus_point: '50% 40%',
    total_time_seconds: 40,
    base_points: 1000,
  },
]

// ------------------------------------------------------------
// 8. "AUDIO GUESS (خمّن الأوست / شارة الأنمي)"
// ------------------------------------------------------------
export const AUDIO_GUESS_QUESTIONS: AudioGuessQuestionData[] = [
  {
    id: 'ag-1',
    title: 'Guess the iconic anime from this detective theme song!',
    title_ar: 'خمّن الأنمي الشهير من لحن الشارة الأيقونية والتحقيق!',
    audio_url: 'https://upload.wikimedia.org/wikipedia/commons/4/4b/Japanese_classical_music_flute.ogg',
    answer: 'Detective Conan',
    answer_ar: 'المحقق كونان',
    aliases: ['المحقق كونان', 'كونان', 'Detective Conan', 'Conan', 'Meitantei Conan'],
    anime_origin: 'Detective Conan (Case Closed)',
    anime_origin_ar: 'المحقق كونان (سبيستون)',
    hint: 'A brilliant teenage detective turned into a child by a mysterious syndicate.',
    hint_ar: 'سينشي كودو الذي تقلص جسده ليصبح طفلاً ذكياً يحل أصعب الجرائم!',
    image_url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop',
    total_time_seconds: 30,
    base_points: 1000,
    options: [
      { id: 'ag-1-a', text: 'Detective Conan', text_ar: 'المحقق كونان', is_correct: true },
      { id: 'ag-1-b', text: 'Death Note', text_ar: 'مذكرة الموت', is_correct: false },
      { id: 'ag-1-c', text: 'Kindaichi Case Files', text_ar: 'ملفات كيندايتشي', is_correct: false },
      { id: 'ag-1-d', text: 'Lupin III', text_ar: 'لوبين الثالث', is_correct: false },
    ],
  },
  {
    id: 'ag-2',
    title: 'Which anime does this legendary choral battle theme belong to?',
    title_ar: 'من أي أنمي هذه الملحمة الموسيقية والقتال العظيم ضد العمالقة؟',
    audio_url: 'https://upload.wikimedia.org/wikipedia/commons/4/4b/Japanese_classical_music_flute.ogg',
    answer: 'Attack on Titan',
    answer_ar: 'هجوم العمالقة',
    aliases: ['هجوم العمالقة', 'اتاتك اون تايتن', 'Attack on Titan', 'Shingeki no Kyojin', 'AOT'],
    anime_origin: 'Attack on Titan (Shingeki no Kyojin)',
    anime_origin_ar: 'هجوم العمالقة (شينغيكي نو كيوجين)',
    hint: 'Humanity lives behind giant walls defending against man-eating giants.',
    hint_ar: 'إيرين ييغر وفيلق الاستكشاف وشعار أجنحة الحرية خلف الأسوار الثلاثة!',
    image_url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop',
    total_time_seconds: 30,
    base_points: 1000,
    options: [
      { id: 'ag-2-a', text: 'Attack on Titan', text_ar: 'هجوم العمالقة', is_correct: true },
      { id: 'ag-2-b', text: 'Fullmetal Alchemist', text_ar: 'الخيميائي الفولاذي', is_correct: false },
      { id: 'ag-2-c', text: 'Tokyo Ghoul', text_ar: 'طوكيو غول', is_correct: false },
      { id: 'ag-2-d', text: 'Demon Slayer', text_ar: 'قاتل الشياطين', is_correct: false },
    ],
  },
  {
    id: 'ag-3',
    title: 'Recognize this iconic Spacetoon opening song melody?',
    title_ar: 'من أي أنمي هذه الشارة الكلاسيكية من زمن سبيستون الجميل؟',
    audio_url: 'https://upload.wikimedia.org/wikipedia/commons/4/4b/Japanese_classical_music_flute.ogg',
    answer: 'Hunter x Hunter',
    answer_ar: 'القناص',
    aliases: ['القناص', 'هنتر', 'Hunter x Hunter', 'HXH', 'هنتر اكس هنتر'],
    anime_origin: 'Hunter x Hunter (1999 / 2011)',
    anime_origin_ar: 'القناص (سبيستون)',
    hint: 'Gon Freecss embarks on a journey to find his father and become a licensed Hunter.',
    hint_ar: 'قد لمعت عيناه، بالعزم انتفضت يمناك.. في هدوء الليل من هو الصامد المحارب؟',
    image_url: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop',
    total_time_seconds: 30,
    base_points: 1000,
    options: [
      { id: 'ag-3-a', text: 'Hunter x Hunter', text_ar: 'القناص', is_correct: true },
      { id: 'ag-3-b', text: 'Yu Yu Hakusho', text_ar: 'يو يو هاكوشو', is_correct: false },
      { id: 'ag-3-c', text: 'Bleach', text_ar: 'بليتش', is_correct: false },
      { id: 'ag-3-d', text: 'Naruto', text_ar: 'ناروتو', is_correct: false },
    ],
  },
  {
    id: 'ag-4',
    title: 'Identify this iconic pirate adventure opening OST!',
    title_ar: 'خمّن أنمي رحلة البحث عن الكنز الأعظم في أعالي البحار!',
    audio_url: 'https://upload.wikimedia.org/wikipedia/commons/4/4b/Japanese_classical_music_flute.ogg',
    answer: 'One Piece',
    answer_ar: 'ون بيس',
    aliases: ['ون بيس', 'ونبيس', 'One Piece', 'لوفي', 'Luffy'],
    anime_origin: 'One Piece',
    anime_origin_ar: 'ون بيس',
    hint: 'Monkey D. Luffy and the Straw Hat Pirates sail the Grand Line for the legendary treasure.',
    hint_ar: 'قبعة القش والبحث عن كنز غول دي روجر الأسطوري في الغراند لاين!',
    image_url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800&auto=format&fit=crop',
    total_time_seconds: 30,
    base_points: 1000,
    options: [
      { id: 'ag-4-a', text: 'One Piece', text_ar: 'ون بيس', is_correct: true },
      { id: 'ag-4-b', text: 'Fairy Tail', text_ar: 'فيري تيل', is_correct: false },
      { id: 'ag-4-c', text: 'Black Clover', text_ar: 'بلاك كلوفر', is_correct: false },
      { id: 'ag-4-d', text: 'Toriko', text_ar: 'توريكو', is_correct: false },
    ],
  },
  {
    id: 'ag-5',
    title: 'Which anime features this iconic ninja flute & battle theme?',
    title_ar: 'من أي أنمي هذا اللحن الملحمي الممزوج بناي النينجا التقليدي؟',
    audio_url: 'https://upload.wikimedia.org/wikipedia/commons/4/4b/Japanese_classical_music_flute.ogg',
    answer: 'Naruto',
    answer_ar: 'ناروتو',
    aliases: ['ناروتو', 'ناروتو شيبودن', 'Naruto', 'Naruto Shippuden', 'شيبودن'],
    anime_origin: 'Naruto & Naruto Shippuden',
    anime_origin_ar: 'ناروتو شيبودن',
    hint: 'A spirited ninja carrying the Nine-Tailed Fox dreams of becoming Hokage.',
    hint_ar: 'نينجا قرية كونوها صاحب الجينشوريكي وحلم الهوكاجي!',
    image_url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop',
    total_time_seconds: 30,
    base_points: 1000,
    options: [
      { id: 'ag-5-a', text: 'Naruto', text_ar: 'ناروتو', is_correct: true },
      { id: 'ag-5-b', text: 'Bleach', text_ar: 'بليتش', is_correct: false },
      { id: 'ag-5-c', text: 'Jujutsu Kaisen', text_ar: 'جوجوتسو كايسن', is_correct: false },
      { id: 'ag-5-d', text: 'Samurai Champloo', text_ar: 'ساموراي تشامبلو', is_correct: false },
    ],
  },
  {
    id: 'ag-6',
    title: 'Recognize this legendary mecha anime Arabic intro song?',
    title_ar: 'خمّن أنمي الروبوتات الخارق الأسطوري: عليّ عليّ بطل فليد!',
    audio_url: 'https://upload.wikimedia.org/wikipedia/commons/4/4b/Japanese_classical_music_flute.ogg',
    answer: 'Grendizer',
    answer_ar: 'مغامرات الفضاء غرندايزر',
    aliases: ['غرندايزر', 'غريندايزر', 'جريندايزر', 'Grendizer', 'Goldorak', 'UFO Robot Grendizer'],
    anime_origin: 'UFO Robot Grendizer',
    anime_origin_ar: 'مغامرات الفضاء (غرندايزر)',
    hint: 'Duke Fleed defends Earth from King Vega aboard the mighty giant robot.',
    hint_ar: 'دوق فليد وصحن دوار ورعد الفضاء وسلاح الساحق الخارق!',
    image_url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop',
    total_time_seconds: 30,
    base_points: 1000,
    options: [
      { id: 'ag-6-a', text: 'Grendizer', text_ar: 'مغامرات الفضاء غرندايزر', is_correct: true },
      { id: 'ag-6-b', text: 'Mazinger Z', text_ar: 'مازنجر زد', is_correct: false },
      { id: 'ag-6-c', text: 'Gundam', text_ar: 'غاندام', is_correct: false },
      { id: 'ag-6-d', text: 'Voltron', text_ar: 'فولترون', is_correct: false },
    ],
  },
]

// Presets ready for 1-click loading in the Admin panel
export const ANIME_AUDIO_PRESETS: AudioPreset[] = [
  {
    name: 'Detective Conan (Theme)',
    name_ar: 'المحقق كونان (شارة التحقيق - سبيستون)',
    audio_url: 'https://upload.wikimedia.org/wikipedia/commons/4/4b/Japanese_classical_music_flute.ogg',
    answer: 'Detective Conan',
    answer_ar: 'المحقق كونان',
    anime_origin: 'Detective Conan (Case Closed)',
    anime_origin_ar: 'المحقق كونان (سبيستون)',
    aliases: ['المحقق كونان', 'كونان', 'Detective Conan', 'Conan', 'Meitantei Conan'],
    hint: 'A brilliant teenage detective turned into a child by the Black Organization.',
    hint_ar: 'المتحري الذكي سينشي كودو الذي تقلص جسده ليصبح طفلاً عبقرياً يحل أصعب الجرائم!',
    image_url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop',
    options: [
      { text: 'Detective Conan', text_ar: 'المحقق كونان', is_correct: true },
      { text: 'Death Note', text_ar: 'مذكرة الموت', is_correct: false },
      { text: 'Kindaichi', text_ar: 'ملفات كيندايتشي', is_correct: false },
      { text: 'Lupin III', text_ar: 'لوبين الثالث', is_correct: false },
    ],
  },
  {
    name: 'Attack on Titan (Symphonic)',
    name_ar: 'هجوم العمالقة (الملحمة السيمفونية)',
    audio_url: 'https://upload.wikimedia.org/wikipedia/commons/c/c1/Wolfgang_Amadeus_Mozart_-_Symphony_40_g-moll_-_1._Molto_allegro.ogg',
    answer: 'Attack on Titan',
    answer_ar: 'هجوم العمالقة',
    anime_origin: 'Attack on Titan (Shingeki no Kyojin)',
    anime_origin_ar: 'هجوم العمالقة (شينغيكي نو كيوجين)',
    aliases: ['هجوم العمالقة', 'اتاتك', 'Attack on Titan', 'Shingeki no Kyojin', 'AOT'],
    hint: 'Humanity fights against man-eating giants behind towering walls.',
    hint_ar: 'إيرين وفيلق الاستكشاف وشعار أجنحة الحرية للدفاع عن البشرية خلف الأسوار!',
    image_url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop',
    options: [
      { text: 'Attack on Titan', text_ar: 'هجوم العمالقة', is_correct: true },
      { text: 'Fullmetal Alchemist', text_ar: 'الخيميائي الفولاذي', is_correct: false },
      { text: 'Tokyo Ghoul', text_ar: 'طوكيو غول', is_correct: false },
      { text: 'Demon Slayer', text_ar: 'قاتل الشياطين', is_correct: false },
    ],
  },
  {
    name: 'Hunter x Hunter (Spacetoon Opening)',
    name_ar: 'القناص (قد لمعت عيناه - سبيستون)',
    audio_url: 'https://upload.wikimedia.org/wikipedia/commons/1/10/Koto_performance.ogg',
    answer: 'Hunter x Hunter',
    answer_ar: 'القناص',
    anime_origin: 'Hunter x Hunter',
    anime_origin_ar: 'القناص (سبيستون)',
    aliases: ['القناص', 'هنتر', 'Hunter x Hunter', 'HXH', 'هنتر اكس هنتر'],
    hint: 'Gon leaves Whale Island to become a licensed Hunter and find his father.',
    hint_ar: 'قد لمعت عيناه، بالعزم انتفضت يمناك.. غون وكيلوا ورحلة امتحان الصيادين!',
    image_url: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop',
    options: [
      { text: 'Hunter x Hunter', text_ar: 'القناص', is_correct: true },
      { text: 'Yu Yu Hakusho', text_ar: 'يو يو هاكوشو', is_correct: false },
      { text: 'Bleach', text_ar: 'بليتش', is_correct: false },
      { text: 'Naruto', text_ar: 'ناروتو', is_correct: false },
    ],
  },
  {
    name: 'Death Note (L\'s Theme)',
    name_ar: 'مذكرة الموت (لحن المحقق إل الغامض)',
    audio_url: 'https://upload.wikimedia.org/wikipedia/commons/8/8c/Shikanotoone_new.ogg',
    answer: 'Death Note',
    answer_ar: 'مذكرة الموت',
    anime_origin: 'Death Note',
    anime_origin_ar: 'مذكرة الموت (ديث نوت)',
    aliases: ['مذكرة الموت', 'ديث نوت', 'Death Note', 'لايت', 'ريوك'],
    hint: 'A psychological battle between Light Yagami and the master detective L.',
    hint_ar: 'صراع العقول الأسطوري بين ياغامي لايت والمحقق العبقري إل ودفتر الموت!',
    image_url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop',
    options: [
      { text: 'Death Note', text_ar: 'مذكرة الموت', is_correct: true },
      { text: 'Code Geass', text_ar: 'كود غياس', is_correct: false },
      { text: 'Monster', text_ar: 'مونستر', is_correct: false },
      { text: 'Psycho-Pass', text_ar: 'سايكو باس', is_correct: false },
    ],
  },
  {
    name: 'Naruto (Ninja Spirit)',
    name_ar: 'ناروتو (عزيمة النينجا وشيبودن)',
    audio_url: 'https://upload.wikimedia.org/wikipedia/commons/4/4b/Japanese_classical_music_flute.ogg',
    answer: 'Naruto',
    answer_ar: 'ناروتو',
    anime_origin: 'Naruto & Naruto Shippuden',
    anime_origin_ar: 'ناروتو شيبودن',
    aliases: ['ناروتو', 'ناروتو شيبودن', 'Naruto', 'Shippuden', 'شيبودن'],
    hint: 'A ninja boy bearing the Nine-Tailed Fox strives to become Hokage.',
    hint_ar: 'نينجا قرية كونوها صاحب الجينشوريكي والشاكرا البرتقالية وحلم الهوكاجي!',
    image_url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop',
    options: [
      { text: 'Naruto', text_ar: 'ناروتو', is_correct: true },
      { text: 'Bleach', text_ar: 'بليتش', is_correct: false },
      { text: 'Jujutsu Kaisen', text_ar: 'جوجوتسو كايسن', is_correct: false },
      { text: 'Black Clover', text_ar: 'بلاك كلوفر', is_correct: false },
    ],
  },
  {
    name: 'One Piece (Straw Hat Grand Line)',
    name_ar: 'ون بيس (سفينة قبعة القش والغراند لاين)',
    audio_url: 'https://upload.wikimedia.org/wikipedia/commons/1/10/Koto_performance.ogg',
    answer: 'One Piece',
    answer_ar: 'ون بيس',
    anime_origin: 'One Piece',
    anime_origin_ar: 'ون بيس',
    aliases: ['ون بيس', 'ونبيس', 'One Piece', 'لوفي', 'Luffy'],
    hint: 'Monkey D. Luffy gathers a crew to find the legendary treasure and become King of the Pirates.',
    hint_ar: 'قبعة القش والبحث عن كنز غول دي روجر الأسطوري في الغراند لاين!',
    image_url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800&auto=format&fit=crop',
    options: [
      { text: 'One Piece', text_ar: 'ون بيس', is_correct: true },
      { text: 'Fairy Tail', text_ar: 'فيري تيل', is_correct: false },
      { text: 'Toriko', text_ar: 'توريكو', is_correct: false },
      { text: 'Hunter x Hunter', text_ar: 'القناص', is_correct: false },
    ],
  },
  {
    name: 'Grendizer (Goldorak Spacetoon)',
    name_ar: 'غريندايزر (عليّ عليّ بطل فليد - سبيستون)',
    audio_url: 'https://upload.wikimedia.org/wikipedia/commons/c/c1/Wolfgang_Amadeus_Mozart_-_Symphony_40_g-moll_-_1._Molto_allegro.ogg',
    answer: 'Grendizer',
    answer_ar: 'مغامرات الفضاء غرندايزر',
    anime_origin: 'UFO Robot Grendizer',
    anime_origin_ar: 'مغامرات الفضاء (غرندايزر)',
    aliases: ['غرندايزر', 'غريندايزر', 'جريندايزر', 'Grendizer', 'Goldorak'],
    hint: 'Duke Fleed defends planet Earth with the mighty super robot Grendizer.',
    hint_ar: 'دوق فليد وصحن دوار ورعد الفضاء والسلاح الساحق الخارق للدفاع عن الأرض!',
    image_url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop',
    options: [
      { text: 'Grendizer', text_ar: 'مغامرات الفضاء غرندايزر', is_correct: true },
      { text: 'Mazinger Z', text_ar: 'مازنجر زد', is_correct: false },
      { text: 'Gundam', text_ar: 'غاندام', is_correct: false },
      { text: 'Voltron', text_ar: 'فولترون', is_correct: false },
    ],
  },
  {
    name: 'Demon Slayer (Kimetsu no Yaiba)',
    name_ar: 'قاتل الشياطين (تانجيرو ونيزوكو)',
    audio_url: 'https://upload.wikimedia.org/wikipedia/commons/8/8c/Shikanotoone_new.ogg',
    answer: 'Demon Slayer',
    answer_ar: 'قاتل الشياطين',
    anime_origin: 'Kimetsu no Yaiba',
    anime_origin_ar: 'قاتل الشياطين (كيميتسو نو يايبا)',
    aliases: ['قاتل الشياطين', 'كيميتسو', 'Demon Slayer', 'Kimetsu no Yaiba', 'تانجيرو'],
    hint: 'Tanjiro wields the Nichirin sword to avenge his family and save Nezuko.',
    hint_ar: 'سيف الشمس وتنفس الماء وتنفس الشمس للقضاء على موزان كيبوتسوجي!',
    image_url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop',
    options: [
      { text: 'Demon Slayer', text_ar: 'قاتل الشياطين', is_correct: true },
      { text: 'Jujutsu Kaisen', text_ar: 'جوجوتسو كايسن', is_correct: false },
      { text: 'Bleach', text_ar: 'بليتش', is_correct: false },
      { text: 'Inuyasha', text_ar: 'إنيوشا', is_correct: false },
    ],
  },
]

// ------------------------------------------------------------
// 9. "WHO'S THAT SILHOUETTE?" (خمن ظل الشخصية 👤)
// ------------------------------------------------------------
export const SILHOUETTE_QUESTIONS: SilhouetteQuestionData[] = [
  {
    id: 'sil-1',
    character_name: 'Son Goku',
    character_name_ar: 'سون غوكو',
    anime_origin: 'Dragon Ball Z',
    anime_origin_ar: 'دراغون بول زد',
    image_url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop',
    aliases: ['غوكو', 'سون غوكو', 'Goku', 'Son Goku', 'كاكاروت', 'Kakarot'],
    hint: 'Saiyan warrior who loves fighting and food; master of the Kamehameha.',
    hint_ar: 'مقاتل السايان الأسطوري، محب للطعام والقتال وصاحب ضربة الكاميهاميها الشهيرة!',
    total_time_seconds: 30,
    base_points: 1000,
    options: [
      { id: 'sil-1-a', text: 'Son Goku', text_ar: 'سون غوكو', is_correct: true },
      { id: 'sil-1-b', text: 'Vegeta', text_ar: 'فيجيتا', is_correct: false },
      { id: 'sil-1-c', text: 'Gohan', text_ar: 'غوهان', is_correct: false },
      { id: 'sil-1-d', text: 'Broly', text_ar: 'برولي', is_correct: false },
    ],
  },
  {
    id: 'sil-2',
    character_name: 'Monkey D. Luffy',
    character_name_ar: 'مونكي دي لوفي',
    anime_origin: 'One Piece',
    anime_origin_ar: 'ون بيس',
    image_url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800&auto=format&fit=crop',
    aliases: ['لوفي', 'مونكي دي لوفي', 'Luffy', 'Monkey D Luffy', 'قبعة القش'],
    hint: 'Straw Hat captain with rubber body aiming to be the Pirate King.',
    hint_ar: 'قبطان قبعة القش صاحب جسد المطاط الذي يحلم بأن يصبح ملك القراصنة!',
    total_time_seconds: 30,
    base_points: 1000,
    options: [
      { id: 'sil-2-a', text: 'Monkey D. Luffy', text_ar: 'مونكي دي لوفي', is_correct: true },
      { id: 'sil-2-b', text: 'Roronoa Zoro', text_ar: 'رورونوا زورو', is_correct: false },
      { id: 'sil-2-c', text: 'Portgas D. Ace', text_ar: 'بورتغاس دي إيس', is_correct: false },
      { id: 'sil-2-d', text: 'Shanks', text_ar: 'شانكس', is_correct: false },
    ],
  },
  {
    id: 'sil-3',
    character_name: 'Naruto Uzumaki',
    character_name_ar: 'ناروتو أوزوماكي',
    anime_origin: 'Naruto Shippuden',
    anime_origin_ar: 'ناروتو شيبودن',
    image_url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop',
    aliases: ['ناروتو', 'ناروتو اوزوماكي', 'Naruto', 'Naruto Uzumaki'],
    hint: 'Jinchuriki of the Nine-Tails who never gives up on becoming Hokage.',
    hint_ar: 'صاحب وحش الذيول التسعة وعزيمة النينجا التي لا تستسلم حتى يصبح هوكاجي!',
    total_time_seconds: 30,
    base_points: 1000,
    options: [
      { id: 'sil-3-a', text: 'Naruto Uzumaki', text_ar: 'ناروتو أوزوماكي', is_correct: true },
      { id: 'sil-3-b', text: 'Sasuke Uchiha', text_ar: 'ساسكي أوتشيها', is_correct: false },
      { id: 'sil-3-c', text: 'Kakashi Hatake', text_ar: 'كاكاشي هاتاكي', is_correct: false },
      { id: 'sil-3-d', text: 'Minato Namikaze', text_ar: 'ميناتو ناميكازي', is_correct: false },
    ],
  },
  {
    id: 'sil-4',
    character_name: 'Levi Ackerman',
    character_name_ar: 'ليفاي أكرمان',
    anime_origin: 'Attack on Titan',
    anime_origin_ar: 'هجوم العمالقة',
    image_url: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop',
    aliases: ['ليفاي', 'ليفاي اكرمان', 'Levi', 'Levi Ackerman', 'الكابتن ليفاي'],
    hint: "Humanity's strongest soldier, Survey Corps captain with dual spinning blades.",
    hint_ar: 'أقوى جندي في البشرية، قائد فيلق الاستكشاف وعاشق النظافة والشاي الأسود!',
    total_time_seconds: 30,
    base_points: 1000,
    options: [
      { id: 'sil-4-a', text: 'Levi Ackerman', text_ar: 'ليفاي أكرمان', is_correct: true },
      { id: 'sil-4-b', text: 'Eren Yeager', text_ar: 'إيرين ييغر', is_correct: false },
      { id: 'sil-4-c', text: 'Erwin Smith', text_ar: 'إروين سميث', is_correct: false },
      { id: 'sil-4-d', text: 'Armin Arlert', text_ar: 'أرمين أرليرت', is_correct: false },
    ],
  },
  {
    id: 'sil-5',
    character_name: 'Tanjiro Kamado',
    character_name_ar: 'تانجيرو كامادو',
    anime_origin: 'Demon Slayer (Kimetsu no Yaiba)',
    anime_origin_ar: 'قاتل الشياطين',
    image_url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop',
    aliases: ['تانجيرو', 'تانجيرو كامادو', 'Tanjiro', 'Tanjiro Kamado'],
    hint: 'Kind-hearted swordsman wearing hanafuda earrings to cure his sister Nezuko.',
    hint_ar: 'صاحب أقراط الهانافودا وتنفس الماء والشمس، يسعى لإنقاذ أخته نيزوكو!',
    total_time_seconds: 30,
    base_points: 1000,
    options: [
      { id: 'sil-5-a', text: 'Tanjiro Kamado', text_ar: 'تانجيرو كامادو', is_correct: true },
      { id: 'sil-5-b', text: 'Zenitsu Agatsuma', text_ar: 'زينيتسو أغاتسوما', is_correct: false },
      { id: 'sil-5-c', text: 'Inosuke Hashibira', text_ar: 'إينوسكي هاشيبيرا', is_correct: false },
      { id: 'sil-5-d', text: 'Giyu Tomioka', text_ar: 'غيو توميوكا', is_correct: false },
    ],
  },
  {
    id: 'sil-6',
    character_name: 'Conan Edogawa',
    character_name_ar: 'كونان إيدوجاوا',
    anime_origin: 'Detective Conan (Case Closed)',
    anime_origin_ar: 'المحقق كونان',
    image_url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop',
    aliases: ['كونان', 'المحقق كونان', 'Conan', 'Conan Edogawa', 'سينشي', 'Shinichi'],
    hint: 'Teen detective turned child wearing glasses, bow-tie, and turbo skateboard.',
    hint_ar: 'المتحري الصغير ذو النظارات وربطة العنق المغيرة للصوت وحذاء الركلات الخارقة!',
    total_time_seconds: 30,
    base_points: 1000,
    options: [
      { id: 'sil-6-a', text: 'Conan Edogawa', text_ar: 'كونان إيدوجاوا', is_correct: true },
      { id: 'sil-6-b', text: 'Heiji Hattori', text_ar: 'هيجي هاتوري', is_correct: false },
      { id: 'sil-6-c', text: 'Kaito Kid', text_ar: 'كايتو كيد', is_correct: false },
      { id: 'sil-6-d', text: 'Kogoro Mouri', text_ar: 'توغو موري', is_correct: false },
    ],
  },
]

// ------------------------------------------------------------
// 10. "ANIME EMOJI RIDDLE" (ألغاز الإيموجي للأنمي 🎭)
// ------------------------------------------------------------
export const EMOJI_RIDDLE_QUESTIONS: EmojiRiddleData[] = [
  {
    id: 'em-1',
    emojis: '🏴‍☠️ 🍖 👒',
    answer: 'One Piece',
    answer_ar: 'ون بيس',
    anime_origin: 'One Piece',
    anime_origin_ar: 'ون بيس (إييتشيرو أودا)',
    aliases: ['ون بيس', 'ونبيس', 'One Piece', 'لوفي'],
    hint: 'Pirates, meat-loving captain, and a straw hat!',
    hint_ar: 'قرصان، قبعة قش، وعاشق كبير للحوم في الغراند لاين!',
    total_time_seconds: 20,
    base_points: 1000,
    options: [
      { id: 'em-1-a', text: 'One Piece', text_ar: 'ون بيس', is_correct: true },
      { id: 'em-1-b', text: 'Fairy Tail', text_ar: 'فيري تيل', is_correct: false },
      { id: 'em-1-c', text: 'Toriko', text_ar: 'توريكو', is_correct: false },
      { id: 'em-1-d', text: 'Black Clover', text_ar: 'بلاك كلوفر', is_correct: false },
    ],
  },
  {
    id: 'em-2',
    emojis: '📓 🍎 ✍️',
    answer: 'Death Note',
    answer_ar: 'مذكرة الموت',
    anime_origin: 'Death Note',
    anime_origin_ar: 'مذكرة الموت (ديث نوت)',
    aliases: ['مذكرة الموت', 'ديث نوت', 'Death Note', 'لايت', 'ريوك'],
    hint: 'Notebook, shinigami apple, and a deadly pen!',
    hint_ar: 'دفتر أسود خارق، تفاح للشينيغامي، وقلم يقرر المصير!',
    total_time_seconds: 20,
    base_points: 1000,
    options: [
      { id: 'em-2-a', text: 'Death Note', text_ar: 'مذكرة الموت', is_correct: true },
      { id: 'em-2-b', text: 'Code Geass', text_ar: 'كود غياس', is_correct: false },
      { id: 'em-2-c', text: 'Monster', text_ar: 'مونستر', is_correct: false },
      { id: 'em-2-d', text: 'Tokyo Ghoul', text_ar: 'طوكيو غول', is_correct: false },
    ],
  },
  {
    id: 'em-3',
    emojis: '👁️ 🧑‍🦯 🤞',
    answer: 'Jujutsu Kaisen',
    answer_ar: 'جوجوتسو كايسن',
    anime_origin: 'Jujutsu Kaisen',
    anime_origin_ar: 'جوجوتسو كايسن (غوجو ساتورو)',
    aliases: ['جوجوتسو كايسن', 'جوجوتسو', 'Jujutsu Kaisen', 'JJK', 'غوجو'],
    hint: 'Six Eyes blindfold, domain expansion finger cross: Infinite Void!',
    hint_ar: 'عصابة العينين، ضربة بسط المجال بالأصابع، وأقوى ساحر في العالم!',
    total_time_seconds: 20,
    base_points: 1000,
    options: [
      { id: 'em-3-a', text: 'Jujutsu Kaisen', text_ar: 'جوجوتسو كايسن', is_correct: true },
      { id: 'em-3-b', text: 'Bleach', text_ar: 'بليتش', is_correct: false },
      { id: 'em-3-c', text: 'Chainsaw Man', text_ar: 'رجل المنشار', is_correct: false },
      { id: 'em-3-d', text: 'Mob Psycho 100', text_ar: 'موب سايكو 100', is_correct: false },
    ],
  },
  {
    id: 'em-4',
    emojis: '🧑‍🦰 🦊 🍜',
    answer: 'Naruto',
    answer_ar: 'ناروتو',
    anime_origin: 'Naruto',
    anime_origin_ar: 'ناروتو شيبودن',
    aliases: ['ناروتو', 'ناروتو شيبودن', 'Naruto', 'Shippuden'],
    hint: 'Spiky hair, nine-tailed fox, and Ichiraku Ramen bowl!',
    hint_ar: 'شعر برتقالي/أشقر، ثعلب أسطوري، ورامين إيتشيراكو المفضل!',
    total_time_seconds: 20,
    base_points: 1000,
    options: [
      { id: 'em-4-a', text: 'Naruto', text_ar: 'ناروتو', is_correct: true },
      { id: 'em-4-b', text: 'Dragon Ball', text_ar: 'دراغون بول', is_correct: false },
      { id: 'em-4-c', text: 'Hunter x Hunter', text_ar: 'القناص', is_correct: false },
      { id: 'em-4-d', text: 'Boruto', text_ar: 'بوروتو', is_correct: false },
    ],
  },
  {
    id: 'em-5',
    emojis: '🏐 🧡 🦅',
    answer: 'Haikyuu!!',
    answer_ar: 'هايكيو',
    anime_origin: 'Haikyuu!!',
    anime_origin_ar: 'هايكيو (ثانوية كاراسونو)',
    aliases: ['هايكيو', 'Haikyuu', 'Haikyu', 'كرة الطائرة'],
    hint: 'Volleyball, orange hair Hinata, and Karasuno Crows flying!',
    hint_ar: 'كرة طائرة، هيناتا شويو، وغربان كاراسونو تحلق نحو القمة!',
    total_time_seconds: 20,
    base_points: 1000,
    options: [
      { id: 'em-5-a', text: 'Haikyuu!!', text_ar: 'هايكيو', is_correct: true },
      { id: 'em-5-b', text: 'Kuroko no Basket', text_ar: 'كوروكو نو باسكت', is_correct: false },
      { id: 'em-5-c', text: 'Blue Lock', text_ar: 'بلو لوك', is_correct: false },
      { id: 'em-5-d', text: 'Slam Dunk', text_ar: 'سلام دانك', is_correct: false },
    ],
  },
  {
    id: 'em-6',
    emojis: '🤖 🪐 🛸',
    answer: 'Grendizer',
    answer_ar: 'مغامرات الفضاء غرندايزر',
    anime_origin: 'UFO Robot Grendizer',
    anime_origin_ar: 'غرندايزر (سبيستون)',
    aliases: ['غريندايزر', 'غرندايزر', 'Grendizer', 'Goldorak'],
    hint: 'Giant super robot, planet Fleed, and flying saucer!',
    hint_ar: 'الرجل الآلي الخارق، كوكب فليد، والصحن الطائر ضد قوات فيغا!',
    total_time_seconds: 20,
    base_points: 1000,
    options: [
      { id: 'em-6-a', text: 'Grendizer', text_ar: 'مغامرات الفضاء غرندايزر', is_correct: true },
      { id: 'em-6-b', text: 'Mazinger Z', text_ar: 'مازنجر زد', is_correct: false },
      { id: 'em-6-c', text: 'Gundam', text_ar: 'غاندام', is_correct: false },
      { id: 'em-6-d', text: 'Transformers', text_ar: 'المتحولون', is_correct: false },
    ],
  },
]


