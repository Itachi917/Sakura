'use client'

import { Trophy, Medal, Award, Crown, Sparkles } from 'lucide-react'
import type { GameSession, SessionParticipant } from '@/types/database'
import { getParticipantAvatar } from '@/lib/gameHelpers'

interface ProjectorLeaderboardProps {
  session: GameSession
  participants: SessionParticipant[]
  locale?: string
}

export default function ProjectorLeaderboard({
  session,
  participants,
  locale = 'en',
}: ProjectorLeaderboardProps) {
  const isRtl = locale === 'ar'
  const sorted = [...participants].sort((a, b) => (b.score || 0) - (a.score || 0))

  const firstPlace = sorted[0]
  const secondPlace = sorted[1]
  const thirdPlace = sorted[2]
  const restPlaces = sorted.slice(3, 10)

  return (
    <div className="w-full max-w-5xl flex flex-col items-center justify-between gap-8 py-4 animate-fade-in">
      {/* Title */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-pink-500/20 text-pink-300 text-sm font-bold border border-pink-400/30 mb-2">
          <Sparkles size={16} />
          <span>{isRtl ? 'النتائج النهائية — أبطال الجولة' : 'Final Results — Champions Podium'}</span>
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white">
          {isRtl ? 'لوحة الشرف والتتويج 🌸' : 'Sakura Hall of Fame 🌸'}
        </h1>
      </div>

      {/* The 3D-Style Podium (2nd - 1st - 3rd) */}
      <div className="w-full grid grid-cols-3 gap-4 items-end max-w-3xl my-6">
        {/* 2ND PLACE (SILVER) */}
        <div className="flex flex-col items-center">
          {secondPlace ? (
            <div className="flex flex-col items-center animate-slide-up">
              <span className="text-4xl sm:text-5xl mb-2 drop-shadow-lg" role="img" aria-label="avatar">
                {getParticipantAvatar(secondPlace)}
              </span>
              <span className="font-extrabold text-white text-base sm:text-lg truncate max-w-[140px] text-center">
                {secondPlace.nickname}
              </span>
              <span className="font-mono text-sm sm:text-base font-bold text-gray-300 mb-3">
                {secondPlace.score} pts
              </span>
            </div>
          ) : (
            <div className="h-20" />
          )}
          <div className="w-full h-36 sm:h-44 rounded-t-3xl bg-gradient-to-t from-gray-700 to-gray-500 border-t-2 border-gray-300 flex flex-col items-center justify-center shadow-xl">
            <Medal size={36} className="text-gray-200 mb-1" />
            <span className="text-3xl sm:text-4xl font-black text-white">2</span>
          </div>
        </div>

        {/* 1ST PLACE (GOLD) */}
        <div className="flex flex-col items-center">
          {firstPlace ? (
            <div className="flex flex-col items-center animate-bounce">
              <Crown size={36} className="text-amber-400 mb-1 drop-shadow-[0_0_15px_rgba(251,191,36,0.8)]" />
              <span className="text-5xl sm:text-6xl mb-2 drop-shadow-2xl" role="img" aria-label="avatar">
                {getParticipantAvatar(firstPlace)}
              </span>
              <span className="font-black text-white text-lg sm:text-2xl truncate max-w-[180px] text-center">
                {firstPlace.nickname}
              </span>
              <span className="font-mono text-base sm:text-lg font-black text-amber-300 mb-3">
                {firstPlace.score} pts
              </span>
            </div>
          ) : (
            <div className="h-24" />
          )}
          <div className="w-full h-52 sm:h-64 rounded-t-3xl bg-gradient-to-t from-amber-700 via-amber-600 to-yellow-400 border-t-4 border-yellow-200 flex flex-col items-center justify-center shadow-2xl shadow-amber-500/30">
            <Trophy size={48} className="text-yellow-100 mb-2 drop-shadow-md" />
            <span className="text-5xl sm:text-6xl font-black text-white drop-shadow-md">1</span>
          </div>
        </div>

        {/* 3RD PLACE (BRONZE) */}
        <div className="flex flex-col items-center">
          {thirdPlace ? (
            <div className="flex flex-col items-center animate-slide-up">
              <span className="text-4xl sm:text-5xl mb-2 drop-shadow-lg" role="img" aria-label="avatar">
                {getParticipantAvatar(thirdPlace)}
              </span>
              <span className="font-extrabold text-white text-base sm:text-lg truncate max-w-[140px] text-center">
                {thirdPlace.nickname}
              </span>
              <span className="font-mono text-sm sm:text-base font-bold text-amber-600/80 mb-3">
                {thirdPlace.score} pts
              </span>
            </div>
          ) : (
            <div className="h-16" />
          )}
          <div className="w-full h-28 sm:h-36 rounded-t-3xl bg-gradient-to-t from-amber-900 to-amber-700 border-t-2 border-amber-500 flex flex-col items-center justify-center shadow-xl">
            <Award size={32} className="text-amber-200 mb-1" />
            <span className="text-2xl sm:text-3xl font-black text-white">3</span>
          </div>
        </div>
      </div>

      {/* Ranks 4 to 10 Table */}
      {restPlaces.length > 0 && (
        <div className="w-full max-w-2xl bg-black/40 border border-pink-500/20 rounded-2xl p-4 backdrop-blur-xl">
          <div className="grid grid-cols-1 divide-y divide-white/5">
            {restPlaces.map((p, idx) => (
              <div key={p.id} className="flex items-center justify-between py-2.5 px-3">
                <div className="flex items-center gap-3">
                  <span className="w-6 font-mono text-sm text-pink-300 font-bold">
                    #{idx + 4}
                  </span>
                  <span className="text-xl">{getParticipantAvatar(p)}</span>
                  <span className="font-bold text-white text-sm">{p.nickname}</span>
                </div>
                <div className="font-mono text-sm font-semibold text-pink-200">
                  {p.score} pts
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
