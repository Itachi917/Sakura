'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Play,
  Pause,
  SkipForward,
  Eye,
  CheckCircle,
  XCircle,
  Users,
  ExternalLink,
  Volume2,
  Trash2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Swords,
  Loader2,
  Zap,
  ShieldAlert,
  Clock,
  ArrowRightLeft,
  Trophy,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { sound } from '@/lib/sound'
import { getQuestionIndex, getParticipantAvatar } from '@/lib/gameHelpers'
import type { GameSession, SessionParticipant } from '@/types/database'
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

interface HostControlRoomProps {
  sessionId: string
  locale?: string
}

export default function HostControlRoom({ sessionId, locale = 'en' }: HostControlRoomProps) {
  const supabase = createClient()
  const isRtl = locale === 'ar'

  const [session, setSession] = useState<GameSession | null>(null)
  const [participants, setParticipants] = useState<SessionParticipant[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Game data questions
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestionData[]>([])
  const [zoomQuestions, setZoomQuestions] = useState<ZoomGuessQuestionData[]>(ZOOM_GUESS_QUESTIONS)
  const [feudRounds, setFeudRounds] = useState<FeudQuestionData[]>(SAKURA_FEUD_ROUNDS)

  // Feud host state
  const [team1Score, setTeam1Score] = useState(0)
  const [team2Score, setTeam2Score] = useState(0)
  const [roundBank, setRoundBank] = useState(0)
  const [strikes, setStrikes] = useState(0)
  const [revealedAnswers, setRevealedAnswers] = useState<number[]>([])
  const [activePlayingTeam, setActivePlayingTeam] = useState<1 | 2 | null>(null)

  // Participant teams map: participantId -> 'team1' | 'team2'
  const [participantTeams, setParticipantTeams] = useState<Record<string, 'team1' | 'team2'>>({})

  // Face-Off state
  const [faceoffActive, setFaceoffActive] = useState(false)
  const [selectedRep1Id, setSelectedRep1Id] = useState<string>('')
  const [selectedRep2Id, setSelectedRep2Id] = useState<string>('')
  const [buzzerWinner, setBuzzerWinner] = useState<{
    participantId: string
    nickname: string
    team: 1 | 2
    slowerId?: string
    slowerName?: string
  } | null>(null)

  // Load Session
  useEffect(() => {
    async function fetchSession() {
      try {
        const { data: sess, error: sessErr } = await supabase
          .from('game_sessions')
          .select('*')
          .eq('id', sessionId)
          .single()

        if (sessErr || !sess) {
          setError('Session not found.')
          return
        }

        setSession(sess)

        const isZoomGame = sess.activity_type === 'zoom_guess' || (sess.settings as any)?.game_mode === 'zoom_guess'
        if (isZoomGame) {
          setZoomQuestions(ZOOM_GUESS_QUESTIONS)
        } else if (sess.activity_type === 'whos_that_character') {
          setQuizQuestions(WHOS_THAT_CHARACTER_QUESTIONS)
        } else if (sess.activity_type === 'spacetoon_nostalgia') {
          setQuizQuestions(SPACETOON_NOSTALGIA_QUESTIONS)
        } else if (sess.activity_type === 'anime_expert_exam') {
          setQuizQuestions(ANIME_EXPERT_EXAM_QUESTIONS)
        }

        const { data: parts } = await supabase
          .from('session_participants')
          .select('*')
          .eq('session_id', sessionId)
          .order('score', { ascending: false })

        if (parts) {
          setParticipants(parts)

          // Initialize teams mapping
          const initialTeams: Record<string, 'team1' | 'team2'> = {}
          parts.forEach((p, idx) => {
            initialTeams[p.id] = idx % 2 === 0 ? 'team1' : 'team2'
          })
          setParticipantTeams(initialTeams)

          const t1 = parts.filter((_, idx) => idx % 2 === 0)
          const t2 = parts.filter((_, idx) => idx % 2 !== 0)
          if (t1[0]) setSelectedRep1Id(t1[0].id)
          if (t2[0]) setSelectedRep2Id(t2[0].id)
        }
      } catch (err) {
        console.error('Fetch error:', err)
        setError('Error loading host controls.')
      } finally {
        setLoading(false)
      }
    }

    fetchSession()
  }, [sessionId])

  // Realtime subscription for participants and Feud broadcasts
  useEffect(() => {
    const channel = supabase
      .channel(`projector_session_${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_participants',
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          supabase
            .from('session_participants')
            .select('*')
            .eq('session_id', sessionId)
            .order('score', { ascending: false })
            .then(({ data }) => {
              if (data) {
                setParticipants(data)
                setParticipantTeams(prev => {
                  const updated = { ...prev }
                  data.forEach((p, idx) => {
                    if (!updated[p.id]) {
                      updated[p.id] = idx % 2 === 0 ? 'team1' : 'team2'
                    }
                  })
                  return updated
                })
              }
            })
        }
      )
      .on('broadcast', { event: 'feud_event' }, payload => {
        const { type, data } = payload.payload

        if (type === 'team_switch') {
          // Player switched their team
          setParticipantTeams(prev => ({
            ...prev,
            [data.participantId]: data.team,
          }))
        } else if (type === 'buzzer_press') {
          // Buzzer pressed during Face-Off
          setBuzzerWinner(prev => {
            if (prev) return prev // already have a winner for this faceoff!

            const winnerId = data.participantId
            const winnerNick = data.nickname
            const winnerTeam = data.team as 1 | 2

            // Determine slower contestant
            const rep1 = participants.find(p => p.id === selectedRep1Id)
            const rep2 = participants.find(p => p.id === selectedRep2Id)
            const slower = winnerId === selectedRep1Id ? rep2 : rep1

            const slowerId = slower?.id
            const slowerName = slower?.nickname

            sound.playFanfare()

            // Broadcast buzzer_result immediately so slower contestant screen shows "Not fast enough! ⏱️"
            supabase.channel(`projector_session_${sessionId}`).send({
              type: 'broadcast',
              event: 'feud_event',
              payload: {
                type: 'buzzer_result',
                data: {
                  winnerId,
                  winnerName: winnerNick,
                  winnerTeam,
                  slowerId,
                  slowerName,
                },
              },
            })

            return {
              participantId: winnerId,
              nickname: winnerNick,
              team: winnerTeam,
              slowerId,
              slowerName,
            }
          })
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId, selectedRep1Id, selectedRep2Id, participants])

  // Move participant to opposing team (Host override)
  const handleMoveParticipantTeam = async (partId: string, newTeam: 'team1' | 'team2') => {
    sound.playClick()
    setParticipantTeams(prev => ({ ...prev, [partId]: newTeam }))

    await supabase.channel(`projector_session_${sessionId}`).send({
      type: 'broadcast',
      event: 'feud_event',
      payload: {
        type: 'host_move_team',
        data: {
          participantId: partId,
          team: newTeam,
        },
      },
    })
  }

  // Launch Face-Off Duel
  const handleLaunchFaceOff = async () => {
    sound.playClick()
    setFaceoffActive(true)
    setBuzzerWinner(null)

    const rep1 = participants.find(p => p.id === selectedRep1Id)
    const rep2 = participants.find(p => p.id === selectedRep2Id)

    await supabase.channel(`projector_session_${sessionId}`).send({
      type: 'broadcast',
      event: 'feud_event',
      payload: {
        type: 'faceoff_start',
        data: {
          rep1Id: selectedRep1Id,
          rep1Name: rep1?.nickname || 'Player 1',
          rep2Id: selectedRep2Id,
          rep2Name: rep2?.nickname || 'Player 2',
          roundIndex: getQuestionIndex(session),
        },
      },
    })
  }

  // Set Active Playing Team (Play or Pass choice)
  const handleSetActiveTeam = async (team: 1 | 2) => {
    sound.playClick()
    setActivePlayingTeam(team)

    await supabase.channel(`projector_session_${sessionId}`).send({
      type: 'broadcast',
      event: 'feud_event',
      payload: {
        type: 'set_active_team',
        data: { activeTeam: team },
      },
    })
  }

  // Strike Trigger
  const handleTriggerStrike = async () => {
    sound.playStrike()
    const nextStrikes = strikes + 1
    setStrikes(nextStrikes)

    await supabase.channel(`projector_session_${sessionId}`).send({
      type: 'broadcast',
      event: 'feud_event',
      payload: {
        type: 'strike',
        data: { strikes: nextStrikes },
      },
    })
  }

  // Reset Strikes
  const handleResetStrikes = async () => {
    sound.playClick()
    setStrikes(0)
    await supabase.channel(`projector_session_${sessionId}`).send({
      type: 'broadcast',
      event: 'feud_event',
      payload: {
        type: 'strike',
        data: { strikes: 0 },
      },
    })
  }

  // Reveal Feud Answer
  const handleRevealFeudAnswer = async (index: number) => {
    sound.playReveal()
    const updated = [...revealedAnswers, index]
    setRevealedAnswers(updated)

    const currentIndex = getQuestionIndex(session)
    const currentFeudQ = feudRounds[currentIndex]
    const addedPoints = currentFeudQ?.answers[index]?.points || 0
    const newBank = roundBank + addedPoints
    setRoundBank(newBank)

    await supabase.channel(`projector_session_${sessionId}`).send({
      type: 'broadcast',
      event: 'feud_event',
      payload: {
        type: 'reveal_answer',
        data: { index, points: addedPoints, newBank },
      },
    })
  }

  // Award Round Bank to Team
  const handleAwardRoundBank = async (team: 1 | 2) => {
    sound.playFanfare()
    const t1 = team === 1 ? team1Score + roundBank : team1Score
    const t2 = team === 2 ? team2Score + roundBank : team2Score

    setTeam1Score(t1)
    setTeam2Score(t2)
    setRoundBank(0)
    setStrikes(0)
    setRevealedAnswers([])
    setFaceoffActive(false)
    setBuzzerWinner(null)
    setActivePlayingTeam(null)

    await supabase.channel(`projector_session_${sessionId}`).send({
      type: 'broadcast',
      event: 'feud_event',
      payload: {
        type: 'round_awarded',
        data: {
          team1Score: t1,
          team2Score: t2,
          winningTeam: team,
          pointsAwarded: roundBank,
        },
      },
    })
  }

  // Manual Adjust Score
  const handleAdjustFeudScore = async (team: 1 | 2, delta: number) => {
    const t1 = team === 1 ? Math.max(0, team1Score + delta) : team1Score
    const t2 = team === 2 ? Math.max(0, team2Score + delta) : team2Score
    setTeam1Score(t1)
    setTeam2Score(t2)

    await supabase.channel(`projector_session_${sessionId}`).send({
      type: 'broadcast',
      event: 'feud_event',
      payload: {
        type: 'update_scores',
        data: { team1Score: t1, team2Score: t2 },
      },
    })
  }

  // Session Status Transitions
  const updateSessionStatus = async (
    newStatus: GameSession['status'],
    newQuestionIndex?: number
  ) => {
    setActionLoading(true)
    sound.playClick()

    try {
      const currentSettings = (session?.settings as Record<string, unknown>) || {}
      const updates = {
        status: newStatus,
        settings: (typeof newQuestionIndex === 'number'
          ? { ...currentSettings, question_index: newQuestionIndex }
          : currentSettings) as unknown as import('@/types/database').Json,
      }

      const { data, error } = await supabase
        .from('game_sessions')
        .update(updates)
        .eq('id', sessionId)
        .select()
        .single()

      if (error) throw error
      if (data) {
        setSession(data)
        // Reset per-round states on new round
        if (typeof newQuestionIndex === 'number') {
          setStrikes(0)
          setRoundBank(0)
          setRevealedAnswers([])
          setFaceoffActive(false)
          setBuzzerWinner(null)
          setActivePlayingTeam(null)
        }
      }
    } catch (err: unknown) {
      console.error('Status transition error:', err)
    } finally {
      setActionLoading(false)
    }
  }

  // Kick Participant
  const handleKickParticipant = async (partId: string) => {
    sound.playClick()
    await supabase.from('session_participants').delete().eq('id', partId)
    setParticipants(prev => prev.filter(p => p.id !== partId))
  }

  if (loading || !session) {
    return (
      <div className="min-h-screen bg-[var(--midnight-plum)] text-white flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-pink-400" />
      </div>
    )
  }

  const currentIndex = getQuestionIndex(session)
  const isZoomGame = session.activity_type === 'zoom_guess' || (session.settings as any)?.game_mode === 'zoom_guess'
  const totalQuestions = (isZoomGame ? zoomQuestions.length : 0) || quizQuestions.length || feudRounds.length || 5
  const currentQuizQ = quizQuestions[currentIndex]
  const currentFeudQ = feudRounds[currentIndex]
  const currentZoomQ = isZoomGame ? (zoomQuestions[currentIndex] || zoomQuestions[0]) : null

  const team1Members = participants.filter(p => participantTeams[p.id] === 'team1' || !participantTeams[p.id])
  const team2Members = participants.filter(p => participantTeams[p.id] === 'team2')

  return (
    <div className="min-h-screen text-white flex flex-col font-sans select-none">
      {/* TOP HEADER */}
      <header className="px-6 py-4 bg-[#1f102a] border-b border-pink-500/20 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin"
            className="text-xs text-pink-300/80 hover:text-white px-3 py-1.5 rounded-lg bg-white/5 border border-pink-500/20"
          >
            ← {isRtl ? 'لوحة الإدارة' : 'Admin Hub'}
          </Link>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-lg text-white">SAKURA HOST COCKPIT</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-pink-500/20 text-pink-300 border border-pink-400/25">
              {session.activity_type.replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        {/* Room PIN & Launch Projector Button */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/40 border border-pink-500/30">
            <span className="text-xs text-pink-300 font-bold">PIN:</span>
            <span className="font-mono text-xl font-black text-pink-200">{session.room_pin}</span>
          </div>

          <a
            href={`/projector/${session.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs shadow-lg shadow-pink-500/25 transition-all"
          >
            <ExternalLink size={14} />
            <span>{isRtl ? 'فتح شاشة العرض' : 'Open Projector View'}</span>
          </a>
        </div>
      </header>

      {/* MAIN TWO-COLUMN COCKPIT */}
      <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto w-full">
        {/* LEFT COLUMN: LIVE CONTROLS (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* SESSION STATUS BAR */}
          <div className="p-5 rounded-2xl bg-black/40 border border-pink-500/20 backdrop-blur-md flex items-center justify-between">
            <div>
              <span className="text-xs uppercase tracking-wider text-pink-300/70 font-bold block mb-1">
                {isRtl ? 'حالة الجلسة الحالية:' : 'Current Session Status:'}
              </span>
              <div className="font-extrabold text-2xl text-white uppercase tracking-wide flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                <span>{session.status.replace(/_/g, ' ')}</span>
              </div>
            </div>

            <div className="text-end">
              <span className="text-xs uppercase tracking-wider text-pink-300/70 font-bold block mb-1">
                {isRtl ? 'السؤال / الجولة:' : 'Question / Round:'}
              </span>
              <span className="font-mono text-2xl font-black text-pink-300">
                {currentIndex + 1} / {totalQuestions}
              </span>
            </div>
          </div>

          {/* SAKURA FEUD COMPLETE CONTROL ENGINE */}
          {session.activity_type === 'sakura_feud' && currentFeudQ && (
            <div className="p-6 rounded-3xl bg-[#1b0d25] border-2 border-amber-500/30 shadow-2xl space-y-6">
              {/* Top Banner & Bank Overview */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-amber-500/20 pb-4">
                <div>
                  <span className="font-black text-base text-amber-300 flex items-center gap-2">
                    <Swords size={18} />
                    <span>{isRtl ? 'لوحة تحكم فيود ساكورا الرسمية' : 'Sakura Feud Control Center'}</span>
                  </span>
                  <p className="text-xs text-pink-200/70 mt-0.5">
                    {currentFeudQ.question_ar || currentFeudQ.question}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="px-4 py-2 rounded-2xl bg-black/60 border border-amber-400/40 text-center">
                    <span className="text-[10px] uppercase font-bold text-amber-300 block">Bank</span>
                    <span className="font-mono text-2xl font-black text-amber-400">{roundBank} pts</span>
                  </div>

                  <button
                    onClick={handleTriggerStrike}
                    className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs shadow flex items-center gap-1.5 active:scale-95 transition-all"
                  >
                    <span>❌</span>
                    <span>{isRtl ? `ضربة (${strikes}/3)` : `Strike (${strikes}/3)`}</span>
                  </button>

                  {strikes > 0 && (
                    <button
                      onClick={handleResetStrikes}
                      className="px-2.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs text-pink-200"
                      title="Reset strikes"
                    >
                      ↺
                    </button>
                  )}
                </div>
              </div>

              {/* 1. FACE-OFF SELECTION & BUZZER CONTROLS */}
              <div className="p-4 rounded-2xl bg-black/40 border border-pink-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-pink-300 flex items-center gap-1.5">
                    <Zap size={14} className="text-yellow-300" />
                    <span>{isRtl ? '1. اختيار ممثلي مواجهة السرعة (Face-Off Duel)' : '1. Face-Off Duel Selection'}</span>
                  </span>

                  <button
                    onClick={handleLaunchFaceOff}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-extrabold text-xs shadow-lg flex items-center gap-1.5 active:scale-95 transition-all"
                  >
                    <Zap size={14} />
                    <span>{isRtl ? 'إطلاق مواجهة السرعة 🚀' : 'Start Face-Off Buzzer 🚀'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-pink-300 block mb-1">
                      🌸 {isRtl ? 'ممثل فريق ساكورا:' : 'Team Sakura Rep:'}
                    </label>
                    <select
                      value={selectedRep1Id}
                      onChange={e => setSelectedRep1Id(e.target.value)}
                      className="w-full py-2 px-3 rounded-xl bg-black/60 border border-pink-500/30 text-white text-xs font-bold focus:outline-none"
                    >
                      {team1Members.length > 0 ? (
                        team1Members.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.nickname}
                          </option>
                        ))
                      ) : (
                        <option value="">No Team 1 players</option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-purple-300 block mb-1">
                      ⚔️ {isRtl ? 'ممثل فريق الكاتانا:' : 'Team Katana Rep:'}
                    </label>
                    <select
                      value={selectedRep2Id}
                      onChange={e => setSelectedRep2Id(e.target.value)}
                      className="w-full py-2 px-3 rounded-xl bg-black/60 border border-purple-500/30 text-white text-xs font-bold focus:outline-none"
                    >
                      {team2Members.length > 0 ? (
                        team2Members.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.nickname}
                          </option>
                        ))
                      ) : (
                        <option value="">No Team 2 players</option>
                      )}
                    </select>
                  </div>
                </div>

                {/* Live Buzzer Result Display */}
                {buzzerWinner && (
                  <div className="p-3 rounded-xl bg-yellow-950/60 border-2 border-yellow-400/50 flex flex-col sm:flex-row items-center justify-between gap-2 animate-scale-in">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">⚡</span>
                      <div>
                        <span className="text-[10px] uppercase font-black text-yellow-300 block">
                          {isRtl ? 'الأسرع في الضغط على الزر:' : 'FIRST TO BUZZ IN:'}
                        </span>
                        <span className="text-sm font-black text-white">
                          {buzzerWinner.nickname}{' '}
                          <span className="text-xs text-yellow-300">
                            ({buzzerWinner.team === 1 ? 'Team Sakura 🌸' : 'Team Katanas ⚔️'})
                          </span>
                        </span>
                      </div>
                    </div>

                    {buzzerWinner.slowerName && (
                      <div className="text-end text-xs text-red-300">
                        <span className="font-bold">⏱️ Slower:</span> {buzzerWinner.slowerName} (Told &quot;Not fast enough!&quot;)
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 2. PLAY OR PASS (Take Question or Leave It) */}
              <div className="p-4 rounded-2xl bg-black/40 border border-pink-500/20 space-y-2">
                <span className="text-xs font-black uppercase tracking-wider text-pink-300 block">
                  {isRtl ? '2. اختيار اللعب أو التمرير (الفائز بالإجابة الأعلى يختار):' : '2. Play or Pass (Winner of higher rank chooses):'}
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleSetActiveTeam(1)}
                    className={`py-3 px-4 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
                      activePlayingTeam === 1
                        ? 'bg-pink-600 text-white shadow-xl shadow-pink-500/40 ring-2 ring-pink-300'
                        : 'bg-pink-950/40 hover:bg-pink-900/60 border border-pink-500/30 text-pink-200'
                    }`}
                  >
                    <span>🌸</span>
                    <span>{isRtl ? 'فريق ساكورا يلعب الجولة' : 'Team Sakura Plays'}</span>
                  </button>

                  <button
                    onClick={() => handleSetActiveTeam(2)}
                    className={`py-3 px-4 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
                      activePlayingTeam === 2
                        ? 'bg-purple-600 text-white shadow-xl shadow-purple-500/40 ring-2 ring-purple-300'
                        : 'bg-purple-950/40 hover:bg-purple-900/60 border border-purple-500/30 text-purple-200'
                    }`}
                  >
                    <span>⚔️</span>
                    <span>{isRtl ? 'فريق الكاتانا يلعب الجولة' : 'Team Katanas Plays'}</span>
                  </button>
                </div>
              </div>

              {/* 3. REVEAL SURVEY BOARD ANSWERS */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-pink-300">
                    {isRtl ? '3. لوحة الإجابات (انقر لكشف الإجابة وإضافة نقاطها للبنك):' : '3. Survey Board Answers (Click to reveal & add pts):'}
                  </span>
                  <span className="text-[11px] font-mono text-amber-300">
                    {revealedAnswers.length} / {currentFeudQ.answers.length} {isRtl ? 'مكشوف' : 'revealed'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {currentFeudQ.answers.map((ans, idx) => {
                    const isRevealed = revealedAnswers.includes(idx)
                    return (
                      <button
                        key={idx}
                        onClick={() => handleRevealFeudAnswer(idx)}
                        disabled={isRevealed}
                        className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between border transition-all ${
                          isRevealed
                            ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-300 opacity-60'
                            : 'bg-black/50 border-amber-500/40 text-white hover:bg-amber-500/20 active:scale-98'
                        }`}
                      >
                        <span className="truncate max-w-[200px]">
                          #{ans.sort_order} {ans.answer_text_ar || ans.answer_text}
                        </span>
                        <span className="font-mono text-amber-300 shrink-0 font-black">
                          {isRevealed ? '✓ ' : ''}{ans.points} pts
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 4. STEAL SITUATION RESOLUTION (If 3 strikes) */}
              {strikes >= 3 && (
                <div className="p-4 rounded-2xl bg-red-950/60 border-2 border-red-500 space-y-3 animate-bounce-short">
                  <div className="flex items-center gap-2 text-red-300 font-black text-sm">
                    <ShieldAlert size={18} />
                    <span>
                      {isRtl
                        ? `🚨 3 ضربات! فرصة السرقة لفريق ${activePlayingTeam === 1 ? 'الكاتانا ⚔️' : 'ساكورا 🌸'}`
                        : `🚨 3 STRIKES! Steal attempt for ${activePlayingTeam === 1 ? 'Team Katanas ⚔️' : 'Team Sakura 🌸'}`}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      onClick={() => handleAwardRoundBank(activePlayingTeam === 1 ? 2 : 1)}
                      className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow flex items-center justify-center gap-1.5"
                    >
                      <Trophy size={14} />
                      <span>
                        {isRtl
                          ? `سرقة صحيحة! منح كل نقاط البنك (${roundBank} نقطة) للفريق السارق`
                          : `Steal Correct! Award all ${roundBank} bank pts to defending team`}
                      </span>
                    </button>

                    <button
                      onClick={() => handleAwardRoundBank(activePlayingTeam || 1)}
                      className="py-2.5 px-3 rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-black text-xs shadow flex items-center justify-center gap-1.5"
                    >
                      <XCircle size={14} />
                      <span>
                        {isRtl
                          ? `أخطأ الفريق السارق! الفريق الأصلي يحتفظ بالـ (${roundBank} نقطة)`
                          : `Steal Failed! Original team keeps ${roundBank} bank pts`}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* 5. AWARD BANK & ROUND SCORES */}
              <div className="pt-2 border-t border-amber-500/20 space-y-3">
                <span className="text-xs font-black uppercase tracking-wider text-pink-300 block">
                  {isRtl ? '4. توزيع نقاط الجولة والمجموع الإجمالي:' : '4. Award Round Bank & Scores:'}
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-2xl bg-pink-950/30 border border-pink-500/20 text-center space-y-2">
                    <div className="text-xs font-black text-pink-300">🌸 Team Sakura: {team1Score} pts</div>
                    <button
                      onClick={() => handleAwardRoundBank(1)}
                      disabled={roundBank === 0}
                      className="w-full py-2 px-3 bg-pink-600 hover:bg-pink-500 disabled:opacity-40 text-white rounded-xl text-xs font-black shadow"
                    >
                      +{roundBank} Bank Pts to Sakura
                    </button>
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleAdjustFeudScore(1, 20)}
                        className="px-2 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[10px] font-bold"
                      >
                        +20
                      </button>
                      <button
                        onClick={() => handleAdjustFeudScore(1, 50)}
                        className="px-2 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[10px] font-bold"
                      >
                        +50
                      </button>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-purple-950/30 border border-purple-500/20 text-center space-y-2">
                    <div className="text-xs font-black text-purple-300">⚔️ Team Katanas: {team2Score} pts</div>
                    <button
                      onClick={() => handleAwardRoundBank(2)}
                      disabled={roundBank === 0}
                      className="w-full py-2 px-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded-xl text-xs font-black shadow"
                    >
                      +{roundBank} Bank Pts to Katanas
                    </button>
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleAdjustFeudScore(2, 20)}
                        className="px-2 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[10px] font-bold"
                      >
                        +20
                      </button>
                      <button
                        onClick={() => handleAdjustFeudScore(2, 50)}
                        className="px-2 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[10px] font-bold"
                      >
                        +50
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MAIN ROUND STATUS TRANSITIONS */}
          <div className="p-6 rounded-3xl bg-[#1b0d25] border-2 border-pink-500/25 shadow-xl space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-pink-300">
              {isRtl ? 'إجراءات التنقل بين الجولات' : 'Session Navigation'}
            </h3>

            {/* In Lobby */}
            {session.status === 'lobby' && (
              <button
                onClick={() => updateSessionStatus('question_active', 0)}
                disabled={actionLoading}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-extrabold text-lg shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 active:scale-98 transition-all"
              >
                <Play size={20} />
                <span>{isRtl ? 'بدء الفعالية والجولة الأولى 🚀' : 'Start Game & Launch Round 1 🚀'}</span>
              </button>
            )}

            {/* Next Round or Crown Winners */}
            {session.status !== 'lobby' && (
              <div className="grid grid-cols-2 gap-3">
                {currentIndex + 1 < totalQuestions ? (
                  <button
                    onClick={() => updateSessionStatus('question_active', currentIndex + 1)}
                    disabled={actionLoading}
                    className="py-3.5 px-4 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2"
                  >
                    <SkipForward size={16} />
                    <span>{isRtl ? 'الجولة التالية ⏭️' : 'Next Round ⏭️'}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => updateSessionStatus('final_results')}
                    disabled={actionLoading}
                    className="py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2"
                  >
                    <Sparkles size={16} />
                    <span>{isRtl ? 'تتويج الفائزين والنتائج 🏆' : 'Crown Winners & Podium 🏆'}</span>
                  </button>
                )}

                <button
                  onClick={() => updateSessionStatus('lobby')}
                  disabled={actionLoading}
                  className="py-3.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-pink-300 font-bold text-sm border border-pink-500/20 flex items-center justify-center gap-2"
                >
                  <RotateCcw size={16} />
                  <span>{isRtl ? 'إرجاع للوبي' : 'Reset to Lobby'}</span>
                </button>
              </div>
            )}
          </div>

          {/* QUESTION PREVIEW (For Quiz modes) */}
          {currentQuizQ && !isZoomGame && (
            <div className="p-5 rounded-2xl bg-black/30 border border-pink-500/15">
              <span className="text-xs uppercase tracking-wider text-pink-300/70 font-bold block mb-2">
                {isRtl ? 'معاينة السؤال الحالي للمنظم:' : 'Host Question Preview:'}
              </span>
              <h4 className="text-base font-bold text-white mb-3">
                {currentQuizQ.question_text}
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {currentQuizQ.options.map(opt => (
                  <div
                    key={opt.id}
                    className={`p-2 rounded-lg border ${
                      opt.is_correct
                        ? 'bg-emerald-950/60 border-emerald-400 text-emerald-200 font-bold'
                        : 'bg-white/5 border-white/5 text-gray-300'
                    }`}
                  >
                    {opt.text} {opt.is_correct && '✓'}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ZOOM & GUESS HOST PREVIEW CARD */}
          {isZoomGame && currentZoomQ && (
            <div className="p-5 rounded-2xl bg-[#1d0b2e] border-2 border-pink-500/30 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-pink-500/20">
                <span className="text-xs font-black uppercase text-pink-300 tracking-wider flex items-center gap-1.5">
                  <span>🔍</span>
                  <span>{isRtl ? 'معلومات الشخصية المستهدفة (للمنظم)' : 'Target Character Intel (Host Only)'}</span>
                </span>
                <span className="text-xs font-mono font-bold text-amber-300">
                  {currentZoomQ.base_points} PTS MAX
                </span>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-pink-400/50 shrink-0 bg-black">
                  <img
                    src={currentZoomQ.image_url}
                    alt="Mystery Character"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h4 className="text-xl font-black text-white">
                    {currentZoomQ.character_name_ar} ({currentZoomQ.character_name})
                  </h4>
                  <p className="text-xs text-pink-200/70 mt-0.5 font-bold">
                    {isRtl ? `أنمي: ${currentZoomQ.anime_origin_ar}` : `Anime: ${currentZoomQ.anime_origin}`}
                  </p>
                  <p className="text-[11px] text-pink-300/80 mt-1">
                    💡 {isRtl ? currentZoomQ.hint_ar : currentZoomQ.hint}
                  </p>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 text-xs text-pink-200/80">
                <span className="font-bold text-pink-300">{isRtl ? 'الأسماء والتهجئات المقبولة:' : 'Accepted Aliases:'} </span>
                <span>{[currentZoomQ.character_name, currentZoomQ.character_name_ar, ...currentZoomQ.aliases].join(' • ')}</span>
              </div>

              {session.status === 'question_active' && (
                <button
                  onClick={() => updateSessionStatus('answer_reveal')}
                  disabled={actionLoading}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-black text-sm shadow-lg flex items-center justify-center gap-2"
                >
                  <Eye size={16} />
                  <span>{isRtl ? 'كشف الإجابة والصورة كاملة للجمهور 👁️' : 'Reveal Answer & Full Image 👁️'}</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: ATTENDEES & TEAM ASSIGNMENT */}
        <div className="p-5 rounded-3xl bg-black/40 border border-pink-500/20 backdrop-blur-md flex flex-col h-[750px]">
          <div className="flex items-center justify-between pb-3 border-b border-pink-500/15 mb-3">
            <div className="flex items-center gap-2 text-pink-300 font-bold text-sm">
              <Users size={16} />
              <span>{isRtl ? 'المشاركون وإدارة الفرق' : 'Attendees & Teams'}</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 text-xs font-bold">
              {participants.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-none">
            {participants.length > 0 ? (
              participants.map((p, idx) => {
                const team = participantTeams[p.id] || (idx % 2 === 0 ? 'team1' : 'team2')
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-2.5 rounded-2xl bg-white/5 border border-pink-500/10 hover:border-pink-500/25 transition-all gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xl">{getParticipantAvatar(p)}</span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate max-w-[100px]">
                          {p.nickname}
                        </div>
                        <div className="text-[10px] text-pink-200/50 font-mono">
                          {p.score || 0} pts
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Host can move participant to other team */}
                      <button
                        onClick={() => handleMoveParticipantTeam(p.id, team === 'team1' ? 'team2' : 'team1')}
                        className={`px-2 py-1 rounded-xl text-[10px] font-extrabold flex items-center gap-1 transition-all ${
                          team === 'team1'
                            ? 'bg-pink-600/30 text-pink-300 border border-pink-400/30 hover:bg-pink-600 hover:text-white'
                            : 'bg-purple-600/30 text-purple-300 border border-purple-400/30 hover:bg-purple-600 hover:text-white'
                        }`}
                        title="Click to move participant to other team"
                      >
                        <ArrowRightLeft size={10} />
                        <span>{team === 'team1' ? '🌸 Sakura' : '⚔️ Katana'}</span>
                      </button>

                      <button
                        onClick={() => handleKickParticipant(p.id)}
                        className="p-1 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors"
                        title="Remove participant"
                        aria-label={`Remove participant ${p.nickname}`}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="h-full flex items-center justify-center text-center text-xs text-pink-300/40 p-4">
                {isRtl ? 'لا يوجد لاعبون منضمون حتى الآن' : 'No attendees in room yet.'}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
