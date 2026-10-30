'use client'

import { useState, useEffect, useRef } from 'react'
import { Maximize2, Minimize2, Volume2, VolumeX, Users, Wifi } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { sound } from '@/lib/sound'
import type { GameSession, SessionParticipant } from '@/types/database'
import ProjectorLobby from './ProjectorLobby'
import ProjectorQuiz from './ProjectorQuiz'
import ProjectorFeud from './ProjectorFeud'
import ProjectorDraw from './ProjectorDraw'
import ProjectorLeaderboard from './ProjectorLeaderboard'
import {
  WHOS_THAT_CHARACTER_QUESTIONS,
  SPACETOON_NOSTALGIA_QUESTIONS,
  ANIME_EXPERT_EXAM_QUESTIONS,
  SAKURA_FEUD_ROUNDS,
  type QuizQuestionData,
  type FeudQuestionData
} from '@/lib/gameData'

interface ProjectorContainerProps {
  sessionId: string
  locale?: string
}

export default function ProjectorContainer({ sessionId, locale = 'en' }: ProjectorContainerProps) {
  const supabase = createClient()
  const isRtl = locale === 'ar'

  const [session, setSession] = useState<GameSession | null>(null)
  const [participants, setParticipants] = useState<SessionParticipant[]>([])
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [loading, setLoading] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')

  // Game state
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestionData[]>([])
  const [feudRounds, setFeudRounds] = useState<FeudQuestionData[]>(SAKURA_FEUD_ROUNDS)
  const [feudRoundState, setFeudRoundState] = useState<{
    team1Score: number
    team2Score: number
    strikes: number
    revealedAnswerIndices: number[]
    activeTeam: 1 | 2 | null
  }>({
    team1Score: 0,
    team2Score: 0,
    strikes: 0,
    revealedAnswerIndices: [],
    activeTeam: null,
  })

  // Fullscreen toggle handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
      setIsFullscreen(true)
    } else {
      document.exitFullscreen().catch(() => {})
      setIsFullscreen(false)
    }
  }

  // Toggle sound handler
  const toggleSound = () => {
    const nextVal = !soundEnabled
    setSoundEnabled(nextVal)
    sound.setEnabled(nextVal)
    if (nextVal) sound.playClick()
  }

  // Initial data loading
  useEffect(() => {
    async function loadData() {
      try {
        // Fetch session
        const { data: sessData, error: sessErr } = await supabase
          .from('game_sessions')
          .select('*')
          .eq('id', sessionId)
          .single()

        if (sessErr || !sessData) {
          console.error('Session load error:', sessErr)
          return
        }

        setSession(sessData)

        // Select proper question set based on activity type
        if (sessData.activity_type === 'whos_that_character') {
          setQuizQuestions(WHOS_THAT_CHARACTER_QUESTIONS)
        } else if (sessData.activity_type === 'spacetoon_nostalgia') {
          setQuizQuestions(SPACETOON_NOSTALGIA_QUESTIONS)
        } else if (sessData.activity_type === 'anime_expert_exam') {
          setQuizQuestions(ANIME_EXPERT_EXAM_QUESTIONS)
        }

        // Fetch participants
        const { data: parts, error: partsErr } = await supabase
          .from('session_participants')
          .select('*')
          .eq('session_id', sessionId)
          .order('score', { ascending: false })

        if (parts) setParticipants(parts)
        if (partsErr) console.error('Error fetching participants:', partsErr)
      } catch (err) {
        console.error('Initial load failure:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [sessionId])

  // Realtime subscription setup & polling fallback for robust real-time participant counts
  useEffect(() => {
    const fetchLatestParticipants = () => {
      supabase
        .from('session_participants')
        .select('*')
        .eq('session_id', sessionId)
        .order('score', { ascending: false })
        .then(({ data, error }) => {
          if (data && !error) setParticipants(data)
        })
    }

    // Interval heartbeat to guarantee participants always sync even if network drops websocket frames
    const syncInterval = setInterval(fetchLatestParticipants, 3000)

    const channel = supabase
      .channel(`projector_session_${sessionId}`)
      // Listen to game_sessions database changes
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
            setSession(prev => {
              // Sound effects on status transitions
              if (prev && prev.status !== updated.status) {
                if (updated.status === 'question_active') {
                  sound.playClick()
                } else if (updated.status === 'answer_reveal') {
                  sound.playReveal()
                } else if (updated.status === 'final_results') {
                  sound.playFanfare()
                }
              }
              return updated
            })
          }
        }
      )
      // Listen to session_participants database changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_participants',
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          fetchLatestParticipants()
        }
      )
      // Listen to custom Realtime broadcast events (strikes, buzzers, reveals)
      .on('broadcast', { event: 'feud_event' }, payload => {
        const { type, data } = payload.payload
        if (type === 'strike') {
          sound.playStrike()
          setFeudRoundState(prev => ({ ...prev, strikes: (prev.strikes + 1) % 4 }))
        } else if (type === 'reveal_answer') {
          sound.playReveal()
          setFeudRoundState(prev => ({
            ...prev,
            revealedAnswerIndices: [...prev.revealedAnswerIndices, data.index],
          }))
        } else if (type === 'buzzer') {
          sound.playBuzzer()
        } else if (type === 'update_scores') {
          setFeudRoundState(prev => ({
            ...prev,
            team1Score: data.team1Score,
            team2Score: data.team2Score,
          }))
        }
      })
      .subscribe(status => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected')
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setConnectionStatus('disconnected')
        }
      })

    return () => {
      clearInterval(syncInterval)
      supabase.removeChannel(channel)
    }
  }, [sessionId])

  if (loading || !session) {
    return (
      <div className="min-h-screen bg-[var(--midnight-plum)] text-white flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 border-4 border-pink-400 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-bold tracking-wide">
          {isRtl ? 'جارٍ تهيئة شاشة العرض لـ ساكورا...' : 'Initializing Sakura Projector Display...'}
        </h2>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen w-full bg-[#180C22] text-white flex flex-col justify-between overflow-hidden select-none font-sans">
      {/* Background ambient lighting */}
      <div
        aria-hidden="true"
        className="absolute top-0 -left-20 w-[500px] h-[500px] bg-pink-600/10 rounded-full blur-[140px] pointer-events-none"
      />
      <div
        aria-hidden="true"
        className="absolute bottom-0 -right-20 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none"
      />

      {/* TOP FLOATING OVERLAY BAR */}
      <header className="relative z-20 flex items-center justify-between px-8 py-5 border-b border-pink-500/10 bg-[#1e0f2b]/80 backdrop-blur-md">
        {/* Brand & Activity Title */}
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-pink-500/20 border border-pink-400/30 flex items-center justify-center text-pink-300 font-bold text-lg shadow-inner">
            🌸
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight text-white">
                SAKURA
              </span>
              <span className="text-xs uppercase px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-semibold border border-pink-400/20">
                {session.activity_type.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-xs text-pink-200/60 font-medium">
              {isRtl ? 'نادي الثقافة اليابانية والأنمي' : 'Japanese Culture & Anime Club'}
            </p>
          </div>
        </div>

        {/* Room PIN pill (always visible for attendees walking in late) */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 px-5 py-2 rounded-2xl bg-black/40 border border-pink-500/25 shadow-lg">
            <span className="text-xs uppercase tracking-widest text-pink-300/80 font-bold">
              {isRtl ? 'رمز الغرفة' : 'ROOM PIN'}
            </span>
            <span className="font-mono text-2xl font-black tracking-widest text-pink-200">
              {session.room_pin}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm text-pink-200/80 bg-pink-500/10 px-4 py-2 rounded-xl border border-pink-500/20">
            <Users size={16} className="text-pink-400" />
            <span className="font-bold">{participants.length}</span>
            <span className="text-xs">{isRtl ? 'لاعب' : 'Players'}</span>
          </div>

          {/* Quick controls (sound & fullscreen) */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSound}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-pink-200 transition-colors border border-pink-500/10"
              title={soundEnabled ? 'Mute Sound' : 'Enable Sound'}
              aria-label="Toggle Sound"
            >
              {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} className="text-red-400" />}
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-pink-200 transition-colors border border-pink-500/10"
              title="Toggle Fullscreen"
              aria-label="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
          </div>
        </div>
      </header>

      {/* MAIN SCREEN STAGE */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-8 sm:p-12 w-full max-w-7xl mx-auto">
        {/* LOBBY VIEW */}
        {session.status === 'lobby' && (
          <ProjectorLobby
            session={session}
            participants={participants}
            locale={locale}
          />
        )}

        {/* READY / COUNTDOWN VIEW */}
        {session.status === 'ready' && (
          <div className="text-center animate-pulse">
            <div className="text-8xl mb-6 font-black text-pink-400 drop-shadow-[0_0_40px_rgba(244,167,197,0.8)]">
              READY?
            </div>
            <p className="text-2xl text-pink-200 font-medium">
              {isRtl ? 'الجولة على وشك البدء!' : 'The round is about to begin!'}
            </p>
          </div>
        )}

        {/* QUIZ STAGE (Who\'s That Character, Spacetoon Nostalgia, Anime Expert) */}
        {['whos_that_character', 'spacetoon_nostalgia', 'anime_expert_exam'].includes(
          session.activity_type
        ) &&
          ['question_active', 'answer_collection_ended', 'answer_reveal', 'round_results'].includes(
            session.status
          ) && (
            <ProjectorQuiz
              session={session}
              participants={participants}
              questions={quizQuestions}
              locale={locale}
            />
          )}

        {/* SAKURA FEUD STAGE */}
        {session.activity_type === 'sakura_feud' &&
          ['question_active', 'answer_collection_ended', 'answer_reveal', 'round_results'].includes(
            session.status
          ) && (
            <ProjectorFeud
              session={session}
              participants={participants}
              rounds={feudRounds}
              roundState={feudRoundState}
              locale={locale}
            />
          )}

        {/* DRAW IT, GUESS IT STAGE */}
        {session.activity_type === 'draw_it_guess_it' &&
          ['question_active', 'answer_collection_ended', 'answer_reveal', 'round_results'].includes(
            session.status
          ) && (
            <ProjectorDraw
              session={session}
              participants={participants}
              locale={locale}
            />
          )}

        {/* FINAL RESULTS & LEADERBOARD */}
        {['final_results', 'completed'].includes(session.status) && (
          <ProjectorLeaderboard
            session={session}
            participants={participants}
            locale={locale}
          />
        )}
      </main>

      {/* FOOTER BAR */}
      <footer className="relative z-20 flex items-center justify-between px-8 py-3 bg-[#13071c]/90 border-t border-pink-500/10 text-xs text-pink-200/50">
        <div className="flex items-center gap-2">
          <Wifi
            size={12}
            className={connectionStatus === 'connected' ? 'text-green-400' : 'text-yellow-400'}
          />
          <span>{connectionStatus === 'connected' ? 'Live Synchronized' : 'Connecting...'}</span>
        </div>
        <div>
          {isRtl
            ? 'انضم الآن عبر هاتفك: ادخل على الموقع واكتب الرمز'
            : 'Join on your phone: scan the QR code or enter PIN at the join screen'}
        </div>
        <div>Sakura Club Engine 2.0</div>
      </footer>
    </div>
  )
}
