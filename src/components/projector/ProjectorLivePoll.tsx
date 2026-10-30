'use client'

import { useState, useEffect } from 'react'
import { Users, BarChart3, Sparkles } from 'lucide-react'
import { sound } from '@/lib/sound'
import { createClient } from '@/lib/supabase/client'
import type { LivePollData } from '@/lib/gameData'
import type { GameSession, SessionParticipant } from '@/types/database'

interface ProjectorLivePollProps {
  session: GameSession
  participants: SessionParticipant[]
  currentQuestion: LivePollData
  questionIndex: number
  totalQuestions: number
  locale?: string
}

export default function ProjectorLivePoll({
  session,
  participants,
  currentQuestion,
  questionIndex,
  totalQuestions,
  locale = 'en',
}: ProjectorLivePollProps) {
  const isRtl = locale === 'ar'
  const supabase = createClient()

  // Vote map: optionId -> vote count
  const [votes, setVotes] = useState<Record<string, number>>({})

  // Reset or load initial votes on question change
  useEffect(() => {
    setVotes({})
  }, [currentQuestion.id, questionIndex])

  // Listen for realtime live votes from audience
  useEffect(() => {
    const channel = supabase
      .channel(`poll_stream_${session.id}`)
      .on('broadcast', { event: 'poll_vote' }, (payload) => {
        sound.playClick()
        const { optionId } = payload.payload
        setVotes((prev) => ({
          ...prev,
          [optionId]: (prev[optionId] || 0) + 1,
        }))
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [session.id, supabase])

  const totalVotes = Object.values(votes).reduce((a, b) => a + b, 0)

  const BAR_COLORS = [
    'from-rose-500 to-pink-600',
    'from-blue-500 to-indigo-600',
    'from-amber-500 to-orange-600',
    'from-emerald-500 to-teal-600',
    'from-purple-500 to-violet-600',
  ]

  return (
    <div className="w-full flex-1 flex flex-col justify-between p-6 max-w-6xl mx-auto select-none animate-fade-in">
      {/* ── TOP HUD ── */}
      <div className="flex items-center justify-between p-4 rounded-3xl bg-black/40 border border-pink-500/20 backdrop-blur-xl mb-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <span className="w-3.5 h-3.5 rounded-full bg-pink-500 animate-ping" />
          <span className="text-xl font-black text-white tracking-wider flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-pink-400" />
            <span>{isRtl ? 'استطلاع رأي النادي المباشر' : 'Live Audience Poll'}</span>
          </span>
          <span className="px-3 py-1 rounded-full bg-pink-500/20 text-pink-300 font-mono text-sm font-bold border border-pink-400/30">
            {questionIndex + 1} / {totalQuestions}
          </span>
        </div>

        <div className="flex items-center gap-2 px-6 py-2 rounded-2xl bg-white/10 border border-pink-400/30 text-white font-mono text-lg font-black">
          <Users className="w-5 h-5 text-pink-300" />
          <span>
            {totalVotes} {isRtl ? 'صوت' : 'Votes'} ({participants.length} {isRtl ? 'حاضر' : 'Online'})
          </span>
        </div>
      </div>

      {/* ── POLL QUESTION TITLE ── */}
      <div className="text-center my-4 animate-scale-in">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white drop-shadow-lg leading-tight max-w-4xl mx-auto">
          {isRtl ? currentQuestion.question_ar : currentQuestion.question}
        </h2>
        <p className="text-sm text-pink-200/80 mt-3 font-bold">
          {isRtl ? '🌸 صوّت الآن من هاتفك لمشاهدة النتائج مباشرة على شاشة العرض!' : '🌸 Cast your vote from your phone to watch results live!'}
        </p>
      </div>

      {/* ── LIVE EXPANDING BARS ── */}
      <div className="flex-1 flex flex-col justify-center space-y-4 my-6">
        {currentQuestion.options.map((opt, idx) => {
          const count = votes[opt.id] || 0
          const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0
          const color = BAR_COLORS[idx % BAR_COLORS.length]

          return (
            <div
              key={opt.id}
              className="p-5 rounded-3xl bg-black/40 border border-pink-500/20 backdrop-blur-xl shadow-xl relative overflow-hidden"
            >
              {/* Dynamic filled bar background */}
              <div
                className={`absolute top-0 bottom-0 left-0 bg-gradient-to-r ${color} opacity-40 transition-all duration-700 ease-out`}
                style={{ width: `${percentage}%` }}
              />

              <div className="relative z-10 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-white/10 text-white font-mono text-sm font-black flex items-center justify-center border border-white/20">
                    {idx + 1}
                  </span>
                  <span className="text-lg lg:text-xl font-black text-white">
                    {isRtl ? opt.text_ar : opt.text}
                  </span>
                </div>

                <div className="flex items-center gap-4 font-mono">
                  <span className="text-sm text-pink-200/80 font-bold">
                    {count} {isRtl ? 'أصوات' : 'votes'}
                  </span>
                  <span className="text-2xl lg:text-3xl font-black text-white min-w-[70px] text-right">
                    {percentage}%
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer encouragement */}
      <div className="text-center text-xs text-pink-300/70 py-2">
        {isRtl
          ? 'نادي ساكورا — استطلاعات الرأي الحية بجامعة صحار (SU CLUB)'
          : 'Sakura Club — Live Audience Polling at Sohar University'}
      </div>
    </div>
  )
}

