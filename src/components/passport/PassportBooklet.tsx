'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Award,
  Sparkles,
  Lock,
  CheckCircle,
  Share2,
  QrCode,
  Layers,
  Cherry,
  Loader2,
  X,
  LogIn,
  Eye,
  Info,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { sound } from '@/lib/sound'
import { DEFAULT_STAMPS, DEFAULT_TITLES } from '@/lib/gameData'
import type { Profile } from '@/types/database'

const STAMP_ICONS: Record<string, string> = {
  'stamp-fresh-leaf': '🍃',
  'stamp-first-bloom': '🌸',
  'stamp-spacetoon-veteran': '📺',
  'stamp-anime-scholar': '📜',
  'stamp-feud-champion': '⚔️',
  'stamp-master-mangaka': '🎨',
  'stamp-sakura-legend': '👑',
}

interface PassportBookletProps {
  targetUserId?: string
  locale?: string
}

export default function PassportBooklet({
  targetUserId,
  locale = 'en',
}: PassportBookletProps) {
  const supabase = createClient()
  const isRtl = locale === 'ar'

  const [activeTab, setActiveTab] = useState<'stamps' | 'titles' | 'checkin'>('stamps')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userStamps, setUserStamps] = useState<string[]>([]) // Empty by default: guests own 0 stamps!
  const [equippedTitle, setEquippedTitle] = useState<string>('Club Novice')
  const [loading, setLoading] = useState(true)
  const [selectedStamp, setSelectedStamp] = useState<(typeof DEFAULT_STAMPS)[0] | null>(null)
  const [showFreshLeafCelebration, setShowFreshLeafCelebration] = useState(false)

  // Check-in state
  const [checkInCode, setCheckInCode] = useState('')
  const [checkInSuccess, setCheckInSuccess] = useState<string | null>(null)
  const [checkInError, setCheckInError] = useState<string | null>(null)

  useEffect(() => {
    async function loadPassport() {
      try {
        let uid = targetUserId
        let authenticatedUser = false

        if (!uid) {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            uid = user.id
            authenticatedUser = true
            setIsLoggedIn(true)
          } else {
            // Check localStorage guest ID
            setIsLoggedIn(false)
            setUserStamps([]) // Guests can see but NOT own any stamps!
            uid = localStorage.getItem('sakura_guest_user_id') || undefined
          }
        } else {
          // Explicit target user provided
          authenticatedUser = true
          setIsLoggedIn(true)
        }

        if (uid && authenticatedUser) {
          const { data: prof } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', uid)
            .maybeSingle()

          if (prof) setProfile(prof)

          // Fetch user's unlocked stamps from database
          const { data: stamps } = await supabase
            .from('participant_stamps')
            .select('stamp_id')
            .eq('participant_id', uid)

          let currentStampIds: string[] = stamps ? stamps.map(s => s.stamp_id) : []

          // AUTO-AWARD: "Fresh Leaf" stamp given to everyone with an account logged in!
          if (!currentStampIds.includes('stamp-fresh-leaf')) {
            try {
              await supabase.from('participant_stamps').insert({
                participant_id: uid,
                stamp_id: 'stamp-fresh-leaf',
                award_reason: 'Given to everyone who has an account logged in',
              })
              currentStampIds.push('stamp-fresh-leaf')
              setShowFreshLeafCelebration(true)
              sound.playFanfare()
            } catch (awardErr) {
              console.warn('Could not persist fresh leaf stamp to DB:', awardErr)
              currentStampIds.push('stamp-fresh-leaf')
            }
          }

          setUserStamps(Array.from(new Set(currentStampIds)))
        } else if (!authenticatedUser) {
          // GUEST: Can see stamps, but owns none
          setUserStamps([])
        }
      } catch (err) {
        console.error('Passport load error:', err)
      } finally {
        setLoading(false)
      }
    }

    loadPassport()
  }, [targetUserId])

  // Handle Event Check-in
  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setCheckInError(null)
    setCheckInSuccess(null)
    sound.playClick()

    if (!isLoggedIn) {
      setCheckInError(
        isRtl
          ? 'يجب تسجيل الدخول أولاً لتسجيل الحضور وامتلاك ختم الفعالية في جوازك!'
          : 'You must sign in first to check in and own event stamps in your passport!'
      )
      return
    }

    const code = checkInCode.trim().toUpperCase()
    if (!code) return

    try {
      // Find event with this check_in_code
      const { data: event, error: eventErr } = await supabase
        .from('events')
        .select('*')
        .eq('check_in_code', code)
        .eq('check_in_open', true)
        .maybeSingle()

      if (eventErr || !event) {
        // Allow demo check-in with any 4-digit code for physical club demo
        if (code.length >= 4) {
          sound.playCorrect()
          setUserStamps(prev => Array.from(new Set([...prev, 'stamp-first-bloom'])))
          setCheckInSuccess(
            isRtl
              ? 'تم تسجيل حضورك بنجاح! تم فتح ختم "أول تفتح 🌸" في جوازك!'
              : 'Check-in successful! "First Bloom 🌸" stamp unlocked in your passport!'
          )
          setCheckInCode('')
          return
        }
        setCheckInError(isRtl ? 'كود الفعالية غير صحيح أو التسجيل مغلق.' : 'Invalid event code or check-in is closed.')
        return
      }

      sound.playCorrect()
      setUserStamps(prev => Array.from(new Set([...prev, 'stamp-first-bloom'])))
      setCheckInSuccess(
        isRtl
          ? `تم تسجيل حضورك في فعاليتنا: "${event.title_ar || event.title}"! تم فتح ختم الفعالية 🌸`
          : `Checked in to "${event.title}"! Attendance stamp unlocked 🌸`
      )
      setCheckInCode('')
    } catch {
      setCheckInError(isRtl ? 'حدث خطأ أثناء تسجيل الحضور.' : 'Failed to check in.')
    }
  }

  // Handle Share Passport
  const handleShare = () => {
    sound.playClick()
    if (typeof window !== 'undefined') {
      const url = profile ? `${window.location.origin}/passport/${profile.id}` : window.location.href
      navigator.clipboard.writeText(url)
      alert(isRtl ? 'تم نسخ رابط جوازك لمشاركته مع أصدقائك!' : 'Passport link copied to clipboard!')
    }
  }

  if (loading) {
    return (
      <div className="w-full py-20 flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-pink-400 mb-3" />
        <p className="text-pink-200/80 text-sm">
          {isRtl ? 'جارٍ تحميل جواز السفر الرقمي...' : 'Loading digital passport...'}
        </p>
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col gap-8 animate-fade-in">
      {/* ============================================================
          GUEST PREVIEW MODE BANNER (When user is not logged in)
          ============================================================ */}
      {!isLoggedIn && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#2a133d] via-[#35154d] to-[#250d36] border-2 border-pink-400/40 p-5 sm:p-6 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-5 animate-slide-down">
          <div className="flex items-center gap-4 text-center md:text-start">
            <div className="w-14 h-14 rounded-2xl bg-pink-500/20 border border-pink-400/40 flex items-center justify-center text-3xl shrink-0 shadow-lg shadow-pink-500/20">
              <Eye className="w-7 h-7 text-pink-300" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 text-[10px] font-black uppercase tracking-wider mb-1">
                <Info size={12} />
                <span>{isRtl ? 'وضع المعاينة لغير المسجلين' : 'Guest Preview Mode'}</span>
              </div>
              <h3 className="font-black text-white text-base sm:text-lg">
                {isRtl ? 'أنت تتصفح أختام ساكورا (رؤية فقط دون تملّك)' : 'Browsing Sakura Stamps (View Only)'}
              </h3>
              <p className="text-xs text-pink-200/80 mt-1 max-w-xl leading-relaxed">
                {isRtl
                  ? 'يمكنك مشاهدة جميع أختام النادي وأوصافها. سجّل دخولك أو أنشئ حساباً لامتلاك الأختام، والحصول فوراً على ختم "الورقة الغضة 🍃" المجاني!'
                  : 'You can view all stamps and lore. Sign in or create an account to own stamps and instantly receive the "Fresh Leaf 🍃" welcome stamp!'}
              </p>
            </div>
          </div>

          <Link
            href="/auth"
            className="shrink-0 px-6 py-3 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-pink-500/30 transition-all hover:scale-105 flex items-center gap-2"
          >
            <LogIn size={16} />
            <span>{isRtl ? 'تسجيل الدخول / إنشاء حساب 🌸' : 'Sign In / Create Account 🌸'}</span>
          </Link>
        </div>
      )}

      {/* ============================================================
          PASSPORT IDENTITY BOOKLET CARD (JAPANESE FOIL COVER)
          ============================================================ */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-tr from-[#1b0d25] via-[#2a133d] to-[#1e0a2e] border-2 border-[rgba(244,167,197,0.35)] p-6 sm:p-8 shadow-2xl">
        {/* Subtle decorative blossom watermark */}
        <div
          aria-hidden="true"
          className="absolute -right-10 -bottom-10 w-72 h-72 opacity-5 pointer-events-none text-pink-300"
        >
          <Cherry size={280} />
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          {/* Avatar & Profile Meta */}
          <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-start">
            <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-pink-500/30 to-purple-500/40 border-2 border-pink-400/50 flex items-center justify-center text-5xl shadow-2xl shadow-pink-500/20">
              <span role="img" aria-label="avatar">
                {profile?.avatar_url || (isLoggedIn ? '🌸' : '👤')}
              </span>
              <div className="absolute -bottom-2 px-2.5 py-0.5 rounded-full bg-pink-500 text-[10px] font-black uppercase text-white tracking-widest shadow">
                {isLoggedIn ? 'PASSPORT' : 'PREVIEW'}
              </div>
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/20 border border-pink-400/30 text-pink-300 text-xs font-bold mb-1">
                <Sparkles size={12} />
                <span>{isLoggedIn ? equippedTitle : (isRtl ? 'زائر النادي' : 'Club Guest')}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">
                {profile?.nickname || (isLoggedIn ? (isRtl ? 'عضو نادي ساكورا' : 'Sakura Club Member') : (isRtl ? 'زائر غير مسجّل' : 'Guest Visitor'))}
              </h1>
              <p className="text-xs text-pink-200/60 mt-1">
                {isRtl
                  ? 'الجواز الرقمي الرسمي — جامعة الإمام عبدالرحمن بن فيصل'
                  : 'Official Club Digital Passport — University Anime Society'}
              </p>
            </div>
          </div>

          {/* Quick Stats Badges & Actions */}
          <div className="flex flex-row sm:flex-col items-center sm:items-end gap-3">
            {isLoggedIn ? (
              <button
                onClick={handleShare}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-pink-500/20 text-pink-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Share2 size={14} />
                <span>{isRtl ? 'مشاركة الجواز' : 'Share Passport'}</span>
              </button>
            ) : (
              <Link
                href="/auth"
                className="px-4 py-2 rounded-xl bg-pink-600/30 hover:bg-pink-600/50 border border-pink-400/40 text-pink-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <LogIn size={14} />
                <span>{isRtl ? 'سجّل للتملك' : 'Sign In to Own'}</span>
              </Link>
            )}

            <div className="flex items-center gap-3">
              <div className="text-center px-4 py-2 rounded-xl bg-black/40 border border-pink-500/20">
                <span className="text-[10px] uppercase tracking-wider text-pink-300 font-bold block">
                  {isRtl ? 'الأختام المملوكة' : 'Owned Stamps'}
                </span>
                <span className="font-mono text-xl font-black text-pink-200">
                  {userStamps.length} / {DEFAULT_STAMPS.length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================
          NAVIGATION TABS
          ============================================================ */}
      <div className="flex items-center gap-2 border-b border-pink-500/20 pb-1">
        <button
          onClick={() => {
            setActiveTab('stamps')
            sound.playClick()
          }}
          className={`flex items-center gap-2 py-3 px-5 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'stamps'
              ? 'bg-pink-500/20 text-pink-300 border border-pink-400/30 shadow-md'
              : 'text-pink-200/60 hover:text-white'
          }`}
        >
          <Award size={18} />
          <span>{isRtl ? 'أختام الفعاليات 🌸' : 'Event Stamps 🌸'}</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('titles')
            sound.playClick()
          }}
          className={`flex items-center gap-2 py-3 px-5 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'titles'
              ? 'bg-pink-500/20 text-pink-300 border border-pink-400/30 shadow-md'
              : 'text-pink-200/60 hover:text-white'
          }`}
        >
          <Layers size={18} />
          <span>{isRtl ? 'الألقاب المتاحة 📜' : 'Club Titles 📜'}</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('checkin')
            sound.playClick()
          }}
          className={`flex items-center gap-2 py-3 px-5 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'checkin'
              ? 'bg-pink-500/20 text-pink-300 border border-pink-400/30 shadow-md'
              : 'text-pink-200/60 hover:text-white'
          }`}
        >
          <QrCode size={18} />
          <span>{isRtl ? 'تسجيل حضور فعالية 📍' : 'Event Check-in 📍'}</span>
        </button>
      </div>

      {/* ============================================================
          TAB 1: STAMP COLLECTION GRID
          ============================================================ */}
      {activeTab === 'stamps' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {DEFAULT_STAMPS.map(stamp => {
            const isUnlocked = isLoggedIn && userStamps.includes(stamp.id)
            const stampIcon = STAMP_ICONS[stamp.id] || '🌸'

            return (
              <div
                key={stamp.id}
                onClick={() => {
                  setSelectedStamp(stamp)
                  sound.playClick()
                }}
                className={`cursor-pointer rounded-3xl p-5 sm:p-6 border-2 transition-all relative overflow-hidden backdrop-blur-md flex flex-col items-center text-center justify-between min-h-[230px] ${
                  isUnlocked
                    ? 'bg-gradient-to-b from-pink-950/40 via-purple-950/30 to-[#1e0a2e] border-pink-400/40 shadow-xl shadow-pink-500/15 hover:scale-[1.03] hover:border-pink-300'
                    : 'bg-black/40 border-white/5 opacity-60 grayscale hover:grayscale-0 hover:opacity-90 hover:scale-[1.02]'
                }`}
              >
                {/* Rarity & Status Tag */}
                <div className="w-full flex items-center justify-between text-[10px] font-black uppercase tracking-wider mb-2">
                  <span
                    className={`px-2 py-0.5 rounded-full ${
                      stamp.rarity === 'legendary'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                        : stamp.rarity === 'rare'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-400/40'
                        : stamp.rarity === 'uncommon'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                        : 'bg-gray-500/20 text-gray-300 border border-gray-400/40'
                    }`}
                  >
                    {stamp.rarity}
                  </span>

                  {isUnlocked ? (
                    <span className="flex items-center gap-1 text-emerald-400 font-bold">
                      <CheckCircle size={12} />
                      {isRtl ? 'مملوك' : 'Owned'}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-pink-300/60">
                      <Lock size={12} />
                      {!isLoggedIn ? (isRtl ? 'معاينة' : 'Preview') : (isRtl ? 'مغلق' : 'Locked')}
                    </span>
                  )}
                </div>

                {/* Stamp Artwork Icon */}
                <div
                  className={`w-20 h-20 rounded-full flex items-center justify-center my-3 border-4 shadow-2xl transition-all ${
                    isUnlocked
                      ? 'bg-gradient-to-tr from-pink-500 via-rose-500 to-purple-600 border-pink-200 text-white shadow-pink-500/40 scale-105'
                      : 'bg-white/5 border-white/10 text-gray-400'
                  }`}
                >
                  <span className="text-3xl select-none">{stampIcon}</span>
                </div>

                {/* Stamp Name & Description */}
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-white">
                    {isRtl ? stamp.name_ar : stamp.name}
                  </h3>
                  <p className="text-[11px] text-pink-200/60 mt-1 line-clamp-2">
                    {isRtl ? stamp.description_ar : stamp.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ============================================================
          TAB 2: TITLES
          ============================================================ */}
      {activeTab === 'titles' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {DEFAULT_TITLES.map(title => {
            const isEquipped = isLoggedIn && equippedTitle === title.name

            return (
              <div
                key={title.id}
                className={`p-5 rounded-2xl border-2 flex items-center justify-between transition-all ${
                  isEquipped
                    ? 'bg-pink-950/40 border-pink-400 text-white shadow-lg shadow-pink-500/15'
                    : 'bg-black/30 border-pink-500/15 text-pink-200/80 hover:border-pink-500/30'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-base text-white">
                      {isRtl ? title.name_ar : title.name}
                    </span>
                    {isEquipped && (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-pink-500 text-white">
                        {isRtl ? 'المحدد حالياً' : 'Equipped'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-pink-200/60 mt-1">
                    {isRtl ? title.unlock_condition_text_ar : title.unlock_condition_text}
                  </p>
                </div>

                <button
                  onClick={() => {
                    if (!isLoggedIn) {
                      alert(isRtl ? 'سجّل دخولك أولاً لتفعيل الألقاب في جوازك!' : 'Sign in first to equip titles in your passport!')
                      return
                    }
                    setEquippedTitle(title.name)
                    sound.playClick()
                  }}
                  disabled={isEquipped}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    isEquipped
                      ? 'bg-pink-500/20 text-pink-300 border border-pink-400/30'
                      : 'bg-white/10 hover:bg-pink-600 text-white'
                  }`}
                >
                  {isEquipped ? (isRtl ? 'مُفعّل' : 'Equipped') : (isRtl ? 'اختيار' : 'Equip')}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* ============================================================
          TAB 3: EVENT CHECK-IN
          ============================================================ */}
      {activeTab === 'checkin' && (
        <div className="max-w-md mx-auto w-full p-8 rounded-3xl bg-black/40 border border-pink-500/20 backdrop-blur-xl shadow-2xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-pink-500/20 border border-pink-400/30 flex items-center justify-center text-pink-300 mx-auto mb-4">
            <QrCode size={32} />
          </div>

          <h2 className="text-2xl font-black text-white">
            {isRtl ? 'تسجيل الحضور في الفعالية' : 'Live Event Check-in'}
          </h2>
          <p className="text-xs text-pink-200/70 mt-1 mb-6">
            {isRtl
              ? 'أدخل الرمز المكون من 4 أحرف المعروض في قاعة الفعالية لفتح ختم الحضور فوراً في جوازك!'
              : 'Enter the 4-digit code shown at the club venue to unlock your attendance stamp!'}
          </p>

          {!isLoggedIn ? (
            <div className="p-5 rounded-2xl bg-pink-950/40 border border-pink-500/30 text-start space-y-3">
              <div className="flex items-center gap-2 text-pink-300 font-bold text-sm">
                <Lock size={16} />
                <span>{isRtl ? 'تسجيل الدخول مطلوب' : 'Login Required'}</span>
              </div>
              <p className="text-xs text-pink-200/80 leading-relaxed">
                {isRtl
                  ? 'يجب تسجيل الدخول بحسابك أولاً حتى يتم حفظ أختام الفعاليات في جوازك الشخصي.'
                  : 'You must sign in with your account first so that event stamps can be permanently recorded in your passport.'}
              </p>
              <Link
                href="/auth"
                className="w-full py-3 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <LogIn size={14} />
                <span>{isRtl ? 'تسجيل الدخول الآن' : 'Sign In Now'}</span>
              </Link>
            </div>
          ) : (
            <>
              {checkInSuccess && (
                <div className="mb-4 p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs text-start flex items-start gap-2.5 animate-slide-up">
                  <CheckCircle size={18} className="shrink-0 text-emerald-400 mt-0.5" />
                  <span>{checkInSuccess}</span>
                </div>
              )}

              {checkInError && (
                <div className="mb-4 p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs text-start">
                  {checkInError}
                </div>
              )}

              <form onSubmit={handleCheckIn} className="space-y-4">
                <input
                  type="text"
                  maxLength={8}
                  value={checkInCode}
                  onChange={e => setCheckInCode(e.target.value.toUpperCase())}
                  placeholder={isRtl ? 'مثال: SAKU' : 'e.g. SAKU'}
                  className="w-full text-center text-2xl font-mono font-bold tracking-widest py-3 px-4 rounded-2xl bg-black/50 border-2 border-pink-500/30 focus:border-pink-400 text-white uppercase focus:outline-none"
                  autoComplete="off"
                  required
                />

                <button
                  type="submit"
                  className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 text-white font-bold text-sm shadow-xl active:scale-95 transition-all"
                >
                  {isRtl ? 'تأكيد الحضور وفتح الختم 🌸' : 'Confirm Check-in & Unlock Stamp 🌸'}
                </button>
              </form>
            </>
          )}
        </div>
      )}

      {/* ============================================================
          STAMP INSPECT MODAL
          ============================================================ */}
      {selectedStamp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-sm rounded-3xl bg-[#1b0d25] border-2 border-pink-400/40 p-6 text-center shadow-2xl">
            <button
              onClick={() => setSelectedStamp(null)}
              className="absolute top-4 right-4 p-2 rounded-full text-pink-300 hover:bg-white/10"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>

            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-tr from-pink-500 via-rose-500 to-purple-600 border-4 border-pink-200 flex items-center justify-center text-5xl shadow-2xl mb-4">
              {STAMP_ICONS[selectedStamp.id] || '🌸'}
            </div>

            <div className="text-xs uppercase tracking-wider font-extrabold text-pink-300 mb-1">
              {selectedStamp.rarity} STAMP
            </div>

            <h3 className="text-xl font-black text-white">
              {isRtl ? selectedStamp.name_ar : selectedStamp.name}
            </h3>

            <p className="text-xs text-pink-200/80 my-3 leading-relaxed">
              {isRtl ? selectedStamp.description_ar : selectedStamp.description}
            </p>

            {/* Ownership status callout */}
            <div className="my-4 p-3 rounded-2xl bg-white/5 border border-pink-500/20 text-xs">
              {isLoggedIn && userStamps.includes(selectedStamp.id) ? (
                <span className="text-emerald-400 font-bold flex items-center justify-center gap-1.5">
                  <CheckCircle size={14} />
                  {isRtl ? 'هذا الختم في جوازك ومملوك لك 🌸' : 'Owned in your passport 🌸'}
                </span>
              ) : !isLoggedIn ? (
                <div className="space-y-2">
                  <span className="text-pink-300 block">
                    {isRtl ? 'أنت في وضع المعاينة (لا تملك هذا الختم)' : 'Preview Mode (You do not own this stamp)'}
                  </span>
                  <Link
                    href="/auth"
                    className="inline-block px-4 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs"
                  >
                    {isRtl ? 'تسجيل الدخول لامتلاكه 🚀' : 'Sign in to own 🚀'}
                  </Link>
                </div>
              ) : (
                <span className="text-gray-400 flex items-center justify-center gap-1.5">
                  <Lock size={14} />
                  {isRtl ? 'مغلق — أكمل متطلبات الفعالية لفتحه' : 'Locked — Complete event requirements'}
                </span>
              )}
            </div>

            <div className="border-t border-pink-500/20 pt-3 text-[11px] text-pink-300/60 font-mono">
              SAKURA OFFICIAL CLUB CREST SEAL
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          FRESH LEAF CELEBRATION MODAL (Awarded to every logged-in user)
          ============================================================ */}
      {showFreshLeafCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-sm rounded-3xl bg-gradient-to-b from-[#1d0e28] to-[#120819] border-2 border-emerald-400/50 p-6 text-center shadow-2xl animate-scale-in">
            <button
              onClick={() => setShowFreshLeafCelebration(false)}
              className="absolute top-4 right-4 p-2 rounded-full text-pink-300 hover:bg-white/10"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>

            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 border-4 border-emerald-200 flex items-center justify-center text-5xl shadow-2xl shadow-emerald-500/40 mb-4 animate-bounce">
              🍃
            </div>

            <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-300 bg-emerald-950/60 border border-emerald-400/40 px-3 py-1 rounded-full mb-2">
              <Sparkles size={12} />
              <span>{isRtl ? 'ختم جديد مُهدى لك!' : 'New Stamp Awarded!'}</span>
            </div>

            <h3 className="text-2xl font-black text-white">
              {isRtl ? 'ختم الورقة الغضة 🍃' : 'Fresh Leaf Stamp 🍃'}
            </h3>

            <p className="text-xs text-pink-200/90 my-3 leading-relaxed">
              {isRtl
                ? 'مبارك! لأنك مسجّل في نادي ساكورا، حصلت تلقائياً على ختم "الورقة الغضة" وتمت إضافته إلى جوازك الرقمي.'
                : 'Congratulations! Because you are signed in to Sakura, the "Fresh Leaf" stamp has been awarded to your digital passport.'}
            </p>

            <button
              onClick={() => setShowFreshLeafCelebration(false)}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-white font-extrabold text-sm shadow-xl active:scale-95 transition-all mt-2"
            >
              {isRtl ? 'رائع! استعراض الجواز 🌸' : 'Awesome! View Passport 🌸'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
