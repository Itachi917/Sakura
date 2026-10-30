import { Metadata } from 'next'
import { cookies } from 'next/headers'
import HostControlRoom from '@/components/host/HostControlRoom'

export const metadata: Metadata = {
  title: 'Host Control Room — Sakura',
  description: 'Organizer control room for running Sakura live interactive games.',
}

export default async function HostSessionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const cookieStore = await cookies()
  const locale = cookieStore.get('locale')?.value === 'ar' ? 'ar' : 'en'

  return <HostControlRoom sessionId={id} locale={locale} />
}
