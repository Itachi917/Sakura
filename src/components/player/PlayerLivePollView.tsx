'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, BarChart3, Sparkles } from 'lucide-react'
import { sound } from '@/lib/sound'
import { createClient } from '@/lib/supabase/client'
import type { LivePollData } from '@/lib/gameData'
import type { GameSession, SessionParticipant } from '@/types/database'

interface PlayerLivePollViewProps {
  session: GameSession
  participant: SessionParticipant
  currentQuestion: LivePollData
  questionIndex: number
  totalQuestions: number
  locale?: string
}

const OPTION_STYLES = [
  { bg: 'bg-rose-600/30 hover:bg-rose-600/50', border: 'border-rose-400/50', active: 'ring-rose-400' },
  { bg: 'bg-blue-600/30 hover:bg-blue-600/50', border: 'border-blue-400/50', active: 'ring-blue-400' },
  { bg: 'bg-amber-600/30 hover:bg-amber-600/50', border: 'border-amber-400/50', active: 'ring-amber-400' },
  { bg: 'bg-emerald-600/30 hover:bg-emerald-600/50', border: 'border-emerald-400/50', active: 'ring-emerald-400' },
]

export default function PlayerLivePollView({
  session,
  participant,
  currentQuestion,
  questionIndex,
  totalQuestions,
  locale = 'en',
}: PlayerLivePollViewProps) {
  const isRtl = locale === 'ar'
  const supabase = createClient()

  const [votedOptionId, setVotedOptionId] = useState<string | null>(null)

  useEffect(() => {
    setVotedOptionId(null)
  }, [currentQuestion.id, questionIndex])

  const handleVote = async (optionId: string) => {
    if (votedOptionId) return
    sound.playClick()
    setVotedOptionId(optionId)

    try {
      await supabase.channel(`poll_stream_${session.id}`).send({
        type: 'broadcast',
        event: 'poll_vote',
        payload: {
          participantId: participant.id,
          optionId,
        },
      })
    } catch {}
  }

  return (
    <div className="w-full max-w-md mx-auto flex flex-col justify-between h-full py-4 animate-fade-in pb-12">
      {/* ── TOP HUD ── */}
      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#1e0e2d]/80 border border-pink-500/20 shadow-lg backdrop-blur-md mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-pink-400" />
          <span className="text-xs uppercase tracking-wider text-pink-300 font-extrabold">
            {isRtl ? 'استطلاع رأي' : 'Live Poll'} {questionIndex + 1} / {totalQuestions}
          </span>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-pink-500/10 border border-pink-400/30 text-pink-200 text-xs font-bold">
          <span>🌸</span>
          <span>{isRtl ? 'شارك برأيك' : 'Have your say'}</span>
        </div>
      </div>

      {/* ── QUESTION CARD ── */}
      <div className="flex-1 flex flex-col justify-center space-y-4">
        <div className="p-6 rounded-3xl bg-[#190d26]/90 border border-pink-500/20 text-center shadow-2xl">
          <h3 className="text-xl sm:text-2xl font-black text-white leading-snug">
            {isRtl ? currentQuestion.question_ar : currentQuestion.question}
          </h3>
          <p className="text-xs text-pink-200/70 mt-2 font-bold">
            {votedOptionId
              ? (isRtl ? '✓ تم تسجيل صوتك، شاهد النسب ترتفع على الشاشة!' : '✓ Vote counted! Watch bars rise on the projector!')
              : (isRtl ? 'اختر إجابتك المفضلة بالأسفل:' : 'Select your favorite choice below:')}
          </p>
        </div>

        {votedOptionId && (
          <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-400 text-center animate-bounce">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-1" />
            <span className="text-sm font-black text-emerald-200 block">
              {isRtl ? 'تم التصويت بنجاح! 🌸' : 'Vote Submitted! 🌸'}
            </span>
          </div>
        )}
      </div>

      {/* ── VOTING OPTIONS ── */}
      <div className="mt-auto space-y-2.5 pt-3">
        {currentQuestion.options.map((opt, idx) => {
          const style = OPTION_STYLES[idx % OPTION_STYLES.length]
          const isVoted = votedOptionId === opt.id

          return (
            <button
              key={opt.id}
              onClick={() => handleVote(opt.id)}
              disabled={!!votedOptionId}
              className={`w-full p-4 rounded-2xl font-black text-white text-sm sm:text-base border-2 transition-all flex items-center justify-between shadow-lg active:scale-95 disabled:cursor-not-allowed ${
                isVoted
                  ? 'ring-4 ring-white scale-105 bg-pink-600 border-white'
                  : votedOptionId
                  ? 'opacity-40 bg-white/5 border-white/5'
                  : `${style.bg} ${style.border}`
              }`}
            >
              <span>{isRtl ? opt.text_ar : opt.text}</span>
              {isVoted && <CheckCircle2 className="w-5 h-5 text-white" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

