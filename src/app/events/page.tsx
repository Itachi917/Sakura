import { Metadata } from 'next'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { Calendar, MapPin, Sparkles, ArrowRight } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import EventCard from '@/components/landing/EventCard'
import { createClient } from '@/lib/supabase/server'
import type { Event } from '@/types/database'

export const metadata: Metadata = {
  title: 'Club Events — Sakura',
  description: 'Explore upcoming live events, anime trivia tournaments, and cultural workshops at Sakura Club.',
}

export default async function EventsPage() {
  const cookieStore = await cookies()
  const locale = cookieStore.get('locale')?.value === 'ar' ? 'ar' : 'en'
  const isRtl = locale === 'ar'
  const supabase = await createClient()

  const { data: events } = await supabase
    .from('events')
    .select('*')
    .order('starts_at', { ascending: true })

  // Fallback demo events if database has none
  const displayEvents: Event[] =
    events && events.length > 0
      ? events
      : [
          {
            id: 'demo-event-1',
            title: 'Spacetoon Nostalgia Night',
            title_ar: 'ليلة نوستالجيا سبيستون الذهبية',
            description: 'Relive the golden era of 90s and 2000s Arabic-dubbed anime with team trivia and iconic OST singalongs.',
            description_ar: 'استرجع ذكريات العصر الذهبي للأنمي المدبلج بمركز الزهرة مع مسابقات تفاعلية وأغاني الشارات الخالدة.',
            venue: 'Student Activities Hall A',
            starts_at: new Date(Date.now() + 86400000 * 3).toISOString(),
            ends_at: new Date(Date.now() + 86400000 * 3 + 7200000).toISOString(),
            status: 'published',
            banner_url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop',
            check_in_open: true,
            check_in_code: 'SPCE',
            created_by: 'admin',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: 'demo-event-2',
            title: 'Sakura Feud Tournament',
            title_ar: 'بطولة فيود ساكورا الفرقية',
            description: 'Two massive teams clash on anime survey trivia to claim the legendary club champion trophy.',
            description_ar: 'منافسة شيقة بين فريقين لتخمين أكثر الإجابات شيوعاً في استطلاعات الأنمي اليابانية.',
            venue: 'Main Auditorium',
            starts_at: new Date(Date.now() + 86400000 * 10).toISOString(),
            ends_at: new Date(Date.now() + 86400000 * 10 + 7200000).toISOString(),
            status: 'published',
            banner_url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop',
            check_in_open: false,
            check_in_code: 'FEUD',
            created_by: 'admin',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]

  return (
    <div className="min-h-screen bg-[var(--midnight-plum)] text-white flex flex-col justify-between">
      <Navbar locale={locale} />

      <main className="flex-1 pt-28 pb-16 px-4 sm:px-6 max-w-6xl mx-auto w-full">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-pink-500/20 text-pink-300 text-xs font-bold border border-pink-400/30 mb-3">
            <Sparkles size={14} />
            <span>{isRtl ? 'فعاليات النادي الحضورية' : 'Campus Physical Events'}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white">
            {isRtl ? 'جدول الفعاليات والأنشطة 🌸' : 'Club Events Schedule 🌸'}
          </h1>
          <p className="text-sm sm:text-base text-pink-200/70 mt-3 leading-relaxed">
            {isRtl
              ? 'انضم إلينا في فعالياتنا التفاعلية الحية داخل الحرم الجامعي، اجمع أختام جوازك، ونافس زملاءك!'
              : 'Join our physical club events on campus, collect stamps in your digital passport, and compete with fellow fans!'}
          </p>
        </div>

        {/* Events Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayEvents.map(event => (
            <EventCard key={event.id} event={event} locale={locale} />
          ))}
        </div>
      </main>

      <Footer locale={locale} />
    </div>
  )
}
