import { Metadata } from 'next'
import { cookies } from 'next/headers'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import PassportBooklet from '@/components/passport/PassportBooklet'

export const metadata: Metadata = {
  title: 'Sakura Passport — Your Club Identity & Collectibles',
  description: 'View your digital anime club passport, collectible event stamps, and unlockable titles.',
}

export default async function PassportPage() {
  const cookieStore = await cookies()
  const locale = cookieStore.get('locale')?.value === 'ar' ? 'ar' : 'en'

  return (
    <div className="min-h-screen text-white flex flex-col justify-between">
      <Navbar locale={locale} />
      <main className="flex-1 w-full max-w-6xl xl:max-w-7xl self-center px-4 sm:px-8 pb-16" style={{ paddingTop: '7rem' }}>
        <PassportBooklet locale={locale} />
      </main>
      <Footer locale={locale} />
    </div>
  )
}
