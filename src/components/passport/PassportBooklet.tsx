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
  Calendar,
  Layers,
  Cherry,
  Loader2,
  X,
  ExternalLink,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { sound } from '@/lib/sound'
import { DEFAULT_STAMPS, DEFAULT_TITLES } from '@/lib/gameData'
import type { Profile, PassportStamp } from '@/types/database'

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
  const [userStamps, setUserStamps] = useState<string[]>([
    'stamp-first-bloom',
    'stamp-spacetoon-veteran',
  ]) // default demo unlocked
  const [equippedTitle, setEquippedTitle] = useState<string>('Club Novice')
  const [loading, setLoading] = useState(true)
  const [selectedStamp, setSelectedStamp] = useState<(typeof DEFAULT_STAMPS)[0] | null>(null)

  // Check-in state
  const [checkInCode, setCheckInCode] = useState('')
  const [checkInSuccess, setCheckInSuccess] = useState<string | null>(null)
  const [checkInError, setCheckInError] = useState<string | null>(null)

  useEffect(() => {
    async function loadPassport() {
      try {
        let uid = targetUserId

        if (!uid) {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            uid = user.id
          } else {
            // Check localStorage guest ID
            uid = localStorage.getItem('sakura_guest_user_id') || undefined
          }
        }

        if (uid) {
          const { data: prof } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', uid)
            .maybeSingle()

          if (prof) setProfile(prof)

          // Fetch user's unlocked stamps
          const { data: stamps } = await supabase
            .from('participant_stamps')
            .select('stamp_id')
            .eq('participant_id', uid)

          if (stamps && stamps.length > 0) {
            setUserStamps(prev => Array.from(new Set([...prev, ...stamps.map(s => s.stamp_id)])))
          }
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

  return (
    <div className="w-full flex flex-col gap-8 animate-fade-in">
      {/* ============================================================
          PASSPORT IDENTITY BOOKLET CARD (JAPANESE FOIL COVER)
          ============================================================ */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-tr from-[#1b0d25] via-[#2a133d] to-[#1e0a2e] border-2 border-[rgba(244,167,197,0.3)] p-6 sm:p-8 shadow-2xl">
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
                {profile?.avatar_url || '🌸'}
              </span>
              <div className="absolute -bottom-2 px-2 py-0.5 rounded-full bg-pink-500 text-[10px] font-black uppercase text-white tracking-widest shadow">
                PASSPORT
              </div>
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/20 border border-pink-400/30 text-pink-300 text-xs font-bold mb-1">
                <Sparkles size={12} />
                <span>{equippedTitle}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">
                {profile?.nickname || (isRtl ? 'عضو نادي ساكورا' : 'Sakura Club Member')}
              </h1>
              <p className="text-xs text-pink-200/60 mt-1">
                {isRtl
                  ? 'الجواز الرقمي الرسمي — جامعة الإمام عبدالرحمن بن فيصل'
                  : 'Official Club Digital Passport — University Anime Society'}
              </p>
            </div>
          </div>

          {/* Quick Stats Badges & Share */}
          <div className="flex flex-row sm:flex-col items-center sm:items-end gap-3">
            <button
              onClick={handleShare}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-pink-500/20 text-pink-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Share2 size={14} />
              <span>{isRtl ? 'مشاركة الجواز' : 'Share Passport'}</span>
            </button>

            <div className="flex items-center gap-3">
              <div className="text-center px-4 py-2 rounded-xl bg-black/40 border border-pink-500/20">
                <span className="text-[10px] uppercase tracking-wider text-pink-300 font-bold block">
                  {isRtl ? 'الأختام' : 'Stamps'}
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 gap-4 sm:gap-6">
          {DEFAULT_STAMPS.map(stamp => {
            const isUnlocked = userStamps.includes(stamp.id)

            return (
              <div
                key={stamp.id}
                onClick={() => {
                  setSelectedStamp(stamp)
                  sound.playClick()
                }}
                className={`cursor-pointer rounded-3xl p-5 sm:p-6 border-2 transition-all relative overflow-hidden backdrop-blur-md flex flex-col items-center text-center justify-between min-h-[220px] ${
                  isUnlocked
                    ? 'bg-gradient-to-b from-pink-950/40 via-purple-950/30 to-[#1e0a2e] border-pink-400/40 shadow-xl shadow-pink-500/10 hover:scale-[1.03] hover:border-pink-300'
                    : 'bg-black/40 border-white/5 opacity-55 grayscale hover:grayscale-0 hover:opacity-80'
                }`}
              >
                {/* Rarity Tag */}
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
                      {isRtl ? 'تم الفتح' : 'Unlocked'}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-gray-400">
                      <Lock size={12} />
                      {isRtl ? 'مغلق' : 'Locked'}
                    </span>
                  )}
                </div>

                {/* Stamp Artwork Icon */}
                <div
                  className={`w-20 h-20 rounded-full flex items-center justify-center my-3 border-4 shadow-2xl transition-all ${
                    isUnlocked
                      ? 'bg-gradient-to-tr from-pink-500 to-rose-600 border-pink-200 text-white shadow-pink-500/40'
                      : 'bg-white/5 border-white/10 text-gray-400'
                  }`}
                >
                  <span className="text-3xl">🌸</span>
                </div>

                {/* Stamp Name */}
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
            const isEquipped = equippedTitle === title.name

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

            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-tr from-pink-500 to-rose-600 border-4 border-pink-200 flex items-center justify-center text-5xl shadow-2xl mb-4">
              🌸
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

            <div className="border-t border-pink-500/20 pt-3 text-[11px] text-pink-300/60 font-mono">
              SAKURA OFFICIAL CLUB CREST SEAL
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
