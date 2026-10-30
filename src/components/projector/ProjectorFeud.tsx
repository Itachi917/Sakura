'use client'

import { Swords, X, Trophy } from 'lucide-react'
import type { GameSession, SessionParticipant } from '@/types/database'
import type { FeudQuestionData } from '@/lib/gameData'
import { getQuestionIndex } from '@/lib/gameHelpers'

interface ProjectorFeudProps {
  session: GameSession
  participants: SessionParticipant[]
  rounds: FeudQuestionData[]
  roundState: {
    team1Score: number
    team2Score: number
    strikes: number
    revealedAnswerIndices: number[]
    activeTeam: 1 | 2 | null
  }
  locale?: string
}

export default function ProjectorFeud({
  session,
  rounds,
  roundState,
  locale = 'en',
}: ProjectorFeudProps) {
  const isRtl = locale === 'ar'
  const roundIndex = getQuestionIndex(session)
  const currentRound = rounds[roundIndex] || rounds[0]

  const roundPointsTotal = currentRound?.answers
    .filter((_, idx) => roundState.revealedAnswerIndices.includes(idx))
    .reduce((sum, a) => sum + a.points, 0) || 0

  return (
    <div className="w-full max-w-5xl flex flex-col items-center justify-between gap-6 py-2 animate-fade-in">
      {/* Top Feud Header: Teams & Current Bank */}
      <div className="w-full grid grid-cols-3 items-center gap-4">
        {/* TEAM 1 (Sakura) */}
        <div
          className={`p-4 sm:p-5 rounded-2xl border-2 backdrop-blur-md transition-all ${
            roundState.activeTeam === 1
              ? 'bg-pink-600/25 border-pink-400 shadow-xl shadow-pink-500/20 scale-[1.03]'
              : 'bg-black/30 border-pink-500/15'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🌸</span>
            <span className="font-extrabold text-sm sm:text-base text-pink-300 uppercase tracking-wide">
              {isRtl ? 'فريق ساكورا' : 'Team Sakura'}
            </span>
          </div>
          <div className="font-mono text-3xl sm:text-4xl font-black text-white">
            {roundState.team1Score} <span className="text-xs text-pink-300 font-sans">pts</span>
          </div>
        </div>

        {/* CURRENT ROUND BANK */}
        <div className="text-center p-3 rounded-2xl bg-black/50 border border-amber-500/30">
          <span className="text-xs uppercase tracking-widest text-amber-300/80 font-bold block mb-1">
            {isRtl ? 'نقاط الجولة الحالية' : 'Round Bank'}
          </span>
          <div className="font-mono text-4xl sm:text-5xl font-black text-amber-400 drop-shadow-[0_0_20px_rgba(245,158,11,0.5)]">
            {roundPointsTotal}
          </div>
        </div>

        {/* TEAM 2 (Katanas) */}
        <div
          className={`p-4 sm:p-5 rounded-2xl border-2 backdrop-blur-md text-end transition-all ${
            roundState.activeTeam === 2
              ? 'bg-purple-600/25 border-purple-400 shadow-xl shadow-purple-500/20 scale-[1.03]'
              : 'bg-black/30 border-purple-500/15'
          }`}
        >
          <div className="flex items-center justify-end gap-2 mb-1">
            <span className="font-extrabold text-sm sm:text-base text-purple-300 uppercase tracking-wide">
              {isRtl ? 'فريق الكاتانا' : 'Team Katanas'}
            </span>
            <span className="text-2xl">⚔️</span>
          </div>
          <div className="font-mono text-3xl sm:text-4xl font-black text-white">
            {roundState.team2Score} <span className="text-xs text-purple-300 font-sans">pts</span>
          </div>
        </div>
      </div>

      {/* Survey Question Card */}
      <div className="w-full text-center p-6 rounded-3xl bg-black/40 border border-pink-500/20 backdrop-blur-xl shadow-2xl">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/15 text-pink-300 text-xs font-bold uppercase mb-2">
          <Swords size={14} />
          <span>{isRtl ? `الجولة ${roundIndex + 1}` : `Round ${roundIndex + 1}`}</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
          {isRtl ? currentRound?.question_ar : currentRound?.question}
        </h2>
      </div>

      {/* Strikes Display (3 Strike Boxes) */}
      <div className="flex items-center justify-center gap-4 my-1">
        {[1, 2, 3].map(strikeNum => {
          const isStruck = roundState.strikes >= strikeNum
          return (
            <div
              key={strikeNum}
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border-2 flex items-center justify-center font-black transition-all ${
                isStruck
                  ? 'bg-red-600/30 border-red-500 text-red-500 shadow-xl shadow-red-500/30 scale-110 animate-bounce'
                  : 'bg-black/20 border-white/10 text-white/10'
              }`}
            >
              <X size={36} strokeWidth={isStruck ? 4 : 2} />
            </div>
          )
        })}
      </div>

      {/* The 5-Slot Family Feud Board */}
      <div className="w-full max-w-3xl space-y-3">
        {currentRound?.answers.map((ans, idx) => {
          const isRevealed = roundState.revealedAnswerIndices.includes(idx)

          return (
            <div
              key={idx}
              className={`h-16 sm:h-20 rounded-2xl border-2 flex items-center justify-between px-6 transition-all duration-700 shadow-lg ${
                isRevealed
                  ? 'bg-gradient-to-r from-blue-900/40 via-purple-900/30 to-pink-900/40 border-pink-400 text-white shadow-pink-500/20'
                  : 'bg-black/50 border-pink-500/20 text-pink-200/40'
              }`}
            >
              {isRevealed ? (
                <>
                  <div className="flex items-center gap-4 min-w-0">
                    <span className="w-8 h-8 rounded-lg bg-pink-500/30 border border-pink-400/40 flex items-center justify-center font-bold text-sm text-pink-200">
                      {ans.sort_order}
                    </span>
                    <span className="text-xl sm:text-2xl font-black tracking-wide truncate">
                      {isRtl ? ans.answer_text_ar : ans.answer_text}
                    </span>
                  </div>
                  <div className="font-mono text-2xl sm:text-3xl font-black px-4 py-1.5 rounded-xl bg-pink-500/20 border border-pink-400/30 text-pink-200 shadow-inner">
                    {ans.points}
                  </div>
                </>
              ) : (
                <div className="w-full flex items-center justify-center">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-mono text-xl font-bold text-pink-300/40">
                    {ans.sort_order}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
