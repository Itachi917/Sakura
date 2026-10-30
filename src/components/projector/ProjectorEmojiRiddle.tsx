'use client'

import { useState, useEffect } from 'react'
import { Trophy, Clock, Sparkles } from 'lucide-react'
import { sound } from '@/lib/sound'
import { createClient } from '@/lib/supabase/client'
import type { EmojiRiddleData } from '@/lib/gameData'
import type { GameSession, SessionParticipant } from '@/types/database'

interface ProjectorEmojiRiddleProps {
  session: GameSession
  participants: SessionParticipant[]
  currentQuestion: EmojiRiddleData
  questionIndex: number
  totalQuestions: number
  locale?: string
}

interface LiveSolver {
  participantId: string
  nickname: string
  points: number
  elapsedSeconds: number
}

export default function ProjectorEmojiRiddle({
  session,
  participants,
  currentQuestion,
  questionIndex,
  totalQuestions,
  locale = 'en',
}: ProjectorEmojiRiddleProps) {
  const isRtl = locale === 'ar'
  const supabase = createClient()

  const totalSeconds = currentQuestion.total_time_seconds || 20
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [solvers, setSolvers] = useState<LiveSolver[]>([])

  const isRevealed =
    session.status === 'answer_reveal' ||
    session.status === 'round_results' ||
    session.status === 'final_results'

  const timeLeft = Math.max(0, totalSeconds - elapsedSeconds)

  useEffect(() => {
    setElapsedSeconds(0)
    setSolvers([])
  }, [currentQuestion.id, questionIndex])

  // Timer interval on projector with auto-reveal on timeout
  useEffect(() => {
    if (isRevealed) return

    const timer = setInterval(() => {
      setElapsedSeconds((prev) => {
        if (prev >= totalSeconds - 1) {
          clearInterval(timer)
          sound.playBuzzer()
          supabase
            .from('game_sessions')
            .update({ status: 'answer_reveal' })
            .eq('id', session.id)
            .then(() => {})
          return totalSeconds
        }
        return prev + 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isRevealed, totalSeconds, session.id, supabase])

  // Listen for solves
  useEffect(() => {
    const channel = supabase
      .channel(`emoji_stream_${session.id}`)
      .on('broadcast', { event: 'emoji_solve' }, (payload) => {
        sound.playCorrect()
        const newSolver: LiveSolver = payload.payload
        setSolvers((prev) => {
          if (prev.some((s) => s.participantId === newSolver.participantId)) return prev
          return [...prev, newSolver]
        })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [session.id, supabase])

  return (
    <div className="w-full flex-1 flex flex-col justify-between p-6 max-w-7xl mx-auto select-none animate-fade-in">
      {/* ── TOP HUD ── */}
      <div className="flex items-center justify-between p-4 rounded-3xl bg-black/40 border border-pink-500/20 backdrop-blur-xl mb-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <span className="w-3.5 h-3.5 rounded-full bg-pink-500 animate-ping" />
          <span className="text-xl font-black text-white tracking-wider flex items-center gap-2">
            <span>🎭</span>
            <span>{isRtl ? 'لغز إيموجي الأنمي' : 'Anime Emoji Riddle'}</span>
          </span>
          <span className="px-3 py-1 rounded-full bg-pink-500/20 text-pink-300 font-mono text-sm font-bold border border-pink-400/30">
            {questionIndex + 1} / {totalQuestions}
          </span>
        </div>

        <div
          className={`flex items-center gap-2 px-6 py-2 rounded-2xl border-2 font-mono text-2xl font-black transition-all ${
            timeLeft <= 5 && !isRevealed
              ? 'bg-rose-600/40 border-rose-400 text-rose-200 animate-bounce'
              : 'bg-white/10 border-pink-400/30 text-white'
          }`}
        >
          <Clock className="w-6 h-6 text-pink-300" />
          <span>{timeLeft}s</span>
        </div>
      </div>

      {/* ── MAIN EMOJI STAGE ── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center min-h-[460px]">
        {/* Emoji Centerpiece (8 cols) */}
        <div className="lg:col-span-8 flex flex-col items-center justify-center text-center">
          <div className="w-full max-w-2xl p-10 rounded-3xl bg-gradient-to-b from-[#251033] to-[#12071a] border-4 border-pink-500/30 shadow-[0_0_60px_rgba(236,72,153,0.3)] relative overflow-hidden flex flex-col items-center justify-center min-h-[320px]">
            <span className="text-xs uppercase tracking-widest text-pink-300/80 font-black mb-4">
              {isRtl ? 'خمّن الأنمي من الرموز التالية:' : 'Guess the anime from these emojis:'}
            </span>

            {/* Giant Floating Emojis */}
            <div className="text-6xl sm:text-7xl lg:text-8xl tracking-widest animate-bounce my-4 drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]">
              {currentQuestion.emojis}
            </div>

            <div className="mt-4 px-4 py-1.5 rounded-full bg-white/5 border border-pink-500/20 text-xs text-pink-200 font-bold">
              💡 {isRtl ? currentQuestion.hint_ar : currentQuestion.hint}
            </div>
          </div>

          {/* Reveal Banner */}
          {isRevealed && (
            <div className="mt-6 p-5 rounded-2xl bg-gradient-to-r from-pink-600/30 via-purple-600/30 to-rose-600/30 border border-pink-400/50 backdrop-blur-xl text-center animate-scale-in max-w-xl w-full">
              <span className="text-xs font-black uppercase text-pink-300 tracking-widest block mb-1">
                {isRtl ? '🎉 الإجابة الصحيحة هي:' : '🎉 The Answer Is:'}
              </span>
              <h2 className="text-4xl font-black text-white drop-shadow-lg">
                {isRtl ? currentQuestion.answer_ar : currentQuestion.answer}
              </h2>
              <p className="text-sm text-pink-200 mt-1 font-bold">
                {isRtl ? `أنمي: ${currentQuestion.anime_origin_ar}` : `Anime: ${currentQuestion.anime_origin}`}
              </p>
            </div>
          )}
        </div>

        {/* Live Solvers List (4 cols) */}
        <div className="lg:col-span-4 h-full flex flex-col justify-between">
          <div className="p-5 rounded-3xl bg-black/40 border border-pink-500/20 backdrop-blur-xl shadow-xl flex-1 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-pink-500/20 mb-3">
              <span className="text-sm font-black uppercase text-pink-300 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>{isRtl ? 'المجيبون الأسرع' : 'Fastest Solvers'}</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-mono text-xs font-bold">
                {solvers.length} / {participants.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[380px]">
              {solvers.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-center text-pink-200/50">
                  <Sparkles className="w-8 h-8 mb-2 animate-spin text-pink-400" />
                  <p className="text-xs">
                    {isRtl ? 'من سيحل لغز الإيموجي أولاً؟' : 'Who will decipher the emojis first?'}
                  </p>
                </div>
              ) : (
                solvers.map((s, idx) => (
                  <div
                    key={s.participantId}
                    className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-pink-500/20 animate-scale-in"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 text-white font-mono text-xs font-black flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-white text-sm">{s.nickname}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className="text-pink-300">{s.elapsedSeconds}s</span>
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 font-black border border-emerald-500/30">
                        +{s.points}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

