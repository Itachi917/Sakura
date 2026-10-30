import { Metadata } from 'next'
import { cookies } from 'next/headers'
import PlayerContainer from '@/components/player/PlayerContainer'

export const metadata: Metadata = {
  title: 'Play Live — Sakura Game',
  description: 'Interactive player interface for Sakura live club activities.',
}

export default async function PlayPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const cookieStore = await cookies()
  const locale = cookieStore.get('locale')?.value === 'ar' ? 'ar' : 'en'

  return <PlayerContainer sessionId={id} locale={locale} />
}
