import { Metadata } from 'next'
import { cookies } from 'next/headers'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import AdminDashboard from '@/components/admin/AdminDashboard'

export const metadata: Metadata = {
  title: 'Admin Control Hub — Sakura',
  description: 'Manage live game sessions, events, quiz questions, and passport stamp awards.',
}

export default async function AdminPage() {
  const cookieStore = await cookies()
  const locale = cookieStore.get('locale')?.value === 'ar' ? 'ar' : 'en'

  return (
    <div className="min-h-screen bg-[var(--midnight-plum)] text-white flex flex-col justify-between">
      <Navbar />
      <main className="flex-1 pt-28 pb-16 px-4 sm:px-6 max-w-6xl mx-auto w-full">
        <AdminDashboard locale={locale} />
      </main>
      <Footer locale={locale} />
    </div>
  )
}
