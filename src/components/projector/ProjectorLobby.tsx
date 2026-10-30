'use client'

import { useEffect, useState } from 'react'
import QRCode from 'react-qr-code'
import { Sparkles, Users, Smartphone } from 'lucide-react'
import type { GameSession, SessionParticipant } from '@/types/database'

import { getParticipantAvatar } from '@/lib/gameHelpers'

interface ProjectorLobbyProps {
  session: GameSession
  participants: SessionParticipant[]
  locale?: string
}

export default function ProjectorLobby({
  session,
  participants,
  locale = 'en',
}: ProjectorLobbyProps) {
  const isRtl = locale === 'ar'
  const [joinUrl, setJoinUrl] = useState('')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const origin = window.location.origin
      setJoinUrl(`${origin}/join?pin=${session.room_pin}`)
    }
  }, [session.room_pin])

  return (
    <div className="w-full flex flex-col items-center justify-between gap-8 py-4 animate-fade-in">
      {/* Top Welcome Title */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-pink-500/10 border border-pink-400/20 text-pink-300 text-sm font-semibold mb-3">
          <Sparkles size={16} />
          <span>{isRtl ? 'الجلسة مفتوحة الآن للانضمام' : 'Session Lobby Open'}</span>
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight">
          {isRtl ? 'امسح الرمز أو أدخل الكود للمشاركة' : 'Scan to Join on Your Phone'}
        </h1>
        <p className="text-lg sm:text-xl text-pink-200/70 mt-2 font-medium">
          {isRtl
            ? 'وجّه كاميرا هاتفك نحو الرمز أدناه أو افتح الموقع وأدخل رمز الغرفة'
            : 'Point your camera at the QR code or enter the Room PIN on your device'}
        </p>
      </div>

      {/* Hero Joining Section: QR Code + Room PIN */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-14 my-4 p-8 rounded-3xl bg-black/40 border border-pink-500/20 backdrop-blur-xl shadow-2xl">
        {/* QR Code Container with High-Contrast Frame */}
        <div className="p-5 rounded-2xl bg-white shadow-2xl shadow-pink-500/20 border-4 border-pink-300 flex flex-col items-center">
          {joinUrl ? (
            <QRCode
              value={joinUrl}
              size={220}
              style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
              viewBox="0 0 256 256"
            />
          ) : (
            <div className="w-56 h-56 bg-white animate-pulse" />
          )}
          <div className="mt-3 text-center">
            <span className="text-xs font-bold text-gray-900 uppercase tracking-widest flex items-center justify-center gap-1">
              <Smartphone size={14} />
              {isRtl ? 'امسح للانضمام فوراً' : 'Instant Phone Join'}
            </span>
          </div>
        </div>

        {/* Room PIN Container */}
        <div className="flex flex-col items-center md:items-start text-center md:text-start">
          <span className="text-sm uppercase tracking-widest text-pink-300/80 font-bold mb-1">
            {isRtl ? 'أو أدخل رمز الغرفة' : 'OR ENTER ROOM PIN'}
          </span>
          <div className="font-mono text-6xl sm:text-7xl lg:text-8xl font-black tracking-widest text-pink-300 drop-shadow-[0_0_35px_rgba(244,167,197,0.6)] select-all py-2">
            {session.room_pin}
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-pink-200/80 bg-white/5 px-4 py-2 rounded-xl border border-pink-400/10">
            <span>🌐</span>
            <span className="font-mono font-medium">
              {typeof window !== 'undefined' ? window.location.host : 'sakura.club'}/join
            </span>
          </div>
        </div>
      </div>

      {/* Players Joined Wall */}
      <div className="w-full max-w-5xl">
        <div className="flex items-center justify-between mb-4 px-2">
          <div className="flex items-center gap-2 text-pink-200 font-bold text-lg">
            <Users size={20} className="text-pink-400" />
            <span>{isRtl ? 'اللاعبون المنضمون' : 'Players in Lobby'}</span>
            <span className="ml-2 px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 text-sm border border-pink-500/30">
              {participants.length}
            </span>
          </div>
          <div className="text-xs text-pink-300/60 font-medium">
            {isRtl ? 'في انتظار إشارة البدء من المنظّم...' : 'Waiting for host to start...'}
          </div>
        </div>

        {participants.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-48 overflow-y-auto p-2 scrollbar-none">
            {participants.map(p => (
              <div
                key={p.id}
                className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-white/5 border border-pink-500/15 backdrop-blur-md animate-scale-in hover:border-pink-400/40 transition-all"
              >
                <span className="text-xl shrink-0" role="img" aria-label="avatar">
                  {getParticipantAvatar(p)}
                </span>
                <span className="text-sm font-semibold text-white truncate">
                  {p.nickname}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 rounded-2xl bg-white/5 border border-dashed border-pink-500/20 text-pink-300/60 text-sm">
            {isRtl
              ? 'كن أول من ينضم! امسح الرمز أعلاه بهاتفك 🌸'
              : 'Be the first to join! Scan the code above on your phone 🌸'}
          </div>
        )}
      </div>
    </div>
  )
}
