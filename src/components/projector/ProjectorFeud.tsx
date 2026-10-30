'use client'

import { Swords, X, Trophy, Zap, Clock, ShieldAlert, Users } from 'lucide-react'
import type { GameSession, SessionParticipant } from '@/types/database'
import type { FeudQuestionData } from '@/lib/gameData'
import { getQuestionIndex, getParticipantAvatar } from '@/lib/gameHelpers'

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
    roundBank?: number
    faceoff?: {
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
    isSteal?: boolean
    participantTeams?: Record<string, 'team1' | 'team2'>
  }
  locale?: string
}

export default function ProjectorFeud({
  session,
  participants,
  rounds,
  roundState,
  locale = 'en',
}: ProjectorFeudProps) {
  const isRtl = locale === 'ar'
  const roundIndex = getQuestionIndex(session)
  const currentRound = rounds[roundIndex] || rounds[0]

  const calculatedBank = currentRound?.answers
    .filter((_, idx) => roundState.revealedAnswerIndices.includes(idx))
    .reduce((sum, a) => sum + a.points, 0) || 0

  const displayBank = typeof roundState.roundBank === 'number' && roundState.roundBank > 0
    ? roundState.roundBank
    : calculatedBank

  // Group participants into teams based on participantTeams mapping
  const team1Participants = participants.filter(p => {
    const t = roundState.participantTeams?.[p.id]
    return t === 'team1' || !t // default to team1 if not assigned
  })
  const team2Participants = participants.filter(p => {
    const t = roundState.participantTeams?.[p.id]
    return t === 'team2'
  })

  return (
    <div className="w-full max-w-5xl flex flex-col items-center justify-between gap-5 py-2 animate-fade-in">
      {/* Top Feud Header: Teams & Current Bank */}
      <div className="w-full grid grid-cols-3 items-center gap-4">
        {/* TEAM 1 (Sakura) */}
        <div
          className={`p-4 sm:p-5 rounded-2xl border-2 backdrop-blur-md transition-all duration-300 ${
            roundState.activeTeam === 1
              ? 'bg-pink-600/30 border-pink-400 shadow-2xl shadow-pink-500/30 scale-[1.03] ring-2 ring-pink-400/50'
              : 'bg-black/30 border-pink-500/15'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🌸</span>
              <span className="font-black text-sm sm:text-base text-pink-300 uppercase tracking-wide">
                {isRtl ? 'فريق ساكورا' : 'Team Sakura'}
              </span>
            </div>
            {roundState.activeTeam === 1 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-pink-500 text-white animate-pulse">
                {isRtl ? 'دور اللعب' : 'PLAYING'}
              </span>
            )}
          </div>
          <div className="font-mono text-3xl sm:text-4xl font-black text-white">
            {roundState.team1Score} <span className="text-xs text-pink-300 font-sans">pts</span>
          </div>
          <div className="text-[11px] text-pink-200/60 mt-1 flex items-center gap-1">
            <Users size={12} />
            <span>{team1Participants.length} {isRtl ? 'أعضاء' : 'members'}</span>
          </div>
        </div>

        {/* CURRENT ROUND BANK */}
        <div className="text-center p-3 sm:p-4 rounded-2xl bg-black/60 border-2 border-amber-500/40 shadow-xl shadow-amber-500/10">
          <span className="text-xs uppercase tracking-widest text-amber-300 font-black block mb-1">
            {isRtl ? 'نقاط الجولة الحالية' : 'Round Bank'}
          </span>
          <div className="font-mono text-4xl sm:text-5xl font-black text-amber-400 drop-shadow-[0_0_25px_rgba(245,158,11,0.6)]">
            {displayBank}
          </div>
        </div>

        {/* TEAM 2 (Katanas) */}
        <div
          className={`p-4 sm:p-5 rounded-2xl border-2 backdrop-blur-md text-end transition-all duration-300 ${
            roundState.activeTeam === 2
              ? 'bg-purple-600/30 border-purple-400 shadow-2xl shadow-purple-500/30 scale-[1.03] ring-2 ring-purple-400/50'
              : 'bg-black/30 border-purple-500/15'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            {roundState.activeTeam === 2 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-500 text-white animate-pulse">
                {isRtl ? 'دور اللعب' : 'PLAYING'}
              </span>
            )}
            <div className="flex items-center justify-end gap-2 ms-auto">
              <span className="font-black text-sm sm:text-base text-purple-300 uppercase tracking-wide">
                {isRtl ? 'فريق الكاتانا' : 'Team Katanas'}
              </span>
              <span className="text-2xl">⚔️</span>
            </div>
          </div>
          <div className="font-mono text-3xl sm:text-4xl font-black text-white">
            {roundState.team2Score} <span className="text-xs text-purple-300 font-sans">pts</span>
          </div>
          <div className="text-[11px] text-purple-200/60 mt-1 flex items-center justify-end gap-1">
            <span>{team2Participants.length} {isRtl ? 'أعضاء' : 'members'}</span>
            <Users size={12} />
          </div>
        </div>
      </div>

      {/* ============================================================
          FACEOFF & BUZZER WINNER LIVE STAGE BANNER
          ============================================================ */}
      {roundState.faceoff && (
        <div className="w-full rounded-2xl p-4 bg-gradient-to-r from-pink-950/60 via-purple-950/50 to-pink-950/60 border-2 border-pink-400/40 shadow-xl text-center animate-fade-in">
          {roundState.faceoff.winnerName ? (
            /* BUZZER WINNER + SLOWER CONTESTANT */
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-400/20 border border-yellow-400/50 flex items-center justify-center text-yellow-300 font-black">
                  <Zap size={22} className="animate-bounce" />
                </div>
                <div className="text-start">
                  <div className="text-[10px] uppercase font-black tracking-widest text-yellow-300">
                    {isRtl ? 'الأسرع في الضغط على الزر ⚡' : 'FIRST TO BUZZ IN ⚡'}
                  </div>
                  <div className="text-lg sm:text-xl font-black text-white">
                    {roundState.faceoff.winnerName}{' '}
                    <span className="text-sm font-bold text-pink-300">
                      ({roundState.faceoff.winnerTeam === 1 ? (isRtl ? 'فريق ساكورا 🌸' : 'Team Sakura 🌸') : (isRtl ? 'فريق الكاتانا ⚔️' : 'Team Katanas ⚔️')})
                    </span>
                  </div>
                </div>
              </div>

              {roundState.faceoff.slowerName && (
                <div className="px-4 py-2 rounded-xl bg-red-950/50 border border-red-500/30 text-end">
                  <div className="text-[10px] uppercase font-bold text-red-300">
                    {isRtl ? 'لست سريعاً بما فيه الكفاية ⏱️' : 'Not fast enough! ⏱️'}
                  </div>
                  <div className="text-sm font-bold text-red-200">
                    {roundState.faceoff.slowerName}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* FACEOFF DUEL READY */
            <div className="flex items-center justify-center gap-6">
              <div className="text-end">
                <span className="text-xs uppercase text-pink-300 font-bold block">🌸 Team Sakura Rep</span>
                <span className="text-lg font-black text-white">{roundState.faceoff.rep1Name}</span>
              </div>
              <div className="w-10 h-10 rounded-full bg-pink-500/20 border border-pink-400/40 flex items-center justify-center font-black text-pink-200">
                VS
              </div>
              <div className="text-start">
                <span className="text-xs uppercase text-purple-300 font-bold block">⚔️ Team Katana Rep</span>
                <span className="text-lg font-black text-white">{roundState.faceoff.rep2Name}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          3 STRIKES STEAL ALERT BANNER
          ============================================================ */}
      {roundState.strikes === 3 && (
        <div className="w-full p-4 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-600 text-white font-black text-center shadow-2xl shadow-red-600/50 animate-bounce flex items-center justify-center gap-3">
          <ShieldAlert size={28} className="text-yellow-300" />
          <span className="text-base sm:text-lg tracking-wide">
            {isRtl
              ? `🚨 3 ضربات خاطئة! فرصة السرقة متاحة لـ ${roundState.activeTeam === 1 ? 'فريق الكاتانا ⚔️' : 'فريق ساكورا 🌸'} لخطف جميع نقاط الجولة (${displayBank} نقطة)!`
              : `🚨 3 STRIKES! STEAL ATTEMPT FOR ${roundState.activeTeam === 1 ? 'TEAM KATANAS ⚔️' : 'TEAM SAKURA 🌸'} TO TAKE ALL ${displayBank} BANK POINTS!`}
          </span>
        </div>
      )}

      {/* Survey Question Card */}
      <div className="w-full text-center p-6 rounded-3xl bg-black/40 border border-pink-500/20 backdrop-blur-xl shadow-2xl">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/15 text-pink-300 text-xs font-bold uppercase mb-2">
          <Swords size={14} />
          <span>{isRtl ? `الجولة ${roundIndex + 1}` : `Round ${roundIndex + 1}`}</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
          {currentRound?.question_ar || currentRound?.question}
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
                  ? 'bg-red-600/40 border-red-500 text-red-500 shadow-xl shadow-red-500/40 scale-110 animate-bounce'
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
                      {ans.answer_text_ar || ans.answer_text}
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

      {/* ============================================================
          LIVE TEAMS ROSTER AT PROJECTOR BOTTOM
          ============================================================ */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2 pt-3 border-t border-pink-500/15">
        {/* Team 1 Roster */}
        <div className="p-3 rounded-2xl bg-black/30 border border-pink-500/15">
          <div className="text-xs font-bold text-pink-300 mb-2 flex items-center justify-between">
            <span>🌸 {isRtl ? 'أعضاء فريق ساكورا' : 'Team Sakura Members'}</span>
            <span className="font-mono text-[10px] text-pink-400/70">{team1Participants.length}</span>
          </div>
          <div className="flex flex-wrap gap-2 max-h-20 overflow-y-auto scrollbar-none">
            {team1Participants.length > 0 ? (
              team1Participants.map(p => (
                <span
                  key={p.id}
                  className="px-2.5 py-1 rounded-xl bg-pink-500/10 border border-pink-400/20 text-xs text-pink-200 font-bold flex items-center gap-1"
                >
                  <span>{getParticipantAvatar(p)}</span>
                  <span>{p.nickname}</span>
                </span>
              ))
            ) : (
              <span className="text-xs text-pink-300/40 italic">{isRtl ? 'لا يوجد أعضاء' : 'No members yet'}</span>
            )}
          </div>
        </div>

        {/* Team 2 Roster */}
        <div className="p-3 rounded-2xl bg-black/30 border border-purple-500/15">
          <div className="text-xs font-bold text-purple-300 mb-2 flex items-center justify-between">
            <span>⚔️ {isRtl ? 'أعضاء فريق الكاتانا' : 'Team Katana Members'}</span>
            <span className="font-mono text-[10px] text-purple-400/70">{team2Participants.length}</span>
          </div>
          <div className="flex flex-wrap gap-2 max-h-20 overflow-y-auto scrollbar-none">
            {team2Participants.length > 0 ? (
              team2Participants.map(p => (
                <span
                  key={p.id}
                  className="px-2.5 py-1 rounded-xl bg-purple-500/10 border border-purple-400/20 text-xs text-purple-200 font-bold flex items-center gap-1"
                >
                  <span>{getParticipantAvatar(p)}</span>
                  <span>{p.nickname}</span>
                </span>
              ))
            ) : (
              <span className="text-xs text-purple-300/40 italic">{isRtl ? 'لا يوجد أعضاء' : 'No members yet'}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
