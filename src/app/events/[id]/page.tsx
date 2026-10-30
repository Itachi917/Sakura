import { Metadata } from 'next'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { Calendar, MapPin, QrCode, ArrowLeft, Play, Sparkles } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { createClient } from '@/lib/supabase/server'
import { formatDate, formatTime } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Event Details — Sakura',
  description: 'View full event details, check-in instructions, and live activity rooms.',
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const cookieStore = await cookies()
  const locale = cookieStore.get('locale')?.value === 'ar' ? 'ar' : 'en'
  const isRtl = locale === 'ar'
  const supabase = await createClient()

  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  // Fallback demo event if not in DB
  const eventData = event || {
    id,
    title: 'Spacetoon Nostalgia Night',
    title_ar: 'ليلة نوستالجيا سبيستون الذهبية',
    description: 'Relive the golden era of 90s and 2000s Arabic-dubbed anime with team trivia and iconic OST singalongs.',
    description_ar: 'استرجع ذكريات العصر الذهبي للأنمي المدبلج بمركز الزهرة مع مسابقات تفاعلية وأغاني الشارات الخالدة.',
    venue: 'Student Activities Hall A',
    starts_at: new Date(Date.now() + 86400000 * 2).toISOString(),
    ends_at: new Date(Date.now() + 86400000 * 2 + 7200000).toISOString(),
    status: 'published' as const,
    banner_url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&auto=format&fit=crop',
    check_in_open: true,
    check_in_code: 'SPCE',
    created_by: 'admin',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  return (
    <div className="min-h-screen text-white flex flex-col justify-between">
      <Navbar locale={locale} />

      <main className="flex-1 pt-28 pb-16 px-4 sm:px-6 max-w-4xl mx-auto w-full">
        <Link
          href="/events"
          className="inline-flex items-center gap-1.5 text-xs text-pink-300 hover:text-white mb-6 px-3 py-1.5 rounded-xl bg-white/5 border border-pink-500/20"
        >
          <ArrowLeft size={14} className={isRtl ? 'rotate-180' : ''} />
          <span>{isRtl ? 'العودة لقائمة الفعاليات' : 'Back to Events'}</span>
        </Link>

        {/* Hero Banner */}
        <div className="relative rounded-3xl overflow-hidden aspect-[21/9] border-2 border-pink-500/20 shadow-2xl mb-8">
          <img
            src={eventData.banner_url || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&auto=format&fit=crop'}
            alt={eventData.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1b0d25] via-black/40 to-transparent" />
          <div className="absolute bottom-6 left-6 right-6">
            <span className="px-3 py-1 rounded-full bg-pink-500/80 text-white text-xs font-bold uppercase tracking-wider mb-2 inline-block">
              {eventData.status}
            </span>
            <h1 className="text-2xl sm:text-4xl font-black text-white">
              {isRtl ? eventData.title_ar || eventData.title : eventData.title}
            </h1>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Description */}
          <div className="md:col-span-2 p-6 rounded-3xl bg-black/40 border border-pink-500/20 backdrop-blur-md space-y-4">
            <h3 className="text-lg font-bold text-white">
              {isRtl ? 'عن الفعالية' : 'About This Event'}
            </h3>
            <p className="text-sm sm:text-base text-pink-100/80 leading-relaxed">
              {isRtl ? eventData.description_ar || eventData.description : eventData.description}
            </p>
          </div>

          {/* Logistics & Check-In */}
          <div className="p-6 rounded-3xl bg-black/40 border border-pink-500/20 backdrop-blur-md space-y-4">
            <div>
              <span className="text-xs uppercase tracking-wider text-pink-300 font-bold block mb-1">
                {isRtl ? 'الموعد' : 'Date & Time'}
              </span>
              <div className="flex items-center gap-2 text-sm text-white">
                <Calendar size={16} className="text-pink-400" />
                <span>{eventData.starts_at ? formatDate(eventData.starts_at, locale) : 'TBA'}</span>
              </div>
            </div>

            <div>
              <span className="text-xs uppercase tracking-wider text-pink-300 font-bold block mb-1">
                {isRtl ? 'المكان' : 'Venue'}
              </span>
              <div className="flex items-center gap-2 text-sm text-white">
                <MapPin size={16} className="text-pink-400" />
                <span>{eventData.venue || (isRtl ? 'قاعة الأنشطة الطلابية' : 'Campus Hall')}</span>
              </div>
            </div>

            {eventData.check_in_open && (
              <div className="pt-4 border-t border-pink-500/15">
                <Link
                  href="/passport"
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg"
                >
                  <QrCode size={16} />
                  <span>{isRtl ? 'تسجيل الحضور في الجواز' : 'Check In to Passport'}</span>
                </Link>
                {eventData.check_in_code && (
                  <p className="text-[11px] text-pink-300/60 text-center mt-2 font-mono">
                    CODE: {eventData.check_in_code}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer locale={locale} />
    </div>
  )
}
