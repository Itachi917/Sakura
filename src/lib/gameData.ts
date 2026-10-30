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
  word: string
  word_ar: string
  category: string
  category_ar: string
  difficulty: 'easy' | 'medium' | 'hard'
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
  { word: 'Kunai', word_ar: 'كوناي', category: 'Ninja Weapon', category_ar: 'سلاح نينجا', difficulty: 'easy' },
  { word: 'Straw Hat', word_ar: 'قبعة القش', category: 'Clothing', category_ar: 'ملابس وأزياء', difficulty: 'easy' },
  { word: 'Ramen Bowl', word_ar: 'وعاء رامن', category: 'Food', category_ar: 'طعام ياباني', difficulty: 'easy' },
  { word: 'Sharingan', word_ar: 'شارينغان', category: 'Anime Power', category_ar: 'قوة أنمي', difficulty: 'medium' },
  { word: 'Death Note', word_ar: 'مذكرة الموت', category: 'Object', category_ar: 'أداة', difficulty: 'medium' },
  { word: 'Katana Sword', word_ar: 'سيف كاتانا', category: 'Weapon', category_ar: 'سلاح ساموراي', difficulty: 'easy' },
  { word: 'Dragon Ball', word_ar: 'كرة التنين', category: 'Artifact', category_ar: 'أداة سحرية', difficulty: 'medium' },
  { word: 'Sakura Petal', word_ar: 'بتلة ساكورا', category: 'Nature', category_ar: 'طبيعة وثقافة', difficulty: 'easy' },
  { word: 'Catbus', word_ar: 'حافلة القط', category: 'Ghibli Creature', category_ar: 'مخلوق غيبلي', difficulty: 'hard' },
  { word: 'Giant Titan', word_ar: 'عملاق ضخم', category: 'Creature', category_ar: 'مخلوق ضخم', difficulty: 'medium' },
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
