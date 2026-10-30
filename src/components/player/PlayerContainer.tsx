'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Cherry, Sparkles, Trophy, Loader2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { sound } from '@/lib/sound'
import type { GameSession, SessionParticipant } from '@/types/database'
import PlayerQuizView from './PlayerQuizView'
import PlayerFeudView from './PlayerFeudView'
import PlayerDrawView from './PlayerDrawView'
import PlayerZoomGuessView from './PlayerZoomGuessView'
import {
  WHOS_THAT_CHARACTER_QUESTIONS,
  SPACETOON_NOSTALGIA_QUESTIONS,
  ANIME_EXPERT_EXAM_QUESTIONS,
  ZOOM_GUESS_QUESTIONS,
  type QuizQuestionData,
  type ZoomGuessQuestionData,
} from '@/lib/gameData'
import { getParticipantAvatar } from '@/lib/gameHelpers'

interface PlayerContainerProps {
  sessionId: string
  locale?: string
}

export default function PlayerContainer({ sessionId, locale = 'en' }: PlayerContainerProps) {
  const router = useRouter()
  const supabase = createClient()
  const isRtl = locale === 'ar'

  const [session, setSession] = useState<GameSession | null>(null)
  const [participant, setParticipant] = useState<SessionParticipant | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestionData[]>([])
  const [zoomQuestions, setZoomQuestions] = useState<ZoomGuessQuestionData[]>(ZOOM_GUESS_QUESTIONS)

  useEffect(() => {
    async function initPlayer() {
      try {
        // 1. Fetch Game Session
        const { data: sessData, error: sessErr } = await supabase
          .from('game_sessions')
          .select('*')
          .eq('id', sessionId)
          .single()

        if (sessErr || !sessData) {
          setError(
            isRtl
              ? 'الجلسة غير موجودة أو انتهت بالفعل.'
              : 'Game session not found or has ended.'
          )
          setLoading(false)
          return
        }

        setSession(sessData)

        // Select questions
        const isZoomGame = sessData.activity_type === 'zoom_guess' || (sessData.settings as any)?.game_mode === 'zoom_guess'
        if (isZoomGame) {
          const customQs = (sessData.settings as any)?.zoom_questions
          if (Array.isArray(customQs) && customQs.length > 0) {
            setZoomQuestions(customQs)
          } else {
            try {
              const localSaved = localStorage.getItem('sakura_zoom_guess_questions')
              if (localSaved) {
                const parsed = JSON.parse(localSaved)
                if (Array.isArray(parsed) && parsed.length > 0) {
                  setZoomQuestions(parsed)
                } else {
                  setZoomQuestions(ZOOM_GUESS_QUESTIONS)
                }
              } else {
                setZoomQuestions(ZOOM_GUESS_QUESTIONS)
              }
            } catch {
              setZoomQuestions(ZOOM_GUESS_QUESTIONS)
            }
          }
        } else if (sessData.activity_type === 'whos_that_character') {
          setQuizQuestions(WHOS_THAT_CHARACTER_QUESTIONS)
        } else if (sessData.activity_type === 'spacetoon_nostalgia') {
          setQuizQuestions(SPACETOON_NOSTALGIA_QUESTIONS)
        } else if (sessData.activity_type === 'anime_expert_exam') {
          setQuizQuestions(ANIME_EXPERT_EXAM_QUESTIONS)
        }

        // 2. Identify Current Participant
        // Check local storage or auth
        let localData = null
        try {
          const item = localStorage.getItem(`sakura_session_${sessionId}`)
          if (item) localData = JSON.parse(item)
        } catch {}

        let participantRecord: SessionParticipant | null = null

        if (localData?.participantId) {
          const { data: part } = await supabase
            .from('session_participants')
            .select('*')
            .eq('id', localData.participantId)
            .single()
          if (part) participantRecord = part
        }

        if (!participantRecord) {
          // Check if current user is signed in
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const { data: part } = await supabase
              .from('session_participants')
              .select('*')
              .eq('session_id', sessionId)
              .eq('participant_id', user.id)
              .maybeSingle()
            if (part) participantRecord = part
          }
        }

        if (!participantRecord) {
          // Not registered in this room yet — redirect to /join?pin=
          router.replace(`/join?pin=${sessData.room_pin}`)
          return
        }

        setParticipant(participantRecord)
      } catch (err) {
        console.error('Player init error:', err)
        setError('Failed to load session details.')
      } finally {
        setLoading(false)
      }
    }

    initPlayer()
  }, [sessionId])

  // Realtime subscription for session state and score updates
  useEffect(() => {
    if (!sessionId) return

    const channel = supabase
      .channel(`player_room_${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_sessions',
          filter: `id=eq.${sessionId}`,
        },
        payload => {
          if (payload.new) {
            const updated = payload.new as GameSession
            const sessionZoomQs = (updated.settings as any)?.zoom_questions
            if (Array.isArray(sessionZoomQs) && sessionZoomQs.length > 0) {
              setZoomQuestions(sessionZoomQs)
            }
            setSession(prev => {
              if (prev && prev.status !== updated.status) {
                if (updated.status === 'question_active') {
                  sound.playClick()
                } else if (updated.status === 'final_results') {
                  sound.playFanfare()
                }
              }
              return updated
            })
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_participants',
          filter: `id=eq.${participant?.id}`,
        },
        payload => {
          if (payload.new) {
            setParticipant(payload.new as SessionParticipant)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId, participant?.id])

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--midnight-plum)] text-white flex flex-col items-center justify-center p-6">
        <Loader2 className="w-12 h-12 text-pink-400 animate-spin mb-4" />
        <p className="text-sm font-semibold tracking-wide text-pink-200">
          {isRtl ? 'جارٍ الاتصال بالغرفة...' : 'Connecting to game room...'}
        </p>
      </div>
    )
  }

  if (error || !session || !participant) {
    return (
      <div className="min-h-screen bg-[var(--midnight-plum)] text-white flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-16 h-16 text-red-400 mb-4" />
        <h2 className="text-xl font-bold mb-2">{error || 'Session unavailable'}</h2>
        <button
          onClick={() => router.push('/join')}
          className="mt-4 px-6 py-2.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-bold text-sm"
        >
          {isRtl ? 'العودة لصفحة الانضمام' : 'Back to Join Screen'}
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen text-white flex flex-col justify-between p-4 sm:p-6 relative select-none">
      {/* Background ambient lighting */}
      <div
        aria-hidden="true"
        className="absolute top-0 right-0 w-72 h-72 bg-pink-500/10 rounded-full blur-3xl pointer-events-none"
      />
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-0 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"
      />

      {/* TOP COMPACT PLAYER BAR */}
      <header className="relative z-10 flex items-center justify-between pb-3 border-b border-pink-500/15">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-pink-500/20 border border-pink-400/30 flex items-center justify-center text-lg">
            {getParticipantAvatar(participant)}
          </div>
          <div>
            <div className="font-extrabold text-sm text-white leading-tight truncate max-w-[140px]">
              {participant.nickname}
            </div>
            <div className="text-[10px] text-pink-200/60 font-mono">
              PIN: {session.room_pin}
            </div>
          </div>
        </div>

        {/* Current Total Score Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-pink-500/15 border border-pink-400/25">
          <Trophy size={14} className="text-amber-400" />
          <span className="font-mono text-sm font-black text-pink-200">
            {participant.score || 0}
          </span>
          <span className="text-[10px] text-pink-300 font-bold uppercase">pts</span>
        </div>
      </header>

      {/* MAIN PLAY SCREEN CONTENT */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center py-4">
        {/* LOBBY / WAITING STATE */}
        {session.status === 'lobby' && (
          <div className="w-full max-w-sm text-center py-8 animate-fade-in">
            <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-tr from-pink-500/20 to-purple-500/30 border border-pink-400/30 flex items-center justify-center text-5xl mb-6 shadow-2xl animate-pulse">
              {getParticipantAvatar(participant)}
            </div>
            <h2 className="text-2xl font-black text-white mb-2">
              {isRtl ? 'أنت في اللعبة الآن! 🌸' : "You're In! 🌸"}
            </h2>
            <p className="text-sm text-pink-200/70 mb-6">
              {isRtl
                ? 'انظر إلى شاشة العرض الرئيسية، ستبدأ الفعالية في أي لحظة!'
                : 'Watch the projector screen! The game will start shortly.'}
            </p>
            <div className="p-4 rounded-2xl bg-white/5 border border-pink-500/15 text-xs text-pink-200/80 leading-relaxed">
              💡 {isRtl ? 'نصيحة: الإجابة الأسرع تمنحك نقاطاً إضافية!' : 'Tip: Faster correct answers earn speed bonus points!'}
            </div>
          </div>
        )}

        {/* READY STATE */}
        {session.status === 'ready' && (
          <div className="text-center animate-bounce">
            <div className="text-6xl mb-4 font-black text-pink-400">
              GET READY!
            </div>
            <p className="text-sm text-pink-200">
              {isRtl ? 'السؤال يظهر على الشاشة الآن...' : 'Question appearing on projector...'}
            </p>
          </div>
        )}

        {/* ZOOM & GUESS MODE */}
        {(session.activity_type === 'zoom_guess' || (session.settings as any)?.game_mode === 'zoom_guess') &&
          ['question_active', 'answer_collection_ended', 'answer_reveal', 'round_results'].includes(
            session.status
          ) && (
            <PlayerZoomGuessView
              session={session}
              participant={participant}
              currentQuestion={
                zoomQuestions[
                  Math.min(
                    zoomQuestions.length - 1,
                    (session.settings as any)?.question_index || 0
                  )
                ] || zoomQuestions[0]
              }
              questionIndex={(session.settings as any)?.question_index || 0}
              totalQuestions={zoomQuestions.length}
              locale={locale}
            />
          )}

        {/* QUIZ ANIME MODES */}
        {['whos_that_character', 'spacetoon_nostalgia', 'anime_expert_exam'].includes(
          session.activity_type
        ) &&
          !((session.settings as any)?.game_mode === 'zoom_guess') &&
          ['question_active', 'answer_collection_ended', 'answer_reveal', 'round_results'].includes(
            session.status
          ) && (
            <PlayerQuizView
              session={session}
              participant={participant}
              questions={quizQuestions}
              locale={locale}
            />
          )}

        {/* SAKURA FEUD MODE */}
        {session.activity_type === 'sakura_feud' &&
          ['question_active', 'answer_collection_ended', 'answer_reveal', 'round_results'].includes(
            session.status
          ) && (
            <PlayerFeudView
              session={session}
              participant={participant}
              locale={locale}
            />
          )}

        {/* DRAW IT GUESS IT MODE */}
        {session.activity_type === 'draw_it_guess_it' &&
          ['question_active', 'answer_collection_ended', 'answer_reveal', 'round_results'].includes(
            session.status
          ) && (
            <PlayerDrawView
              session={session}
              participant={participant}
              locale={locale}
            />
          )}

        {/* FINAL RESULTS */}
        {['final_results', 'completed'].includes(session.status) && (
          <div className="w-full max-w-sm text-center py-6 animate-scale-in">
            <Trophy className="w-20 h-20 text-amber-400 mx-auto mb-4 animate-bounce drop-shadow-[0_0_20px_rgba(251,191,36,0.6)]" />
            <h2 className="text-3xl font-black text-white mb-2">
              {isRtl ? 'انتهت اللعبة! 🌸' : 'Game Finished! 🌸'}
            </h2>
            <div className="p-6 rounded-3xl bg-black/40 border border-pink-500/20 backdrop-blur-xl my-4">
              <span className="text-xs uppercase tracking-wider text-pink-300 font-bold block mb-1">
                {isRtl ? 'مجموع نقاطك النهائي' : 'Your Final Score'}
              </span>
              <div className="font-mono text-5xl font-black text-pink-200">
                {participant.score || 0}
              </div>
            </div>
            <p className="text-xs text-pink-200/70">
              {isRtl
                ? 'تحقق من شاشة العرض لرؤية منصة التتويج والتصنيف!'
                : 'Check the projector screen to see the podium and rankings!'}
            </p>
          </div>
        )}
      </main>

      {/* FOOTER BAR */}
      <footer className="relative z-10 text-center text-[10px] text-pink-300/40 pt-2 border-t border-pink-500/10">
        Sakura Club Live Sync • {participant.nickname}
      </footer>
    </div>
  )
}
