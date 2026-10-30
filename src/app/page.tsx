import { Metadata } from 'next'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { Cherry, Play, Star, Users, Award, ArrowRight, Sparkles } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { createClient } from '@/lib/supabase/server'
import PetalAnimation from '@/components/ui/PetalAnimation'
import LiveSessionBanner from '@/components/landing/LiveSessionBanner'
import EventCard from '@/components/landing/EventCard'

export const metadata: Metadata = {
  title: 'Sakura — Where Anime Meets Japanese Culture',
  description: 'Sakura brings your university anime club to life with live quizzes, team games, and a collectible digital passport for every event.',
}

const ACTIVITIES = [
  { id: 'zoom_guess', emoji: '🔍', color: '#ec4899', bgColor: 'rgba(236, 72, 153, 0.08)', borderColor: 'rgba(236, 72, 153, 0.35)' },
  { id: 'whos_that_character', emoji: '🎭', color: '#D96C9D', bgColor: 'rgba(217, 108, 157, 0.08)', borderColor: 'rgba(217, 108, 157, 0.25)' },
  { id: 'spacetoon_nostalgia', emoji: '📺', color: '#5B8AE8', bgColor: 'rgba(91, 138, 232, 0.08)', borderColor: 'rgba(91, 138, 232, 0.25)' },
  { id: 'anime_expert_exam', emoji: '📚', color: '#438A68', bgColor: 'rgba(67, 138, 104, 0.08)', borderColor: 'rgba(67, 138, 104, 0.25)' },
  { id: 'sakura_feud', emoji: '⚔️', color: '#D59A45', bgColor: 'rgba(213, 154, 69, 0.08)', borderColor: 'rgba(213, 154, 69, 0.25)' },
  { id: 'draw_it_guess_it', emoji: '🎨', color: '#B9A1C8', bgColor: 'rgba(185, 161, 200, 0.08)', borderColor: 'rgba(185, 161, 200, 0.25)' },
]

const ACTIVITY_LABELS: Record<string, Record<string, { name: string; desc: string }>> = {
  zoom_guess: {
    en: { name: 'Zoom & Guess', desc: 'Starts heavily cropped, zooming out every 10s. Guess faster for maximum points with near-miss hints!' },
    ar: { name: 'خمن بالزووم', desc: 'تبدأ الصورة مقصوصة ومكبرة، وتصغر كل 10 ثوانٍ. خمن أسرع لتحصد أعلى النقاط مع تنبيهات القرب!' },
  },
  whos_that_character: {
    en: { name: "Who's That Character?", desc: 'Identify anime characters from silhouettes, clues, and cropped images.' },
    ar: { name: 'من هذه الشخصية؟', desc: 'تعرّف على شخصيات الأنمي من الصور الظلية والأدلة.' },
  },
  spacetoon_nostalgia: {
    en: { name: 'Spacetoon Nostalgia', desc: 'Relive the golden age of Arabic-dubbed anime from Spacetoon.' },
    ar: { name: 'نوستالجيا سبيستون', desc: 'أحيِ العصر الذهبي للأنمي المدبلج بالعربية على قناة سبيستون.' },
  },
  anime_expert_exam: {
    en: { name: 'Anime Expert Exam', desc: 'Prove your anime knowledge across trivia, rankings, and more.' },
    ar: { name: 'اختبار خبير الأنمي', desc: 'أثبت معلوماتك بالأنمي عبر أسئلة متنوعة وتحديات.' },
  },
  sakura_feud: {
    en: { name: 'Sakura Feud', desc: 'Two teams compete to guess the most popular survey answers.' },
    ar: { name: 'فيود ساكورا', desc: 'فريقان يتنافسان لتخمين أكثر الإجابات شيوعاً في الاستطلاع.' },
  },
  draw_it_guess_it: {
    en: { name: 'Draw It, Guess It', desc: 'Draw anime characters and scenes while others race to guess.' },
    ar: { name: 'ارسم واخمّن', desc: 'ارسم شخصيات الأنمي ومشاهده بينما يسارع الآخرون للتخمين.' },
  },
}

