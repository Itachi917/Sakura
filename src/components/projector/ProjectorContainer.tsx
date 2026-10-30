'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Users,
  Wifi,
  Play,
  Eye,
  ChevronRight,
  Trophy,
  X,
  Settings,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { sound } from '@/lib/sound'
import { getQuestionIndex } from '@/lib/gameHelpers'
import { cn } from '@/lib/utils'
import type { GameSession, SessionParticipant } from '@/types/database'
import ProjectorLobby from './ProjectorLobby'
import ProjectorQuiz from './ProjectorQuiz'
import ProjectorFeud from './ProjectorFeud'
import ProjectorDraw from './ProjectorDraw'
import ProjectorLeaderboard from './ProjectorLeaderboard'
import ProjectorZoomGuess from './ProjectorZoomGuess'
import {
  WHOS_THAT_CHARACTER_QUESTIONS,
  SPACETOON_NOSTALGIA_QUESTIONS,
  ANIME_EXPERT_EXAM_QUESTIONS,
  SAKURA_FEUD_ROUNDS,
  ZOOM_GUESS_QUESTIONS,
  type QuizQuestionData,
  type FeudQuestionData,
  type ZoomGuessQuestionData,
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
  const [showHostControls, setShowHostControls] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  // Game state
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestionData[]>([])
  const [zoomQuestions, setZoomQuestions] = useState<ZoomGuessQuestionData[]>(ZOOM_GUESS_QUESTIONS)
  const [feudRounds, setFeudRounds] = useState<FeudQuestionData[]>(SAKURA_FEUD_ROUNDS)
  const [feudRoundState, setFeudRoundState] = useState<{
    team1Score: number
    team2Score: number
    strikes: number
    revealedAnswerIndices: number[]
    activeTeam: 1 | 2 | null
    roundBank: number
    faceoff: {
      rep1Id: string
      rep1Name: string
      rep2Id: string
      rep2Name: string
      winnerId?: string
      winnerName?: string
      winnerTeam?: 1 | 2
      slowerId?: string
      slowerName?: string
    } | null
    isSteal: boolean
    participantTeams: Record<string, 'team1' | 'team2'>
  }>({
    team1Score: 0,
    team2Score: 0,
    strikes: 0,
    revealedAnswerIndices: [],
    activeTeam: null,
    roundBank: 0,
    faceoff: null,
    isSteal: false,
    participantTeams: {},
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

  const isZoom = session?.activity_type === 'zoom_guess' || (session?.settings as any)?.game_mode === 'zoom_guess'
  const isFeud = session?.activity_type === 'sakura_feud'
  const totalQuestions = isZoom ? zoomQuestions.length : isFeud ? feudRounds.length : quizQuestions.length || 5
  const currentIdx = getQuestionIndex(session)

  // Host Action Dispatcher from Projector View
  const handleHostAction = async (newStatus: GameSession['status'], newQuestionIndex?: number) => {
    if (!session) return
    setActionLoading(true)
    sound.playClick()
    try {
      const currentSettings = (session.settings as Record<string, unknown>) || {}
      const newSettings = typeof newQuestionIndex === 'number'
        ? { ...currentSettings, question_index: newQuestionIndex }
        : currentSettings

      const { data, error } = await supabase
        .from('game_sessions')
        .update({
          status: newStatus,
          settings: newSettings as unknown as import('@/types/database').Json,
        })
        .eq('id', session.id)
        .select()
        .single()
      if (data) setSession(data)
    } catch (err) {
      console.error('Host action error from projector:', err)
    } finally {
      setActionLoading(false)
    }
  }

  // Keyboard shortcuts listener for host on projector
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return

      if (e.key === 'h' || e.key === 'H') {
        setShowHostControls(prev => !prev)
        return
      }

      if (!session) return

      if (e.code === 'Space') {
        e.preventDefault()
        if (session.status === 'question_active') {
          handleHostAction('answer_reveal')
        } else if (session.status === 'answer_reveal' || session.status === 'round_results') {
          if (currentIdx + 1 >= totalQuestions) {
            handleHostAction('final_results')
          } else {
            handleHostAction('question_active', currentIdx + 1)
          }
        } else if (session.status === 'lobby') {
          handleHostAction('question_active', 0)
        }
      } else if (e.key === 'n' || e.key === 'N' || e.key === 'ArrowRight') {
        e.preventDefault()
        if (currentIdx + 1 >= totalQuestions) {
          handleHostAction('final_results')
        } else {
          handleHostAction('question_active', currentIdx + 1)
        }
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault()
        if (session.status === 'question_active') {
          handleHostAction('answer_reveal')
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [session?.status, currentIdx, totalQuestions])

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
            const sessionZoomQs = (updated.settings as any)?.zoom_questions
            if (Array.isArray(sessionZoomQs) && sessionZoomQs.length > 0) {
              setZoomQuestions(sessionZoomQs)
            }
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
      // Listen to custom Realtime broadcast events (strikes, buzzers, reveals, faceoffs, steals)
      .on('broadcast', { event: 'feud_event' }, payload => {
        const { type, data } = payload.payload
        if (type === 'strike') {
          sound.playStrike()
          setFeudRoundState(prev => ({
            ...prev,
            strikes: data.strikes,
            isSteal: data.strikes === 3,
          }))
        } else if (type === 'reveal_answer') {
          sound.playReveal()
          setFeudRoundState(prev => ({
            ...prev,
            revealedAnswerIndices: [...prev.revealedAnswerIndices, data.index],
            roundBank: typeof data.newBank === 'number' ? data.newBank : prev.roundBank,
          }))
        } else if (type === 'faceoff_start') {
          sound.playClick()
          setFeudRoundState(prev => ({
            ...prev,
            faceoff: data,
            strikes: 0,
            revealedAnswerIndices: [],
            isSteal: false,
          }))
        } else if (type === 'buzzer_result') {
          sound.playFanfare()
          setFeudRoundState(prev => ({
            ...prev,
            faceoff: prev.faceoff ? { ...prev.faceoff, ...data } : data,
          }))
        } else if (type === 'set_active_team') {
          sound.playClick()
          setFeudRoundState(prev => ({
            ...prev,
            activeTeam: data.activeTeam,
          }))
        } else if (type === 'round_awarded') {
          sound.playFanfare()
          setFeudRoundState(prev => ({
            ...prev,
            team1Score: data.team1Score,
            team2Score: data.team2Score,
            strikes: 0,
            roundBank: 0,
            revealedAnswerIndices: [],
            faceoff: null,
            isSteal: false,
          }))
        } else if (type === 'team_switch' || type === 'host_move_team') {
          setFeudRoundState(prev => ({
            ...prev,
            participantTeams: {
              ...prev.participantTeams,
              [data.participantId]: data.team,
            },
          }))
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
    <div className="relative min-h-screen w-full text-white flex flex-col justify-between overflow-hidden select-none font-sans">
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

          {/* Quick controls (sound & fullscreen & host controls) */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHostControls(prev => !prev)}
              className={cn(
                "px-3 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5",
                showHostControls
                  ? "bg-pink-600/90 text-white border-pink-400 shadow-md shadow-pink-600/30"
                  : "bg-white/5 hover:bg-white/10 text-pink-200 border-pink-500/15"
              )}
              title={isRtl ? 'إظهار/إخفاء أدوات المضيف (H)' : 'Toggle Host Controls (H)'}
            >
              <span>🎛️</span>
              <span className="hidden sm:inline">{isRtl ? 'تحكم المضيف' : 'Host Dock'}</span>
            </button>

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

        {/* ZOOM & GUESS STAGE */}
        {(session.activity_type === 'zoom_guess' || (session.settings as any)?.game_mode === 'zoom_guess') &&
          ['question_active', 'answer_collection_ended', 'answer_reveal', 'round_results'].includes(
            session.status
          ) && (
            <ProjectorZoomGuess
              session={session}
              participants={participants}
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

        {/* QUIZ STAGE (Who\'s That Character, Spacetoon Nostalgia, Anime Expert) */}
        {['whos_that_character', 'spacetoon_nostalgia', 'anime_expert_exam'].includes(
          session.activity_type
        ) &&
          !((session.settings as any)?.game_mode === 'zoom_guess') &&
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

      {/* ── HOST QUICK CONTROL DOCK ON PROJECTOR ── */}
      {showHostControls && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50 animate-slide-up max-w-2xl w-[92vw]">
          <div className="p-3 sm:p-4 rounded-3xl bg-[#1d0b2e]/95 border-2 border-pink-500/40 backdrop-blur-2xl shadow-2xl flex flex-wrap items-center justify-between gap-3">
            {/* Left: Current Question & Status */}
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-pink-500/20 border border-pink-400/30 flex items-center justify-center text-sm">
                🎛️
              </span>
              <div>
                <div className="text-xs font-mono font-bold text-pink-300">
                  {session.status === 'lobby'
                    ? (isRtl ? 'في الانتظار' : 'Lobby')
                    : isRtl
                    ? `سؤال ${currentIdx + 1} / ${totalQuestions}`
                    : `Q ${currentIdx + 1} / ${totalQuestions}`}
                </div>
                <div className="text-[10px] text-pink-200/60 font-bold uppercase">
                  {session.status.replace(/_/g, ' ')}
                </div>
              </div>
            </div>

            {/* Center: Host Action Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              {session.status === 'lobby' && (
                <button
                  onClick={() => handleHostAction('question_active', 0)}
                  disabled={actionLoading}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 text-white font-black text-xs sm:text-sm shadow-lg flex items-center gap-1.5 transition-all"
                >
                  <Play size={15} />
                  <span>{isRtl ? 'بدء اللعبة الآن 🚀' : 'Start Game 🚀'}</span>
                </button>
              )}

              {session.status === 'question_active' && (
                <>
                  <button
                    onClick={() => handleHostAction('answer_reveal')}
                    disabled={actionLoading}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-pink-500 hover:from-amber-400 text-white font-black text-xs sm:text-sm shadow-lg flex items-center gap-1.5 transition-all animate-pulse"
                  >
                    <Eye size={15} />
                    <span>{isRtl ? 'كشف الإجابة (Space)' : 'Reveal Answer (Space)'}</span>
                  </button>
                  <button
                    onClick={() => {
                      if (currentIdx + 1 >= totalQuestions) {
                        handleHostAction('final_results')
                      } else {
                        handleHostAction('question_active', currentIdx + 1)
                      }
                    }}
                    disabled={actionLoading}
                    className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-pink-200 font-bold text-xs flex items-center gap-1 transition-all"
                    title={isRtl ? 'تخطي للسؤال التالي' : 'Skip to next'}
                  >
                    <ChevronRight size={14} />
                    <span>{isRtl ? 'تخطي' : 'Skip'}</span>
                  </button>
                </>
              )}

              {session.status === 'answer_reveal' && (
                <>
                  <button
                    onClick={() => handleHostAction('round_results')}
                    disabled={actionLoading}
                    className="px-4 py-2.5 rounded-xl bg-purple-600/80 hover:bg-purple-500 text-white font-bold text-xs sm:text-sm border border-purple-400/30 flex items-center gap-1.5 transition-all"
                  >
                    <Trophy size={15} className="text-amber-300" />
                    <span>{isRtl ? 'عرض الصدارة' : 'Leaderboard'}</span>
                  </button>
                  <button
                    onClick={() => {
                      if (currentIdx + 1 >= totalQuestions) {
                        handleHostAction('final_results')
                      } else {
                        handleHostAction('question_active', currentIdx + 1)
                      }
                    }}
                    disabled={actionLoading}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 text-white font-black text-xs sm:text-sm shadow-lg flex items-center gap-1.5 transition-all"
                  >
                    <span>{currentIdx + 1 >= totalQuestions ? (isRtl ? 'التتويج النهائي 👑' : 'Final Podium 👑') : (isRtl ? 'السؤال التالي (Space)' : 'Next Q (Space)')}</span>
                    <ChevronRight size={15} />
                  </button>
                </>
              )}

              {session.status === 'round_results' && (
                <button
                  onClick={() => {
                    if (currentIdx + 1 >= totalQuestions) {
                      handleHostAction('final_results')
                    } else {
                      handleHostAction('question_active', currentIdx + 1)
                    }
                  }}
                  disabled={actionLoading}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 text-white font-black text-xs sm:text-sm shadow-lg flex items-center gap-1.5 transition-all"
                >
                  <span>{currentIdx + 1 >= totalQuestions ? (isRtl ? 'التتويج النهائي 👑' : 'Final Podium 👑') : (isRtl ? 'السؤال التالي ⏭️' : 'Next Question ⏭️')}</span>
                  <ChevronRight size={15} />
                </button>
              )}

              {session.status === 'final_results' && (
                <button
                  onClick={() => handleHostAction('lobby', 0)}
                  disabled={actionLoading}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm transition-all"
                >
                  <span>{isRtl ? 'إعادة إلى اللوبي 🔄' : 'Return to Lobby 🔄'}</span>
                </button>
              )}
            </div>

            {/* Right: Keyboard shortcuts tip & Close button */}
            <div className="flex items-center gap-2">
              <span className="hidden md:inline text-[10px] text-pink-300/60 font-mono">
                [Space] [N] [R] [H]
              </span>
              <button
                onClick={() => setShowHostControls(false)}
                className="p-1.5 rounded-lg text-pink-300/60 hover:text-white hover:bg-white/10 transition-colors"
                title={isRtl ? 'إغلاق لوحة التحكم' : 'Close controls'}
              >
                <X size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

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
