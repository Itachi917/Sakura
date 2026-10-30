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
  type QuizQuestionData,
  type FeudQuestionData,
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
  const [feudRounds, setFeudRounds] = useState<FeudQuestionData[]>(SAKURA_FEUD_ROUNDS)

  // Feud host state
  const [team1Score, setTeam1Score] = useState(0)
  const [team2Score, setTeam2Score] = useState(0)
  const [strikes, setStrikes] = useState(0)
  const [revealedAnswers, setRevealedAnswers] = useState<number[]>([])

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

        if (sess.activity_type === 'whos_that_character') {
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

        if (parts) setParticipants(parts)
      } catch (err) {
        console.error('Fetch error:', err)
        setError('Error loading host controls.')
      } finally {
        setLoading(false)
      }
    }

    fetchSession()
  }, [sessionId])

  // Realtime subscription for participant joins and score updates
  useEffect(() => {
    const channel = supabase
      .channel(`host_sync_${sessionId}`)
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
              if (data) setParticipants(data)
            })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId])

  // State Transition Handlers
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
      if (data) setSession(data)
    } catch (err: unknown) {
      console.error('Status transition error:', err)
    } finally {
      setActionLoading(false)
    }
  }

  // Feud Broadcast Triggers
  const handleTriggerStrike = async () => {
    sound.playStrike()
    const nextStrikes = (strikes + 1) % 4
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

  const handleRevealFeudAnswer = async (index: number) => {
    sound.playReveal()
    const updated = [...revealedAnswers, index]
    setRevealedAnswers(updated)

    await supabase.channel(`projector_session_${sessionId}`).send({
      type: 'broadcast',
      event: 'feud_event',
      payload: {
        type: 'reveal_answer',
        data: { index },
      },
    })
  }

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
  const totalQuestions = quizQuestions.length || feudRounds.length || 5
  const currentQuizQ = quizQuestions[currentIndex]
  const currentFeudQ = feudRounds[currentIndex]

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

          {/* MAIN ACTION BUTTONS */}
          <div className="p-6 rounded-3xl bg-[#1b0d25] border-2 border-pink-500/25 shadow-xl space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-pink-300">
              {isRtl ? 'إجراءات التحكم بالجولة' : 'Host Actions'}
            </h3>

            {/* In Lobby */}
            {session.status === 'lobby' && (
              <button
                onClick={() => updateSessionStatus('question_active', 0)}
                disabled={actionLoading}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-extrabold text-lg shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 active:scale-98 transition-all"
              >
                <Play size={20} />
                <span>{isRtl ? 'بدء الفعالية والسؤال الأول 🚀' : 'Start Game & Launch Question 1 🚀'}</span>
              </button>
            )}

            {/* In Question Active */}
            {session.status === 'question_active' && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => updateSessionStatus('answer_collection_ended')}
                  disabled={actionLoading}
                  className="py-3.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2"
                >
                  <Pause size={16} />
                  <span>{isRtl ? 'إنهاء وقت الإجابات' : 'End Answering'}</span>
                </button>
                <button
                  onClick={() => updateSessionStatus('answer_reveal')}
                  disabled={actionLoading}
                  className="py-3.5 px-4 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2"
                >
                  <Eye size={16} />
                  <span>{isRtl ? 'كشف الإجابة الصحيحة' : 'Reveal Answer'}</span>
                </button>
              </div>
            )}

            {/* In Reveal Phase */}
            {['answer_collection_ended', 'answer_reveal', 'round_results'].includes(
              session.status
            ) && (
              <div className="grid grid-cols-2 gap-3">
                {currentIndex + 1 < totalQuestions ? (
                  <button
                    onClick={() => updateSessionStatus('question_active', currentIndex + 1)}
                    disabled={actionLoading}
                    className="py-3.5 px-4 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2"
                  >
                    <SkipForward size={16} />
                    <span>{isRtl ? 'السؤال التالي ⏭️' : 'Next Question ⏭️'}</span>
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

            {/* Completed */}
            {session.status === 'final_results' && (
              <button
                onClick={() => updateSessionStatus('completed')}
                disabled={actionLoading}
                className="w-full py-3.5 rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-bold text-sm"
              >
                {isRtl ? 'إنهاء وأرشفة الجلسة' : 'Finish & Archive Session'}
              </button>
            )}
          </div>

          {/* SAKURA FEUD SPECIFIC CONTROLS */}
          {session.activity_type === 'sakura_feud' && currentFeudQ && (
            <div className="p-6 rounded-3xl bg-[#1b0d25] border-2 border-amber-500/25 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
                <span className="font-bold text-sm text-amber-300 flex items-center gap-2">
                  <Swords size={16} />
                  <span>{isRtl ? 'أدوات تحكم فيود ساكورا' : 'Sakura Feud Host Controls'}</span>
                </span>
                <button
                  onClick={handleTriggerStrike}
                  className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs shadow flex items-center gap-1.5"
                >
                  <span>❌</span>
                  <span>{isRtl ? `تسجيل ضربة (Strikes: ${strikes})` : `Add Strike (${strikes}/3)`}</span>
                </button>
              </div>

              {/* Reveal individual answers buttons */}
              <div className="space-y-2">
                <span className="text-xs text-pink-300/80 font-bold block">
                  {isRtl ? 'كشف إجابات اللوحة للمشاهدين:' : 'Reveal Board Answers:'}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {currentFeudQ.answers.map((ans, idx) => {
                    const isRevealed = revealedAnswers.includes(idx)
                    return (
                      <button
                        key={idx}
                        onClick={() => handleRevealFeudAnswer(idx)}
                        disabled={isRevealed}
                        className={`p-2.5 rounded-xl text-xs font-bold flex items-center justify-between border transition-all ${
                          isRevealed
                            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 opacity-60'
                            : 'bg-black/40 border-amber-500/30 text-white hover:bg-amber-500/20'
                        }`}
                      >
                        <span>
                          #{ans.sort_order} {ans.answer_text}
                        </span>
                        <span className="font-mono text-amber-300">{ans.points} pts</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Score adjusting buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-pink-950/30 border border-pink-500/20 text-center">
                  <div className="text-xs font-bold text-pink-300 mb-1">Team Sakura: {team1Score}</div>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleAdjustFeudScore(1, 20)}
                      className="px-3 py-1 bg-pink-600 text-white rounded-lg text-xs font-bold"
                    >
                      +20
                    </button>
                    <button
                      onClick={() => handleAdjustFeudScore(1, 50)}
                      className="px-3 py-1 bg-pink-600 text-white rounded-lg text-xs font-bold"
                    >
                      +50
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/20 text-center">
                  <div className="text-xs font-bold text-purple-300 mb-1">Team Katanas: {team2Score}</div>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleAdjustFeudScore(2, 20)}
                      className="px-3 py-1 bg-purple-600 text-white rounded-lg text-xs font-bold"
                    >
                      +20
                    </button>
                    <button
                      onClick={() => handleAdjustFeudScore(2, 50)}
                      className="px-3 py-1 bg-purple-600 text-white rounded-lg text-xs font-bold"
                    >
                      +50
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* QUESTION PREVIEW ACCORDION */}
          {currentQuizQ && (
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
        </div>

        {/* RIGHT COLUMN: ATTENDEES & PARTICIPANT MANAGEMENT */}
        <div className="p-5 rounded-3xl bg-black/40 border border-pink-500/20 backdrop-blur-md flex flex-col h-[650px]">
          <div className="flex items-center justify-between pb-3 border-b border-pink-500/15 mb-3">
            <div className="flex items-center gap-2 text-pink-300 font-bold text-sm">
              <Users size={16} />
              <span>{isRtl ? 'المشاركون المتصلون' : 'Joined Attendees'}</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 text-xs font-bold">
              {participants.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-none">
            {participants.length > 0 ? (
              participants.map((p, idx) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-pink-500/10 hover:border-pink-500/25 transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-mono text-xs text-pink-400/60 w-4">
                      #{idx + 1}
                    </span>
                    <span className="text-lg">{getParticipantAvatar(p)}</span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate max-w-[120px]">
                        {p.nickname}
                      </div>
                      <div className="text-[10px] text-pink-200/50 font-mono">
                        {p.score || 0} pts
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleKickParticipant(p.id)}
                    className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors"
                    title="Remove participant"
                    aria-label={`Remove participant ${p.nickname}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
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