export default async function HomePage() {
  const cookieStore = await cookies()
  const locale = cookieStore.get('locale')?.value === 'ar' ? 'ar' : 'en'
  const isRtl = locale === 'ar'
  const supabase = await createClient()

  // Fetch published events
  const { data: events } = await supabase
    .from('events')
    .select('*')
    .in('status', ['published', 'active'])
    .order('starts_at', { ascending: true })
    .limit(3)

  // Check for live sessions
  const { data: liveSessions } = await supabase
    .from('game_sessions')
    .select('id, room_pin, activity_type, status')
    .in('status', ['lobby', 'question_active', 'answer_reveal', 'ready'])
    .limit(1)

  const liveSession = liveSessions?.[0] ?? null

  return (
    <>
      <Navbar locale={locale} />

      <main>
        {/* HERO */}
        <section className="relative min-h-screen flex items-center sakura-bg-dark overflow-hidden" id="hero">
          <div aria-hidden="true" className="absolute top-1/4 -right-32 w-96 h-96 rounded-full" style={{ background: 'radial-gradient(circle, rgba(217,108,157,0.15) 0%, transparent 70%)' }} />
          <div aria-hidden="true" className="absolute bottom-1/4 -left-32 w-80 h-80 rounded-full" style={{ background: 'radial-gradient(circle, rgba(185,161,200,0.12) 0%, transparent 70%)' }} />

          <div className="container-sakura relative z-10 pt-24 pb-16">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              {/* Left Column: Hero Content */}
              <div className="lg:col-span-7">
                {liveSession && (
                  <div className="animate-fade-in mb-6">
                    <LiveSessionBanner session={liveSession} locale={locale} />
                  </div>
                )}

                <div className="flex items-center gap-2 mb-6 animate-slide-in-left">
                  <Cherry size={18} className="text-[var(--sakura-pink)]" aria-hidden="true" />
                  <span className="text-[var(--sakura-pink)] text-sm font-semibold tracking-widest uppercase">
                    {isRtl ? 'نادي الثقافة اليابانية' : 'Japanese Culture Club'}
                  </span>
                </div>

                <h1 className="text-white mb-6 animate-fade-in" style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 5.5vw, 4.5rem)', lineHeight: 1.1, letterSpacing: '-0.02em', animationDelay: '100ms' }}>
                  {isRtl ? (
                    <>عالم يجمع <span className="text-gradient-sakura">الأنمي</span> والثقافة اليابانية</>
                  ) : (
                    <>Where <span className="text-gradient-sakura">Anime</span> Meets Japanese Culture.</>
                  )}
                </h1>

                <p className="text-[var(--muted-lavender)] text-base sm:text-lg mb-10 max-w-xl animate-fade-in leading-relaxed" style={{ animationDelay: '200ms' }}>
                  {isRtl
                    ? 'ساكورا تُحيي فعاليات النادي — مسابقات مباشرة، تحديات جماعية، وجواز سفر رقمي تجمع فيه ذكرياتك وأختامك.'
                    : 'Sakura brings club events to life — live quizzes, team challenges, and a collectible digital passport that grows with every event.'}
                </p>

                <div className="flex flex-wrap gap-4 animate-fade-in" style={{ animationDelay: '300ms' }}>
                  <Link href="/join" className="btn btn-primary btn-xl group shadow-lg shadow-pink-500/25" id="hero-join-cta">
                    <Play size={18} aria-hidden="true" />
                    {isRtl ? 'انضم إلى لعبة مباشرة' : 'Join a Live Game'}
                    <ArrowRight size={16} aria-hidden="true" className="group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <Link href="#activities" className="btn btn-dark btn-xl" id="hero-explore-cta">
                    {isRtl ? 'اكتشف ساكورا' : 'Explore Sakura'}
                  </Link>
                </div>

                <div className="flex flex-wrap gap-8 mt-12 animate-fade-in" style={{ animationDelay: '400ms' }}>
                  {[
                    { icon: <Users size={18} />, label: isRtl ? 'مشترك' : 'Members', value: '200+' },
                    { icon: <Star size={18} />, label: isRtl ? 'فعالية' : 'Events', value: '12+' },
                    { icon: <Award size={18} />, label: isRtl ? 'ختم' : 'Stamps Earned', value: '500+' },
                  ].map(stat => (
                    <div key={stat.label} className="flex items-center gap-3">
                      <div className="text-[var(--sakura-pink)]">{stat.icon}</div>
                      <div>
                        <div className="text-white font-bold text-xl leading-none">{stat.value}</div>
                        <div className="text-[var(--muted-text)] text-xs mt-0.5">{stat.label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Desktop PC Club Showcase Card */}
              <div className="hidden lg:flex lg:col-span-5 flex-col items-center justify-center relative animate-fade-in" style={{ animationDelay: '200ms' }}>
                {/* Background Ambient Glow */}
                <div
                  aria-hidden="true"
                  className="absolute w-72 h-72 rounded-full bg-gradient-to-tr from-pink-500/25 to-purple-600/30 blur-3xl pointer-events-none"
                />

                {/* Deluxe Floating Card */}
                <div className="relative w-full max-w-sm rounded-3xl bg-gradient-to-b from-[#241334]/90 via-[#1e0e2d]/95 to-[#160a22]/95 border-2 border-pink-400/35 p-7 shadow-2xl backdrop-blur-2xl hover:border-pink-300/60 transition-all duration-300 hover:scale-[1.02]">
                  <div className="flex items-center justify-between pb-3.5 border-b border-pink-500/20 mb-5">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                      <span className="text-xs font-black uppercase tracking-wider text-pink-300">
                        Sakura Live Hub
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-pink-500/20 border border-pink-400/30 text-pink-200">
                      SU CLUB
                    </span>
                  </div>

                  {/* Central Circular Emblem */}
                  <div className="w-32 h-32 mx-auto rounded-3xl overflow-hidden border-2 border-pink-300/50 shadow-2xl shadow-pink-500/30 mb-5 group hover:rotate-3 transition-transform duration-300">
                    <img src="/logo.png" alt="Sakura Club Crest" className="w-full h-full object-cover" />
                  </div>

                  <div className="text-center mb-5">
                    <h3 className="text-xl font-black text-white">
                      {isRtl ? 'نادي الساكورا للثقافة اليابانية' : 'Sakura Anime & Culture'}
                    </h3>
                    <p className="text-xs text-pink-200/70 mt-1">
                      {isRtl
                        ? 'جامعة صحار • منصة تفاعلية'
                        : 'Sohar University • Interactive Club Platform'}
                    </p>
                  </div>

                  {/* Free Welcome Stamp Callout */}
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/50 via-teal-950/40 to-emerald-950/50 border border-emerald-400/40 flex items-center gap-3 shadow-inner">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 border border-emerald-200 flex items-center justify-center text-2xl shrink-0 shadow-lg shadow-emerald-500/30">
                      🍃
                    </div>
                    <div className="min-w-0 text-start">
                      <div className="text-[10px] font-black uppercase text-emerald-300 tracking-wider">
                        {isRtl ? 'ختم ترحيبي لكل مسجّل' : 'Welcome Stamp For All'}
                      </div>
                      <div className="text-xs font-bold text-white truncate">
                        {isRtl ? 'ختم الورقة الغضة (Fresh Leaf 🍃)' : 'Fresh Leaf Stamp 🍃'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce opacity-50" aria-hidden="true">
            <div className="w-0.5 h-8 bg-gradient-to-b from-[var(--sakura-pink)] to-transparent mx-auto" />
          </div>
        </section>

        {/* JOIN SECTION */}
        <section className="section bg-gradient-to-b from-[#180C22] via-[#241334]/70 to-[#180C22] border-y border-pink-500/10" id="join">
          <div className="container-sakura">
            <div className="max-w-2xl mx-auto text-center card p-8 sm:p-12 shadow-2xl bg-[rgba(36,21,47,0.85)] border-pink-400/20">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-pink-500/20 border border-pink-400/30 text-pink-300 text-xs font-bold mb-4">
                <Sparkles size={14} className="text-[var(--sakura-pink)]" />
                <span>{isRtl ? 'لعبة جماعية مباشرة' : 'Live Interactive Game'}</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
                {isRtl ? 'انضم إلى لعبة الآن' : 'Join a Game Now'}
              </h2>
              <p className="text-pink-100/75 text-sm sm:text-base mb-8 max-w-lg mx-auto leading-relaxed">
                {isRtl
                  ? 'أدخل رمز الغرفة المؤلف من 6 أرقام المعروض على شاشة العرض للمشاركة فوراً من هاتفك.'
                  : 'Enter the 6-digit room PIN from the projector screen to instantly join from your phone.'}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/join" className="btn btn-primary btn-xl w-full sm:w-auto shadow-lg shadow-pink-500/30" id="join-section-cta">
                  <Sparkles size={18} aria-hidden="true" />
                  {isRtl ? 'انضم برمز الغرفة (PIN)' : 'Join with Room PIN'}
                </Link>
                <Link href="/events" className="btn btn-secondary btn-xl w-full sm:w-auto">
                  {isRtl ? 'استعراض الفعاليات' : 'Browse Events'}
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ACTIVITIES SECTION */}
        <section className="section sakura-bg-dark" id="activities">
          <div className="container-sakura">
            <div className="text-center mb-14">
              <div className="inline-flex items-center justify-center gap-2 mb-3 px-3.5 py-1 rounded-full bg-pink-500/15 border border-pink-400/25">
                <Cherry size={16} className="text-[var(--sakura-pink)]" aria-hidden="true" />
                <span className="text-[var(--sakura-pink)] text-xs font-bold tracking-widest uppercase">
                  {isRtl ? 'الأنشطة' : 'Club Activities'}
                </span>
              </div>
              <h2 className="text-white text-3xl sm:text-4xl font-extrabold mb-4">
                {isRtl ? 'أنشطة النادي التفاعلية' : 'Live Game Modes'}
              </h2>
              <p className="text-pink-100/70 max-w-lg mx-auto text-sm sm:text-base leading-relaxed">
                {isRtl ? 'خمس ألعاب فريدة مصممة لأمسيات النادي الحضورية، تنافس واجمع النقاط مع الحضور.' : 'Five unique games tailored for in-person anime club nights. Compete live and unlock passport stamps.'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {ACTIVITIES.map(activity => {
                const info = ACTIVITY_LABELS[activity.id]?.[locale] ?? ACTIVITY_LABELS[activity.id]?.en
                return (
                  <div
                    key={activity.id}
                    className="card rounded-2xl p-6 sm:p-7 border transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:border-pink-400/40 flex flex-col justify-between"
                    style={{ background: 'rgba(36,21,47,0.7)', borderColor: activity.borderColor }}
                  >
                    <div>
                      <div className="text-4xl mb-4 p-3 rounded-2xl bg-white/5 w-fit border border-white/10">{activity.emoji}</div>
                      <h3 className="text-white font-extrabold mb-2.5 text-xl tracking-tight">{info?.name}</h3>
                      <p className="text-pink-100/70 text-sm leading-relaxed">{info?.desc}</p>
                    </div>
                    <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs font-semibold text-pink-300">
                      <span>{isRtl ? 'نشاط تفاعلي حي' : 'Live Multiplayer'}</span>
                      <span className="text-pink-400">🌸</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* EVENTS SECTION */}
        <section className="section bg-gradient-to-b from-[#180C22] to-[#200f2e] border-t border-pink-500/10" id="events">
          <div className="container-sakura">
            <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-12">
              <div>
                <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full bg-pink-500/15 border border-pink-400/25">
                  <Cherry size={14} className="text-[var(--sakura-pink)]" aria-hidden="true" />
                  <span className="text-[var(--sakura-pink)] text-xs font-bold tracking-widest uppercase">
                    {isRtl ? 'الفعاليات' : 'Events Calendar'}
                  </span>
                </div>
                <h2 className="text-white text-3xl sm:text-4xl font-extrabold mb-2">
                  {isRtl ? 'الفعاليات القادمة' : 'Upcoming Physical Events'}
                </h2>
                <p className="text-pink-100/70 text-sm sm:text-base">
                  {isRtl ? 'تعرّف على ما خطط له النادي وسجّل حضورك في الحرم الجامعي.' : 'See what the club has planned on campus and prepare to check in.'}
                </p>
              </div>
              <Link href="/events" className="btn btn-secondary btn-sm">
                {isRtl ? 'كل الفعاليات' : 'View All Events'}
                <ArrowRight size={14} aria-hidden="true" className={isRtl ? 'rotate-180' : ''} />
              </Link>
            </div>

            {events && events.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map(event => (
                  <EventCard key={event.id} event={event} locale={locale} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 card max-w-xl mx-auto border-pink-500/20">
                <div className="text-5xl mb-4">🌸</div>
                <h3 className="text-white text-xl font-bold mb-2">
                  {isRtl ? 'لا توجد فعاليات قادمة حالياً' : 'No upcoming events right now'}
                </h3>
                <p className="text-pink-100/60 text-sm mb-6">
                  {isRtl ? 'تحقق لاحقاً أو استكشف الألعاب وجواز السفر!' : 'Check back soon or explore game modes and your passport!'}
                </p>
                <Link href="/passport" className="btn btn-secondary btn-sm mx-auto">
                  {isRtl ? 'عرض جواز السفر' : 'View Passport'}
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* PASSPORT SECTION */}
        <section className="section sakura-bg-dark relative overflow-hidden" id="passport">
          <div aria-hidden="true" className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(45deg, rgba(244,167,197,0.3) 0, rgba(244,167,197,0.3) 1px, transparent 0, transparent 50%)', backgroundSize: '24px 24px' }} />
          <div className="container-sakura relative z-10">
            <div className="max-w-4xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div>
                  <div className="inline-flex items-center gap-2 mb-4 px-3.5 py-1 rounded-full bg-pink-500/15 border border-pink-400/25">
                    <Award size={16} className="text-[var(--sakura-pink)]" aria-hidden="true" />
                    <span className="text-[var(--sakura-pink)] text-xs font-bold tracking-widest uppercase">
                      {isRtl ? 'جواز السفر' : 'Digital Passport'}
                    </span>
                  </div>
                  <h2 className="text-white text-3xl sm:text-4xl font-extrabold mb-4">
                    {isRtl ? 'جواز سفر ساكورا الرقمي' : 'Sakura Passport Booklet'}
                  </h2>
                  <p className="text-pink-100/75 mb-8 leading-relaxed text-sm sm:text-base">
                    {isRtl
                      ? 'اجمع الأختام التذكارية في كل فعالية تحضرها. أكمل التحديات، فز بالألعاب الحية، وابنِ مجموعتك التذكارية طوال الفصول الدراسية.'
                      : 'Collect unique commemorative stamps at every club event you attend. Complete challenges, win games, and build your digital anime collection across semesters.'}
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <Link href="/passport" className="btn btn-primary" id="passport-signup-cta">
                      {isRtl ? 'تصفح جواز سفرك' : 'Open My Passport'}
                    </Link>
                    <Link href="/events" className="btn btn-secondary">
                      {isRtl ? 'الفعاليات والأختام' : 'Event Check-in'}
                    </Link>
                  </div>
                </div>

                {/* Passport preview card */}
                <div className="relative">
                  <div className="passport-cover p-8 rounded-3xl shadow-2xl border border-pink-400/30">
                    <div className="flex items-center gap-3 mb-6">
                      <Cherry size={30} className="text-[var(--sakura-pink)]" />
                      <div>
                        <div className="text-white font-extrabold text-lg">Sakura Passport</div>
                        <div className="text-pink-200/70 text-xs">جواز سفر نادي ساكورا الرسمي</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-3 mb-6">
                      {['🌸', '⚔️', '🎭', '📺', '🎨', '📚', '🏆', '✨'].map((emoji, i) => (
                        <div
                          key={i}
                          className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-all ${i < 5
                              ? 'bg-[rgba(244,167,197,0.2)] border-2 border-[var(--sakura-pink)] shadow-[0_0_12px_rgba(244,167,197,0.3)]'
                              : 'bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] opacity-40'
                            }`}
                          aria-label={i < 5 ? 'Earned stamp' : 'Locked stamp'}
                        >
                          {i < 5 ? emoji : '🔒'}
                        </div>
                      ))}
                    </div>
                    <div className="text-pink-200/80 text-xs font-semibold text-center py-2 px-3 rounded-xl bg-black/30 border border-pink-500/20">
                      {isRtl ? '✨ تم تجميع 5 من 8 أختام' : '✨ 5 of 8 stamps collected'}
                    </div>
                  </div>
                  <div aria-hidden="true" className="absolute -inset-4 rounded-3xl blur-3xl opacity-20 -z-10" style={{ background: 'linear-gradient(135deg, var(--deep-sakura), var(--sakura-pink))' }} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ABOUT SECTION */}
        <section className="section bg-gradient-to-b from-[#200f2e] to-[#180C22] border-t border-pink-500/10" id="about">
          <div className="container-sakura">
            <div className="max-w-2xl mx-auto text-center card p-8 sm:p-12 shadow-2xl bg-[rgba(36,21,47,0.8)] border-pink-400/20">
              <div className="text-5xl mb-5">🌸</div>
              <h2 className="text-white text-3xl sm:text-4xl font-extrabold mb-4">
                {isRtl ? 'عن نادي ساكورا' : 'About Sakura Club'}
              </h2>
              <p className="text-pink-100/75 leading-relaxed text-sm sm:text-base mb-8">
                {isRtl
                  ? 'ساكورا هي المنصة الرقمية الرسمية لنادي الثقافة اليابانية والأنمي الجامعي. نحتفي بالأنمي، اللغة اليابانية، ذكريات سبيستون الخالدة، والمجتمع الطلابي المبدع الذي يجمعنا.'
                  : 'Sakura is the official digital platform for our university Japanese culture and anime club. We celebrate anime, Japanese language, timeless Spacetoon nostalgia, and the vibrant campus community that connects us.'}
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link href="/events" className="btn btn-primary" id="about-events-cta">
                  {isRtl ? 'انضم إلى فعالياتنا' : 'Join Our Events'}
                </Link>
                <Link href="/join" className="btn btn-secondary">
                  {isRtl ? 'جرّب لعبة الآن' : 'Try a Game'}
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer locale={locale} />
    </>
  )
}
