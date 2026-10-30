import { Metadata } from 'next'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { Cherry, ArrowLeft } from 'lucide-react'
import JoinGameCard from '@/components/game/JoinGameCard'

export const metadata: Metadata = {
  title: 'Join Game — Sakura Live Activities',
  description: 'Enter your 6-digit room PIN to join the live anime club game right from your phone.',
}

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ pin?: string }>
}) {
  const cookieStore = await cookies()
  const locale = cookieStore.get('locale')?.value === 'ar' ? 'ar' : 'en'
  const isRtl = locale === 'ar'
  const params = await searchParams
  const initialPin = params?.pin || ''

  return (
    <div className="min-h-screen bg-[var(--midnight-plum)] text-white flex flex-col justify-between p-4 sm:p-6 relative overflow-hidden">
      {/* Background glow effects */}
      <div
        aria-hidden="true"
        className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-[var(--deep-sakura)] opacity-10 rounded-full blur-3xl pointer-events-none"
      />
      <div
        aria-hidden="true"
        className="absolute bottom-0 right-0 w-80 h-80 bg-[var(--muted-lavender)] opacity-10 rounded-full blur-3xl pointer-events-none"
      />

      {/* Header bar */}
      <header className="relative z-10 flex items-center justify-between max-w-md mx-auto w-full pt-2">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs text-[var(--muted-lavender)] hover:text-white transition-colors py-1 px-2 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(244,167,197,0.15)]"
        >
          <ArrowLeft size={14} className={isRtl ? 'rotate-180' : ''} />
          <span>{isRtl ? 'الرئيسية' : 'Home'}</span>
        </Link>
        <div className="flex items-center gap-2">
          <Cherry className="text-[var(--sakura-pink)] animate-pulse" size={20} />
          <span className="font-bold tracking-wider text-sm bg-gradient-to-r from-pink-200 to-pink-400 bg-clip-text text-transparent">
            SAKURA LIVE
          </span>
        </div>
      </header>

      {/* Main card */}
      <main className="relative z-10 flex-1 flex items-center justify-center py-6">
        <JoinGameCard initialPin={initialPin} locale={locale} />
      </main>

      {/* Footer note */}
      <footer className="relative z-10 text-center text-xs text-[var(--muted-text)] py-2">
        <p>
          {isRtl
            ? 'منصة الأنشطة الحية لنادي الأنمي والثقافة اليابانية 🌸'
            : 'Sakura Live Club Activities Platform 🌸'}
        </p>
      </footer>
    </div>
  )
}
