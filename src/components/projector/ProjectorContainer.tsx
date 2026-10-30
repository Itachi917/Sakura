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
  Smartphone,
  Tv,
  RefreshCw,
  Sparkles,
  HeartPulse,
  Drum,
  Gamepad2,
  Award,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { sound } from '@/lib/sound'
import {
  getQuestionIndex,
  prepareDrawItRound,
  getQuizQuestionsForActivity,
  getAudioQuestionsForSession,
  getZoomQuestionsForSession,
  getSilhouetteQuestionsForSession,
  getEmojiRiddleQuestionsForSession,
  getLivePollQuestionsForSession,
  prepareGameSwitchSettings,
} from '@/lib/gameHelpers'
import { cn } from '@/lib/utils'
import type { GameSession, SessionParticipant } from '@/types/database'
import ProjectorLobby from './ProjectorLobby'
import ProjectorQuiz from './ProjectorQuiz'
import ProjectorFeud from './ProjectorFeud'
import ProjectorDraw from './ProjectorDraw'
import ProjectorLeaderboard from './ProjectorLeaderboard'
import ProjectorZoomGuess from './ProjectorZoomGuess'
import ProjectorAudioGuess from './ProjectorAudioGuess'
import ProjectorSilhouette from './ProjectorSilhouette'
import ProjectorEmojiRiddle from './ProjectorEmojiRiddle'
import ProjectorLivePoll from './ProjectorLivePoll'
import {
  WHOS_THAT_CHARACTER_QUESTIONS,
  SPACETOON_NOSTALGIA_QUESTIONS,
  ANIME_EXPERT_EXAM_QUESTIONS,
  SAKURA_FEUD_ROUNDS,
  ZOOM_GUESS_QUESTIONS,
  AUDIO_GUESS_QUESTIONS,
  SILHOUETTE_QUESTIONS,
  EMOJI_RIDDLE_QUESTIONS,
  LIVE_POLL_QUESTIONS,
  DRAWING_WORDS,
  type QuizQuestionData,
  type FeudQuestionData,
  type ZoomGuessQuestionData,
  type AudioGuessQuestionData,
  type SilhouetteQuestionData,
  type EmojiRiddleData,
  type LivePollData,
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
  const [audioQuestions, setAudioQuestions] = useState<AudioGuessQuestionData[]>(AUDIO_GUESS_QUESTIONS)
  const [silhouetteQuestions, setSilhouetteQuestions] = useState<SilhouetteQuestionData[]>(SILHOUETTE_QUESTIONS)
  const [emojiQuestions, setEmojiQuestions] = useState<EmojiRiddleData[]>(EMOJI_RIDDLE_QUESTIONS)
  const [pollQuestions, setPollQuestions] = useState<LivePollData[]>(LIVE_POLL_QUESTIONS)
  const [feudRounds, setFeudRounds] = useState<FeudQuestionData[]>(SAKURA_FEUD_ROUNDS)
  const [showGameSwitcherModal, setShowGameSwitcherModal] = useState(false)
  const [resetScoresOnSwitch, setResetScoresOnSwitch] = useState(false)

  // Question reloader helper
  const reloadQuestions = (sess: GameSession) => {
    const settings = sess.settings as Record<string, unknown> | null
    const mode = (settings as any)?.game_mode || sess.activity_type

    if (mode === 'zoom_guess') {
      setZoomQuestions(getZoomQuestionsForSession(settings))
    } else if (mode === 'audio_guess') {
      setAudioQuestions(getAudioQuestionsForSession(settings))
    } else if (mode === 'silhouette_guess') {
      setSilhouetteQuestions(getSilhouetteQuestionsForSession(settings))
    } else if (mode === 'emoji_riddle') {
      setEmojiQuestions(getEmojiRiddleQuestionsForSession(settings))
    } else if (mode === 'live_poll') {
      setPollQuestions(getLivePollQuestionsForSession(settings))
    } else if (['whos_that_character', 'spacetoon_nostalgia', 'anime_expert_exam'].includes(mode)) {
      setQuizQuestions(getQuizQuestionsForActivity(mode, settings))
    }
  }

  // Switch Game in-room without regenerating code or kicking participants
  const handleSwitchGame = async (targetActivity: string) => {
    if (!session) return
    setActionLoading(true)
    sound.playClick()
    try {
      const { settings } = prepareGameSwitchSettings(targetActivity, session.settings as any)

      if (resetScoresOnSwitch) {
        await supabase
          .from('session_participants')
          .update({ score: 0 })
          .eq('session_id', session.id)
      }

      let { data, error } = await supabase
        .from('game_sessions')
        .update({
          activity_type: targetActivity as any,
          settings: settings as any,
          status: 'lobby',
        })
        .eq('id', session.id)
        .select()
        .single()

      if (error) {
        const fallbackRes = await supabase
          .from('game_sessions')
          .update({
            activity_type: 'whos_that_character',
            settings: { ...settings, game_mode: targetActivity } as any,
            status: 'lobby',
          })
          .eq('id', session.id)
          .select()
          .single()
        data = fallbackRes.data
        error = fallbackRes.error
      }

      if (data) {
        setSession(data)
        reloadQuestions(data)
        sound.playFanfare()
      }
    } catch (err) {
      console.error('Error switching game:', err)
    } finally {
      setActionLoading(false)
      setShowGameSwitcherModal(false)
    }
  }

  // Toggle question display mode (Projector only vs Players phones)
  const toggleDeviceDisplayMode = async () => {
    if (!session) return
    const currentVal = (session.settings as Record<string, unknown>)?.show_questions_on_device !== false
    const newVal = !currentVal
    sound.playClick()
    try {
      const currentSettings = (session.settings as Record<string, unknown>) || {}
      const updatedSettings = { ...currentSettings, show_questions_on_device: newVal }
      const { data } = await supabase
        .from('game_sessions')
        .update({
          settings: updatedSettings as any,
        })
        .eq('id', session.id)
        .select()
        .single()
      if (data) setSession(data)
    } catch {}
  }
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
  const isAudio = session?.activity_type === 'audio_guess' || (session?.settings as any)?.game_mode === 'audio_guess'
  const isSilhouette = session?.activity_type === 'silhouette_guess' || (session?.settings as any)?.game_mode === 'silhouette_guess'
  const isEmoji = session?.activity_type === 'emoji_riddle' || (session?.settings as any)?.game_mode === 'emoji_riddle'
  const isLivePoll = session?.activity_type === 'live_poll' || (session?.settings as any)?.game_mode === 'live_poll'
  const isFeud = session?.activity_type === 'sakura_feud' || (session?.settings as any)?.game_mode === 'sakura_feud'
  const isDrawIt = session?.activity_type === 'draw_it_guess_it' || (session?.settings as any)?.game_mode === 'draw_it_guess_it'
  const isQuiz = !isZoom && !isAudio && !isSilhouette && !isEmoji && !isLivePoll && !isFeud && !isDrawIt && ['whos_that_character', 'spacetoon_nostalgia', 'anime_expert_exam'].includes(session?.activity_type || '')

  const totalQuestions = isSilhouette
    ? silhouetteQuestions.length
    : isEmoji
    ? emojiQuestions.length
    : isLivePoll
    ? pollQuestions.length
    : isZoom
    ? zoomQuestions.length
    : isAudio
    ? audioQuestions.length
    : isFeud
    ? feudRounds.length
    : isDrawIt
    ? Math.min(15, Math.max(DRAWING_WORDS.length, participants.length || 5))
    : quizQuestions.length || 5
  const currentIdx = getQuestionIndex(session)

  // Host Action Dispatcher from Projector View
  const handleHostAction = async (newStatus: GameSession['status'], newQuestionIndex?: number) => {
    if (!session) return
    setActionLoading(true)
    sound.playClick()
    try {
      const currentSettings = (session.settings as Record<string, unknown>) || {}
      let newSettings: Record<string, unknown>

      if (isDrawIt && (newStatus === 'question_active' || typeof newQuestionIndex === 'number')) {
        const targetIdx = typeof newQuestionIndex === 'number' ? newQuestionIndex : currentIdx
        newSettings = prepareDrawItRound(session, participants, targetIdx)
      } else {
        newSettings = typeof newQuestionIndex === 'number'
          ? { ...currentSettings, question_index: newQuestionIndex }
          : currentSettings
      }

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
        reloadQuestions(sessData)

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
            reloadQuestions(updated)
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

        {/* SILHOUETTE GUESS STAGE */}
        {isSilhouette &&
          ['question_active', 'answer_collection_ended', 'answer_reveal', 'round_results'].includes(session.status) &&
          silhouetteQuestions[currentIdx] && (
            <ProjectorSilhouette
              session={session}
              participants={participants}
              currentQuestion={silhouetteQuestions[currentIdx]}
              questionIndex={currentIdx}
              totalQuestions={totalQuestions}
              locale={locale}
            />
          )}

        {/* EMOJI RIDDLE STAGE */}
        {isEmoji &&
          ['question_active', 'answer_collection_ended', 'answer_reveal', 'round_results'].includes(session.status) &&
          emojiQuestions[currentIdx] && (
            <ProjectorEmojiRiddle
              session={session}
              participants={participants}
              currentQuestion={emojiQuestions[currentIdx]}
              questionIndex={currentIdx}
              totalQuestions={totalQuestions}
              locale={locale}
            />
          )}

        {/* LIVE POLL STAGE */}
        {isLivePoll &&
          ['question_active', 'answer_collection_ended', 'answer_reveal', 'round_results'].includes(session.status) &&
          pollQuestions[currentIdx] && (
            <ProjectorLivePoll
              session={session}
              participants={participants}
              currentQuestion={pollQuestions[currentIdx]}
              questionIndex={currentIdx}
              totalQuestions={totalQuestions}
              locale={locale}
            />
          )}

        {/* AUDIO GUESS STAGE */}
        {isAudio &&
          ['question_active', 'answer_collection_ended', 'answer_reveal', 'round_results'].includes(session.status) &&
          audioQuestions[currentIdx] && (
            <ProjectorAudioGuess
              session={session}
              participants={participants}
              currentQuestion={audioQuestions[currentIdx]}
              questionIndex={currentIdx}
              totalQuestions={totalQuestions}
              locale={locale}
            />
          )}

        {/* ZOOM & GUESS STAGE */}
        {isZoom &&
          ['question_active', 'answer_collection_ended', 'answer_reveal', 'round_results'].includes(session.status) &&
          zoomQuestions[currentIdx] && (
            <ProjectorZoomGuess
              session={session}
              participants={participants}
              currentQuestion={zoomQuestions[currentIdx]}
              questionIndex={currentIdx}
              totalQuestions={totalQuestions}
              locale={locale}
            />
          )}

        {/* QUIZ STAGE (Who's That Character, Spacetoon Nostalgia, Anime Expert) */}
        {isQuiz &&
          ['question_active', 'answer_collection_ended', 'answer_reveal', 'round_results'].includes(session.status) && (
            <ProjectorQuiz
              session={session}
              participants={participants}
              questions={quizQuestions}
              locale={locale}
            />
          )}

        {/* SAKURA FEUD STAGE */}
        {isFeud &&
          ['question_active', 'answer_collection_ended', 'answer_reveal', 'round_results'].includes(session.status) && (
            <ProjectorFeud
              session={session}
              participants={participants}
              rounds={feudRounds}
              roundState={feudRoundState}
              locale={locale}
            />
          )}

        {/* DRAW IT, GUESS IT STAGE */}
        {isDrawIt &&
          ['question_active', 'answer_collection_ended', 'answer_reveal', 'round_results'].includes(session.status) && (
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
              {/* Question Display Mode Toggle */}
              <button
                onClick={toggleDeviceDisplayMode}
                className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-[11px] font-bold text-pink-200 border border-pink-400/30 flex items-center gap-1.5 transition-all shadow-sm"
                title={isRtl ? 'تبديل ظهور الأسئلة على الهواتف أو الشاشة فقط' : 'Toggle Question Display on phones vs projector only'}
              >
                {(session.settings as Record<string, unknown>)?.show_questions_on_device !== false ? (
                  <>
                    <Smartphone size={13} className="text-pink-300" />
                    <span>{isRtl ? 'الأسئلة بالهواتف 📱' : 'On Phones 📱'}</span>
                  </>
                ) : (
                  <>
                    <Tv size={13} className="text-pink-300" />
                    <span>{isRtl ? 'البروجكتر فقط 📽️' : 'Projector Only 📽️'}</span>
                  </>
                )}
              </button>

              {/* Game Switcher Button */}
              <button
                onClick={() => setShowGameSwitcherModal(true)}
                className="px-3 py-1.5 rounded-xl bg-purple-600/40 hover:bg-purple-600/60 text-[11px] font-bold text-purple-200 border border-purple-400/40 flex items-center gap-1.5 transition-all shadow-md active:scale-95"
                title={isRtl ? 'تغيير اللعبة دون توليد كود جديد' : 'Switch game mode in same room'}
              >
                <Gamepad2 size={13} className="text-purple-300" />
                <span>{isRtl ? 'تغيير اللعبة 🎮' : 'Switch Game 🎮'}</span>
              </button>

              {/* Live Soundboard Pills */}
              <div className="flex items-center gap-1 border-s border-pink-500/20 ps-2">
                <button
                  type="button"
                  onClick={() => sound.playHeartbeat()}
                  className="px-2 py-1 rounded-lg bg-pink-500/10 hover:bg-pink-500/30 text-[10px] font-bold text-pink-200 border border-pink-400/20 active:scale-90"
                  title={isRtl ? 'نبضات ترقب' : 'Tension Heartbeat'}
                >
                  💓
                </button>
                <button
                  type="button"
                  onClick={() => sound.playDrumroll()}
                  className="px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/30 text-[10px] font-bold text-amber-200 border border-amber-400/20 active:scale-90"
                  title={isRtl ? 'قرع طبول' : 'Drumroll'}
                >
                  🥁
                </button>
                <button
                  type="button"
                  onClick={() => sound.playStrike()}
                  className="px-2 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/30 text-[10px] font-bold text-red-200 border border-red-400/20 active:scale-90"
                  title={isRtl ? 'بزر خطأ' : 'Buzzer'}
                >
                  ❌
                </button>
                <button
                  type="button"
                  onClick={() => sound.playApplause()}
                  className="px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/30 text-[10px] font-bold text-emerald-200 border border-emerald-400/20 active:scale-90"
                  title={isRtl ? 'تصفيق وتشجيع' : 'Applause'}
                >
                  👏
                </button>
                <button
                  type="button"
                  onClick={() => sound.playFanfare()}
                  className="px-2 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/30 text-[10px] font-bold text-purple-200 border border-purple-400/20 active:scale-90"
                  title={isRtl ? 'فانفار فوز' : 'Fanfare'}
                >
                  🎺
                </button>
              </div>

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

      {/* ── MODAL: IN-ROOM GAME SWITCHER ── */}
      {showGameSwitcherModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-xl bg-[#200e30] border-2 border-pink-500/40 rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setShowGameSwitcherModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-pink-200 transition-all"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">🎮</span>
              <h3 className="text-xl font-black text-white">
                {isRtl ? 'تغيير اللعبة دون تغيير الكود أو إخراج اللاعبين' : 'Switch Game in Same Room'}
              </h3>
            </div>
            <p className="text-xs text-pink-200/70 mb-4">
              {isRtl
                ? 'يبقى رمز الغرفة (#PIN) وجميع اللاعبين متصلين، وتتحول شاشاتهم فوراً للعبة الجديدة!'
                : 'Room PIN & all connected players remain intact. Player screens switch instantly!'}
            </p>

            {/* Score Option */}
            <div className="mb-4 p-3 rounded-2xl bg-black/40 border border-pink-500/20 flex items-center justify-between text-xs">
              <span className="font-bold text-pink-200">
                {isRtl ? 'تصفير نقاط اللاعبين للعبة الجديدة؟' : 'Reset player scores for new game?'}
              </span>
              <button
                type="button"
                onClick={() => setResetScoresOnSwitch(prev => !prev)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  resetScoresOnSwitch ? 'bg-rose-600 text-white' : 'bg-white/10 text-pink-300'
                }`}
              >
                {resetScoresOnSwitch ? (isRtl ? 'نعم (تصفير)' : 'Yes (Reset)') : (isRtl ? 'لا (الاحتفاظ بالنقاط)' : 'No (Keep scores)')}
              </button>
            </div>

            {/* Games Grid */}
            <div className="grid grid-cols-2 gap-2 max-h-[360px] overflow-y-auto pr-1">
              {[
                { id: 'spacetoon_nostalgia', name: 'سبيستون نوستالجيا', icon: '📺' },
                { id: 'whos_that_character', name: 'خمن الشخصية', icon: '🎭' },
                { id: 'anime_expert_exam', name: 'اختبار الأوتاكو الخبير', icon: '📚' },
                { id: 'audio_guess', name: 'خمّن الأوست والصوت', icon: '🎵' },
                { id: 'silhouette_guess', name: 'خمن ظل الشخصية', icon: '👤' },
                { id: 'zoom_guess', name: 'خمن بالزووم', icon: '🔍' },
                { id: 'emoji_riddle', name: 'ألغاز إيموجي الأنمي', icon: '🎭' },
                { id: 'live_poll', name: 'استطلاع رأي الجمهور', icon: '📊' },
                { id: 'sakura_feud', name: 'صراع الساكورا (الفرق)', icon: '⚔️' },
                { id: 'draw_it_guess_it', name: 'ارسم وخمّن', icon: '🎨' },
              ].map(g => (
                <button
                  key={g.id}
                  onClick={() => handleSwitchGame(g.id)}
                  disabled={actionLoading}
                  className="p-3 rounded-2xl bg-white/5 hover:bg-pink-600/30 border border-pink-500/20 hover:border-pink-400 text-start flex items-center gap-2.5 transition-all active:scale-95 group"
                >
                  <span className="text-xl group-hover:scale-110 transition-transform">{g.icon}</span>
                  <span className="text-xs font-bold text-pink-100 group-hover:text-white">{g.name}</span>
                </button>
              ))}
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
