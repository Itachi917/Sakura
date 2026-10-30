'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Cherry, Sparkles, Loader2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { sound } from '@/lib/sound'
import { isValidNickname } from '@/lib/utils'

const AVATAR_OPTIONS = [
  '🌸', '🦊', '🐱', '🍙', '⚔️',
  '🏮', '👺', '🍜', '🪭', '🐉',
  '🍱', '🎋', '🥋', '🎌', '🍡'
]

interface JoinGameCardProps {
  initialPin?: string
  locale?: string
}

export default function JoinGameCard({ initialPin = '', locale = 'en' }: JoinGameCardProps) {
  const router = useRouter()
  const supabase = createClient()
  const isRtl = locale === 'ar'

  const [pin, setPin] = useState(initialPin.replace(/\D/g, '').slice(0, 6))
  const [nickname, setNickname] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState('🌸')
  const [loading, setLoading] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    async function checkUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setUserId(user.id)
          const { data: profile } = await supabase
            .from('profiles')
            .select('nickname, avatar_url')
            .eq('id', user.id)
            .single()
          if (profile) {
            setNickname(profile.nickname)
            if (profile.avatar_url && AVATAR_OPTIONS.includes(profile.avatar_url)) {
              setSelectedAvatar(profile.avatar_url)
            }
          }
        }
      } catch (err) {
        console.error('Error fetching auth user:', err)
      } finally {
        setCheckingAuth(false)
      }
    }
    checkUser()
  }, [])

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    sound.playClick()

    const cleanPin = pin.trim()
    if (!cleanPin || cleanPin.length !== 6) {
      setError(isRtl ? 'الرجاء إدخال رمز غرفة مكوّن من 6 أرقام' : 'Please enter a 6-digit room PIN')
      return
    }

    const cleanNickname = nickname.trim()
    if (!cleanNickname || !isValidNickname(cleanNickname)) {
      setError(
        isRtl
          ? 'الاسم المستعار يجب أن يكون بين 2 و 32 حرفاً وبدون رموز خاصة'
          : 'Nickname must be 2-32 characters (letters, numbers, spaces, - or _)'
      )
      return
    }

    setLoading(true)

    try {
      // 1. Verify session exists and is active or in lobby
      const { data: session, error: sessionErr } = await supabase
        .from('game_sessions')
        .select('id, room_pin, activity_type, status')
        .eq('room_pin', cleanPin)
        .not('status', 'in', '("completed","cancelled")')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (sessionErr || !session) {
        setError(
          isRtl
            ? 'لم يتم العثور على غرفة نشطة بهذا الرمز. تأكد من الرمز من شاشة العرض.'
            : 'No active game session found with this PIN. Check the projector screen!'
        )
        setLoading(false)
        return
      }

      let activeUserId = userId

      // 2. If no user logged in, check local guest id or generate one
      if (!activeUserId) {
        let guestId = localStorage.getItem('sakura_guest_user_id')
        if (!guestId) {
          guestId = crypto.randomUUID()
          localStorage.setItem('sakura_guest_user_id', guestId)
        }
        activeUserId = guestId
      }

      // 3. Register or reconnect in session_participants
      // Check existing by session_id and nickname
      const { data: existingParticipant } = await supabase
        .from('session_participants')
        .select('id')
        .eq('session_id', session.id)
        .eq('nickname', cleanNickname)
        .maybeSingle()

      let participantId: string

      if (existingParticipant) {
        participantId = existingParticipant.id
        await supabase
          .from('session_participants')
          .update({
            guest_token: selectedAvatar,
            status: 'active',
            last_seen_at: new Date().toISOString(),
          })
          .eq('id', participantId)
      } else {
        const { data: newPart, error: partErr } = await supabase
          .from('session_participants')
          .insert({
            session_id: session.id,
            participant_id: userId || null,
            guest_token: selectedAvatar,
            nickname: cleanNickname,
            score: 0,
            streak: 0,
            status: 'active',
            joined_at: new Date().toISOString(),
            last_seen_at: new Date().toISOString(),
          })
          .select('id')
          .single()

        if (partErr || !newPart) {
          throw new Error(partErr?.message || 'Failed to join session')
        }
        participantId = newPart.id
      }

      // Store active session credentials in localStorage for fast re-hydration
      localStorage.setItem(
        `sakura_session_${session.id}`,
        JSON.stringify({
          sessionId: session.id,
          participantId,
          userId: activeUserId,
          nickname: cleanNickname,
          avatar: selectedAvatar,
          pin: cleanPin,
        })
      )

      sound.playCorrect()
      router.push(`/play/${session.id}`)
    } catch (err: unknown) {
      console.error('Error joining session:', err)
      setError(
        isRtl
          ? 'حدث خطأ أثناء الانضمام. يرجى المحاولة مرة أخرى.'
          : (err instanceof Error ? err.message : 'Failed to join game. Please try again.')
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md bg-[rgba(36,21,47,0.85)] backdrop-blur-xl border border-[rgba(244,167,197,0.2)] rounded-3xl p-6 sm:p-8 shadow-2xl relative">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-pink-500/20 to-purple-500/30 border border-pink-400/30 mb-3 shadow-inner">
          <span className="text-3xl select-none" role="img" aria-label="avatar">
            {selectedAvatar}
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
          {isRtl ? 'انضم إلى الفعالية' : 'Join Live Game'}
        </h1>
        <p className="text-xs sm:text-sm text-[var(--muted-lavender)] mt-1">
          {isRtl
            ? 'أدخل رمز الغرفة المكون من 6 أرقام المعروض على الشاشة'
            : 'Enter the 6-digit room PIN from the projector screen'}
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-5 p-3.5 rounded-xl bg-red-950/60 border border-red-500/30 text-red-200 text-xs sm:text-sm flex items-start gap-2.5"
        >
          <AlertCircle size={18} className="shrink-0 mt-0.5 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleJoin} className="space-y-5">
        {/* ROOM PIN INPUT */}
        <div>
          <label htmlFor="room-pin-input" className="block text-xs font-bold uppercase tracking-wider text-pink-200 mb-2">
            {isRtl ? 'رمز الغرفة (PIN)' : 'Room PIN (6 Digits)'}
          </label>
          <input
            id="room-pin-input"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={pin}
            onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="123456"
            className="w-full text-center text-3xl font-mono font-black tracking-[0.35em] py-3.5 px-4 rounded-2xl bg-black/50 border-2 border-pink-400/40 focus:border-pink-400 focus:outline-none focus:ring-4 focus:ring-pink-500/25 text-white placeholder:text-pink-300/25 transition-all shadow-inner"
            autoComplete="off"
            required
          />
        </div>

        {/* NICKNAME INPUT */}
        <div>
          <label htmlFor="nickname-input" className="block text-xs font-bold uppercase tracking-wider text-pink-200 mb-2">
            {isRtl ? 'اسمك المستعار في اللعبة' : 'Your In-Game Nickname'}
          </label>
          <input
            id="nickname-input"
            type="text"
            maxLength={32}
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            placeholder={isRtl ? 'مثال: رورونوا زورو' : 'e.g. Roronoa Zoro'}
            className="w-full py-3 px-4 rounded-xl bg-black/50 border border-pink-400/30 focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-500/25 text-white placeholder:text-pink-300/25 text-sm transition-all"
            required
          />
        </div>

        {/* AVATAR SELECTOR */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-pink-200 mb-2">
            {isRtl ? 'اختر رمزك التعبيري' : 'Choose Your Avatar'}
          </label>
          <div className="grid grid-cols-5 gap-2 p-2.5 bg-black/40 rounded-2xl border border-pink-400/20">
            {AVATAR_OPTIONS.map(emoji => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  setSelectedAvatar(emoji)
                  sound.playClick()
                }}
                className={`aspect-square w-full flex items-center justify-center text-2xl rounded-xl transition-all ${
                  selectedAvatar === emoji
                    ? 'bg-gradient-to-br from-pink-500 to-rose-600 scale-105 shadow-lg shadow-pink-500/40 ring-2 ring-white/60'
                    : 'bg-white/5 hover:bg-white/10 active:scale-95'
                }`}
                aria-label={`Select avatar ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* SUBMIT BUTTON */}
        <button
          type="submit"
          disabled={loading || checkingAuth}
          className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 hover:from-pink-400 hover:via-rose-400 hover:to-purple-500 text-white font-extrabold text-base shadow-xl shadow-pink-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none mt-4 cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>{isRtl ? 'جارٍ الانضمام...' : 'Joining Room...'}</span>
            </>
          ) : (
            <>
              <Sparkles size={18} />
              <span>{isRtl ? 'دخول اللعبة 🌸' : 'Enter Game 🌸'}</span>
            </>
          )}
        </button>
      </form>
    </div>
  )
}
