import Link from 'next/link'
import { Zap } from 'lucide-react'
import { getActivityLabel } from '@/lib/utils'

interface LiveSessionBannerProps {
  session: {
    id: string
    room_pin: string
    activity_type: string
    status: string
  }
  locale?: string
}

export default function LiveSessionBanner({ session, locale = 'en' }: LiveSessionBannerProps) {
  const isRtl = locale === 'ar'
  const activityLabel = getActivityLabel(session.activity_type, locale)

  return (
    <Link
      href={`/join/${session.room_pin}`}
      className="inline-flex items-center gap-3 px-5 py-3 rounded-full border border-[rgba(244,167,197,0.4)] bg-[rgba(244,167,197,0.1)] hover:bg-[rgba(244,167,197,0.18)] transition-all group"
      id="live-session-banner"
      aria-label={`Join live game: ${activityLabel}`}
    >
      <span
        className="relative flex h-2.5 w-2.5"
        aria-hidden="true"
      >
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--sakura-pink)] opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--deep-sakura)]" />
      </span>
      <Zap size={14} className="text-[var(--sakura-pink)]" aria-hidden="true" />
      <span className="text-sm font-semibold text-white">
        {isRtl ? 'هناك لعبة مباشرة الآن!' : 'A game is live right now!'}
      </span>
      <span className="text-[var(--sakura-pink)] text-xs">
        {activityLabel}
      </span>
      <span className="text-[var(--muted-lavender)] text-xs font-mono">
        {session.room_pin.replace(/(\d{3})(\d{3})/, '$1 $2')}
      </span>
      <span className="text-[var(--sakura-pink)] group-hover:translate-x-0.5 transition-transform" aria-hidden="true">
        →
      </span>
    </Link>
  )
}
