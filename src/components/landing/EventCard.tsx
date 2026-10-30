import Link from 'next/link'
import { Calendar, MapPin, ArrowRight } from 'lucide-react'
import { formatDate, formatTime, getStatusColor } from '@/lib/utils'
import type { Event } from '@/types/database'

interface EventCardProps {
  event: Event
  locale?: string
}

export default function EventCard({ event, locale = 'en' }: EventCardProps) {
  const isRtl = locale === 'ar'
  const title = isRtl && event.title_ar ? event.title_ar : event.title
  const description = isRtl && event.description_ar ? event.description_ar : event.description

  const isActive = event.status === 'active'

  return (
    <Link
      href={`/events/${event.id}`}
      className="card group hover:shadow-md transition-all hover:-translate-y-0.5"
      id={`event-card-${event.id}`}
    >
      {/* Banner */}
      {event.banner_url ? (
        <div className="h-40 -mx-6 -mt-6 mb-5 rounded-t-2xl overflow-hidden">
          <img
            src={event.banner_url}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>
      ) : (
        <div
          className="h-40 -mx-6 -mt-6 mb-5 rounded-t-2xl flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, rgba(217,108,157,0.15) 0%, rgba(185,161,200,0.1) 100%)',
          }}
        >
          <span className="text-6xl opacity-60">🌸</span>
        </div>
      )}

      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="font-bold text-white text-lg leading-tight group-hover:text-[var(--sakura-pink)] transition-colors">
          {title}
        </h3>
        {isActive && (
          <span className="badge badge-pink flex-shrink-0 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--deep-sakura)] animate-pulse" aria-hidden="true" />
            {isRtl ? 'مباشر' : 'Live'}
          </span>
        )}
      </div>

      {description && (
        <p className="text-pink-100/70 text-sm mb-4 line-clamp-2 leading-relaxed">
          {description}
        </p>
      )}

      <div className="flex flex-col gap-1.5 text-xs text-pink-200/60">
        {event.starts_at && (
          <div className="flex items-center gap-1.5">
            <Calendar size={12} aria-hidden="true" className="text-pink-400" />
            <span>
              {formatDate(event.starts_at, locale)} · {formatTime(event.starts_at, locale)}
            </span>
          </div>
        )}
        {event.venue && (
          <div className="flex items-center gap-1.5">
            <MapPin size={12} aria-hidden="true" className="text-pink-400" />
            <span>{event.venue}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-[rgba(244,167,197,0.15)]">
        <span className={`badge ${getStatusColor(event.status)}`}>
          {isRtl
            ? { draft: 'مسودة', published: 'منشور', active: 'نشط', completed: 'مكتمل', cancelled: 'ملغى' }[event.status] ?? event.status
            : event.status.charAt(0).toUpperCase() + event.status.slice(1)}
        </span>
        <span className="text-[var(--deep-sakura)] text-xs font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
          {isRtl ? 'التفاصيل' : 'Details'}
          <ArrowRight size={12} aria-hidden="true" />
        </span>
      </div>
    </Link>
  )
}
