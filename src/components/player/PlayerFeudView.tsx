'use client'

import { useState } from 'react'
import { Zap, Check, Users } from 'lucide-react'
import type { GameSession, SessionParticipant } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { sound } from '@/lib/sound'

import { getParticipantAvatar } from '@/lib/gameHelpers'

interface PlayerFeudViewProps {
  session: GameSession
  participant: SessionParticipant
  locale?: string
}

export default function PlayerFeudView({
  session,
  participant,
  locale = 'en',
}: PlayerFeudViewProps) {
  const supabase = createClient()
  const isRtl = locale === 'ar'
  const [buzzed, setBuzzed] = useState(false)
  const [myTeam, setMyTeam] = useState<'team1' | 'team2'>('team1')

  const handleBuzzIn = async () => {
    sound.playBuzzer()
    setBuzzed(true)

    // Broadcast buzzer event to projector and host
    await supabase.channel(`projector_session_${session.id}`).send({
      type: 'broadcast',
      event: 'feud_event',
      payload: {
        type: 'buzzer',
        data: {
          participantId: participant.id,
          nickname: participant.nickname,
          avatar: getParticipantAvatar(participant),
          team: myTeam,
          timestamp: Date.now(),
        },
      },
    })

    setTimeout(() => {
      setBuzzed(false)
    }, 2500)
  }

  return (
    <div className="w-full max-w-md flex flex-col justify-between items-center h-full py-4 animate-fade-in text-center">
      {/* Team Selector / Indicator */}
      <div className="w-full mb-6">
        <span className="text-xs uppercase tracking-wider text-pink-300/80 font-bold block mb-2">
          {isRtl ? 'فريقك الحالي:' : 'Your Team:'}
        </span>
        <div className="grid grid-cols-2 gap-3 p-1.5 rounded-2xl bg-black/40 border border-pink-500/20">
          <button
            onClick={() => setMyTeam('team1')}
            className={`py-2 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all ${
              myTeam === 'team1'
                ? 'bg-pink-600 text-white shadow-lg shadow-pink-500/30'
                : 'text-pink-200/60 hover:text-white'
            }`}
          >
            <span>🌸</span>
            <span>{isRtl ? 'فريق ساكورا' : 'Team Sakura'}</span>
          </button>
          <button
            onClick={() => setMyTeam('team2')}
            className={`py-2 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all ${
              myTeam === 'team2'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                : 'text-purple-200/60 hover:text-white'
            }`}
          >
            <span>⚔️</span>
            <span>{isRtl ? 'فريق الكاتانا' : 'Team Katanas'}</span>
          </button>
        </div>
      </div>

      {/* GIANT BUZZER BUTTON */}
      <div className="flex-1 flex flex-col items-center justify-center w-full">
        <button
          onClick={handleBuzzIn}
          disabled={buzzed}
          className={`relative w-64 h-64 sm:w-72 sm:h-72 rounded-full border-8 shadow-2xl transition-all duration-150 flex flex-col items-center justify-center text-white active:scale-95 ${
            buzzed
              ? 'bg-amber-500 border-amber-300 scale-105 shadow-amber-500/50'
              : 'bg-gradient-to-tr from-rose-700 via-pink-600 to-rose-500 border-pink-300/60 shadow-pink-500/40 hover:scale-[1.02]'
          }`}
        >
          {buzzed ? (
            <div className="animate-scale-in">
              <Check size={64} className="mx-auto mb-2 text-white" />
              <span className="font-black text-2xl tracking-wider">
                {isRtl ? 'تم الضغط!' : 'BUZZED!'}
              </span>
            </div>
          ) : (
            <>
              <Zap size={64} className="mb-2 text-yellow-300 animate-pulse" />
              <span className="font-black text-3xl tracking-widest drop-shadow-md">
                {isRtl ? 'اضغط الزر!' : 'BUZZ IN!'}
              </span>
              <span className="text-[11px] uppercase tracking-wider text-pink-200/90 font-bold mt-1">
                {isRtl ? 'لأخذ دور الإجابة' : 'Tap to claim turn'}
              </span>
            </>
          )}
        </button>
      </div>

      <p className="text-xs text-pink-200/60 mt-6">
        {isRtl
          ? 'شاهد لوحة الإجابات والضربات على شاشة العرض الرئيسية!'
          : 'Watch the answer board and strikes on the projector screen!'}
      </p>
    </div>
  )
}
