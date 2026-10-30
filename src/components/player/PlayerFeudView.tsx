'use client'

import { useState, useEffect } from 'react'
import { Zap, Check, Users, AlertCircle, X, ShieldAlert, Trophy, Clock } from 'lucide-react'
import type { GameSession, SessionParticipant } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { sound } from '@/lib/sound'
import { getParticipantAvatar } from '@/lib/gameHelpers'

interface PlayerFeudViewProps {
  session: GameSession
  participant: SessionParticipant
  locale?: string
}

interface FaceoffData {
  rep1Id: string
  rep1Name: string
  rep2Id: string
  rep2Name: string
  roundIndex?: number
  winnerId?: string
  winnerName?: string
  winnerTeam?: 1 | 2
  slowerId?: string
  slowerName?: string
}

export default function PlayerFeudView({
  session,
  participant,
  locale = 'en',
}: PlayerFeudViewProps) {
  const supabase = createClient()
  const isRtl = locale === 'ar'

  // Team selection
  const [myTeam, setMyTeam] = useState<'team1' | 'team2'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`sakura_feud_team_${session.id}_${participant.id}`)
      if (saved === 'team1' || saved === 'team2') return saved
    }
    const sessionSettings = session.settings as Record<string, unknown> | null
    const pt = sessionSettings?.participant_teams as Record<string, 'team1' | 'team2'> | undefined
    return pt?.[participant.id] || 'team1'
  })

  // Buzzer & faceoff states
  const [faceoff, setFaceoff] = useState<FaceoffData | null>(null)
  const [buzzed, setBuzzed] = useState(false)
  const [notFastEnough, setNotFastEnough] = useState(false)
  const [iWonBuzzer, setIWonBuzzer] = useState(false)
  const [hostNotice, setHostNotice] = useState<string | null>(null)

  // Game state
  const [activeTeam, setActiveTeam] = useState<1 | 2 | null>(null)
  const [strikes, setStrikes] = useState<number>(0)
  const [roundBank, setRoundBank] = useState<number>(0)

  // Realtime subscription for feud events
  useEffect(() => {
    const channel = supabase.channel(`projector_session_${session.id}`)

    channel
      .on('broadcast', { event: 'feud_event' }, payload => {
        const { type, data } = payload.payload

        if (type === 'faceoff_start') {
          setFaceoff({
            rep1Id: data.rep1Id,
            rep1Name: data.rep1Name,
            rep2Id: data.rep2Id,
            rep2Name: data.rep2Name,
            roundIndex: data.roundIndex,
          })
          setBuzzed(false)
          setNotFastEnough(false)
          setIWonBuzzer(false)
        } else if (type === 'buzzer_result') {
          setFaceoff(prev => prev ? {
            ...prev,
            winnerId: data.winnerId,
            winnerName: data.winnerName,
            winnerTeam: data.winnerTeam,
            slowerId: data.slowerId,
            slowerName: data.slowerName,
          } : null)

          if (data.slowerId === participant.id) {
            setNotFastEnough(true)
            setIWonBuzzer(false)
            sound.playBuzzer()
          } else if (data.winnerId === participant.id) {
            setIWonBuzzer(true)
            setNotFastEnough(false)
            sound.playFanfare()
          }
        } else if (type === 'host_move_team') {
          if (data.participantId === participant.id) {
            setMyTeam(data.team)
            if (typeof window !== 'undefined') {
              localStorage.setItem(`sakura_feud_team_${session.id}_${participant.id}`, data.team)
            }
            setHostNotice(
              isRtl
                ? `قام المنظم بنقلك إلى ${data.team === 'team1' ? 'فريق ساكورا 🌸' : 'فريق الكاتانا ⚔️'}`
                : `Host moved you to ${data.team === 'team1' ? 'Team Sakura 🌸' : 'Team Katanas ⚔️'}`
            )
            setTimeout(() => setHostNotice(null), 4000)
          }
        } else if (type === 'set_active_team') {
          setActiveTeam(data.activeTeam)
        } else if (type === 'strike') {
          setStrikes(data.strikes)
        } else if (type === 'reveal_answer') {
          if (typeof data.newBank === 'number') {
            setRoundBank(data.newBank)
          }
        } else if (type === 'round_awarded') {
          setStrikes(0)
          setRoundBank(0)
          setFaceoff(null)
          setBuzzed(false)
          setNotFastEnough(false)
          setIWonBuzzer(false)
          setActiveTeam(null)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [session.id, participant.id, isRtl])

  // Handle Player Team Switching
  const handleSwitchTeam = async (newTeam: 'team1' | 'team2') => {
    if (newTeam === myTeam) return
    setMyTeam(newTeam)
    sound.playClick()

    if (typeof window !== 'undefined') {
      localStorage.setItem(`sakura_feud_team_${session.id}_${participant.id}`, newTeam)
    }

    // Broadcast team switch so host and projector update their live rosters
    await supabase.channel(`projector_session_${session.id}`).send({
      type: 'broadcast',
      event: 'feud_event',
      payload: {
        type: 'team_switch',
        data: {
          participantId: participant.id,
          nickname: participant.nickname,
          avatar: getParticipantAvatar(participant),
          team: newTeam,
        },
      },
    })
  }

  // Handle Buzz In Action
  const handleBuzzIn = async () => {
    if (buzzed || notFastEnough || (faceoff && faceoff.winnerId)) return
    sound.playBuzzer()
    setBuzzed(true)

    // Send buzzer press to host and projector
    await supabase.channel(`projector_session_${session.id}`).send({
      type: 'broadcast',
      event: 'feud_event',
      payload: {
        type: 'buzzer_press',
        data: {
          participantId: participant.id,
          nickname: participant.nickname,
          avatar: getParticipantAvatar(participant),
          team: myTeam === 'team1' ? 1 : 2,
          timestamp: Date.now(),
        },
      },
    })
  }

  const isMyRepTurn = faceoff && (faceoff.rep1Id === participant.id || faceoff.rep2Id === participant.id)
  const isMyTeamPlaying = activeTeam === (myTeam === 'team1' ? 1 : 2)

  return (
    <div className="w-full max-w-md flex flex-col justify-between items-center h-full py-2 animate-fade-in text-center">
      {/* HOST MOVE NOTIFICATION */}
      {hostNotice && (
        <div className="w-full mb-3 p-3 rounded-2xl bg-amber-500/20 border-2 border-amber-400 text-amber-200 text-xs font-bold animate-slide-down flex items-center justify-center gap-2">
          <AlertCircle size={16} className="text-amber-300" />
          <span>{hostNotice}</span>
        </div>
      )}

      {/* TEAM SELECTOR / SWITCHER */}
      <div className="w-full mb-4">
        <div className="flex items-center justify-between mb-1.5 px-1">
          <span className="text-[11px] uppercase tracking-wider text-pink-300/80 font-bold block">
            {isRtl ? 'اختر فريقك (يمكنك التبديل بحرية):' : 'Your Team (Switch freely):'}
          </span>
          <span className="text-[10px] text-pink-200/50">
            {isRtl ? 'إلا إذا نقلك المنظم' : 'Unless moved by host'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 p-1.5 rounded-2xl bg-black/40 border border-pink-500/20">
          <button
            onClick={() => handleSwitchTeam('team1')}
            className={`py-2 px-3 rounded-xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all ${
              myTeam === 'team1'
                ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-lg shadow-pink-500/30 scale-102 border border-pink-300/40'
                : 'text-pink-200/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>🌸</span>
            <span>{isRtl ? 'فريق ساكورا' : 'Team Sakura'}</span>
          </button>
          <button
            onClick={() => handleSwitchTeam('team2')}
            className={`py-2 px-3 rounded-xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all ${
              myTeam === 'team2'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/30 scale-102 border border-purple-300/40'
                : 'text-purple-200/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>⚔️</span>
            <span>{isRtl ? 'فريق الكاتانا' : 'Team Katanas'}</span>
          </button>
        </div>
      </div>

      {/* ROUND STATUS PILLS (Bank & Strikes) */}
      <div className="w-full grid grid-cols-2 gap-3 mb-4">
        <div className="p-2.5 rounded-xl bg-black/40 border border-amber-500/30 text-center">
          <span className="text-[10px] uppercase font-bold text-amber-300/80 block">
            {isRtl ? 'نقاط الجولة (Bank)' : 'Round Bank'}
          </span>
          <span className="font-mono text-2xl font-black text-amber-400">
            {roundBank} <span className="text-xs font-sans text-amber-300/70">pts</span>
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-black/40 border border-red-500/30 flex flex-col items-center justify-center">
          <span className="text-[10px] uppercase font-bold text-red-300/80 block mb-1">
            {isRtl ? 'الضربات الخاطئة' : 'Strikes'}
          </span>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3].map(sn => (
              <span
                key={sn}
                className={`text-lg font-black transition-transform ${
                  strikes >= sn ? 'text-red-500 scale-125' : 'text-white/10'
                }`}
              >
                ✕
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ACTIVE TEAM NOTIFICATION */}
      {activeTeam && (
        <div
          className={`w-full mb-3 p-3 rounded-2xl border text-xs font-extrabold flex items-center justify-center gap-2 ${
            isMyTeamPlaying
              ? 'bg-emerald-950/50 border-emerald-400/50 text-emerald-200 animate-pulse'
              : 'bg-black/40 border-pink-500/20 text-pink-200/70'
          }`}
        >
          {isMyTeamPlaying ? (
            <>
              <span>🎯</span>
              <span>
                {isRtl
                  ? 'دور فريقك في الإجابة الآن! ناقشوا مع المنظم 🌸'
                  : "It's your team's turn to answer the board! 🌸"}
              </span>
            </>
          ) : (
            <>
              <span>👀</span>
              <span>
                {isRtl
                  ? `الفريق المنافس يجيب الآن (${activeTeam === 1 ? 'فريق ساكورا 🌸' : 'فريق الكاتانا ⚔️'})`
                  : `Opposing team is guessing (${activeTeam === 1 ? 'Team Sakura 🌸' : 'Team Katanas ⚔️'})`}
              </span>
            </>
          )}
        </div>
      )}

      {/* STEAL NOTIFICATION (When 3 strikes) */}
      {strikes === 3 && (
        <div className="w-full mb-3 p-3.5 rounded-2xl bg-gradient-to-r from-red-900/70 via-rose-900/60 to-red-900/70 border-2 border-red-400 text-white text-xs font-black animate-bounce flex items-center justify-center gap-2">
          <ShieldAlert size={18} className="text-yellow-400 shrink-0" />
          <span>
            {isRtl
              ? '🚨 3 ضربات! فرصة السرقة متاحة للفريق الآخر لخطف كل نقاط الجولة!'
              : '🚨 3 STRIKES! Defending team has ONE guess to steal ALL round points!'}
          </span>
        </div>
      )}

      {/* ============================================================
          MAIN CENTER STAGE: BUZZER / SLOWER MESSAGE / SPECTATOR
          ============================================================ */}
      <div className="flex-1 flex flex-col items-center justify-center w-full my-auto">
        {/* CASE 1: NOT FAST ENOUGH MESSAGE */}
        {notFastEnough ? (
          <div className="p-8 rounded-3xl bg-gradient-to-b from-red-950/80 via-black/80 to-red-950/80 border-4 border-red-500 shadow-2xl shadow-red-500/40 animate-scale-in text-center max-w-xs">
            <div className="w-20 h-20 rounded-full bg-red-600/30 border-2 border-red-400 flex items-center justify-center mx-auto mb-3 text-red-300">
              <Clock size={40} className="animate-spin text-red-400" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-red-400 mb-2 leading-tight">
              {isRtl ? 'لست سريعاً بما فيه الكفاية! ⏱️' : 'Not fast enough! ⏱️'}
            </h2>
            <p className="text-xs text-red-200/90 leading-relaxed mb-4">
              {isRtl
                ? 'خصمك ضغط على الزر قبلك بـ أجزاء من الثانية! استعد للجولة القادمة.'
                : 'Your opponent buzzed in first! Watch the projector screen for their answer.'}
            </p>
            <div className="text-[11px] font-bold text-pink-300/60 uppercase">
              {faceoff?.winnerName ? `${faceoff.winnerName} buzzed first` : 'Opponent buzzed first'}
            </div>
          </div>
        ) : iWonBuzzer ? (
          /* CASE 2: YOU BUZZED FIRST */
          <div className="p-8 rounded-3xl bg-gradient-to-b from-emerald-950/80 via-black/80 to-emerald-950/80 border-4 border-emerald-400 shadow-2xl shadow-emerald-500/40 animate-scale-in text-center max-w-xs">
            <div className="w-20 h-20 rounded-full bg-emerald-600/30 border-2 border-emerald-400 flex items-center justify-center mx-auto mb-3 text-emerald-300">
              <Zap size={44} className="text-yellow-300 animate-bounce" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-emerald-300 mb-2 leading-tight">
              {isRtl ? 'أنت الأسرع! ⚡' : 'You buzzed first! ⚡'}
            </h2>
            <p className="text-xs text-emerald-200/90 leading-relaxed mb-4">
              {isRtl
                ? 'أعطِ إجابتك للمنظم الآن! الإجابة الأعلى تمنح فريقك حرية اللعب أو التمرير.'
                : 'Give your answer to the host! Highest ranked answer decides Play or Pass.'}
            </p>
          </div>
        ) : (
          /* CASE 3: STANDARD GIANT BUZZER BUTTON */
          <div className="flex flex-col items-center">
            {faceoff && !isMyRepTurn && (
              <div className="mb-4 p-3 rounded-2xl bg-white/5 border border-pink-500/20 text-xs text-pink-200/80 max-w-xs">
                ⚔️{' '}
                {isRtl
                  ? `مواجهة السرعة بين: ${faceoff.rep1Name} و ${faceoff.rep2Name}`
                  : `Face-off duel: ${faceoff.rep1Name} vs ${faceoff.rep2Name}`}
              </div>
            )}

            <button
              onClick={handleBuzzIn}
              disabled={buzzed || Boolean(faceoff && !isMyRepTurn)}
              className={`relative w-64 h-64 sm:w-72 sm:h-72 rounded-full border-8 shadow-2xl transition-all duration-150 flex flex-col items-center justify-center text-white active:scale-95 ${
                buzzed
                  ? 'bg-amber-500 border-amber-300 scale-105 shadow-amber-500/50'
                  : Boolean(faceoff && !isMyRepTurn)
                  ? 'bg-gray-800/60 border-gray-600/50 opacity-40 cursor-not-allowed'
                  : 'bg-gradient-to-tr from-rose-700 via-pink-600 to-rose-500 border-pink-300/60 shadow-pink-500/40 hover:scale-[1.02] animate-pulse'
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
                    {faceoff && isMyRepTurn
                      ? (isRtl ? 'مواجهة السرعة!' : 'Face-Off Duel!')
                      : (isRtl ? 'لأخذ دور الإجابة' : 'Tap to claim turn')}
                  </span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      <p className="text-[11px] text-pink-200/60 mt-4">
        {isRtl
          ? 'تابع لوحة الإجابات والنتائج الحية على شاشة العرض الرئيسية!'
          : 'Watch the live board, strikes, and bank points on the projector screen!'}
      </p>
    </div>
  )
}
