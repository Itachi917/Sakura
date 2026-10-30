import { Metadata } from 'next'
import { cookies } from 'next/headers'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import PassportBooklet from '@/components/passport/PassportBooklet'

export const metadata: Metadata = {
  title: 'Public Passport — Sakura Club',
  description: 'View this attendee\'s collectible stamps and achievements in the Sakura Anime Club.',
}

export default async function PublicPassportPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const cookieStore = await cookies()
  const locale = cookieStore.get('locale')?.value === 'ar' ? 'ar' : 'en'

  return (
    <div className="min-h-screen bg-[var(--midnight-plum)] text-white flex flex-col justify-between">
      <Navbar />
      <main className="flex-1 py-10 px-4 sm:px-6 max-w-5xl mx-auto w-full">
        <PassportBooklet targetUserId={id} locale={locale} />
      </main>
      <Footer locale={locale} />
    </div>
  )
}
