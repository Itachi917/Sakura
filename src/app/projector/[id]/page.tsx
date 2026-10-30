import { Metadata } from 'next'
import { cookies } from 'next/headers'
import ProjectorContainer from '@/components/projector/ProjectorContainer'

export const metadata: Metadata = {
  title: 'Projector View — Sakura Live Event',
  description: 'Widescreen projector display for Sakura club interactive gaming sessions.',
}

export default async function ProjectorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const cookieStore = await cookies()
  const locale = cookieStore.get('locale')?.value === 'ar' ? 'ar' : 'en'

  return <ProjectorContainer sessionId={id} locale={locale} />
}
