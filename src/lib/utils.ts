import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date, locale: string = 'en'): string {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date))
}

export function formatTime(date: string | Date, locale: string = 'en'): string {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function formatRelativeTime(date: string | Date, locale: string = 'en'): string {
  const rtf = new Intl.RelativeTimeFormat(locale === 'ar' ? 'ar' : 'en', {
    numeric: 'auto',
  })
  const diff = (new Date(date).getTime() - Date.now()) / 1000
  if (Math.abs(diff) < 60) return rtf.format(Math.round(diff), 'second')
  if (Math.abs(diff) < 3600) return rtf.format(Math.round(diff / 60), 'minute')
  if (Math.abs(diff) < 86400) return rtf.format(Math.round(diff / 3600), 'hour')
  return rtf.format(Math.round(diff / 86400), 'day')
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - 3) + '...'
}

export function generateGuestToken(): string {
  return `guest_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export function getRemainingSeconds(deadline: string | null): number {
  if (!deadline) return 0
  return Math.max(0, Math.ceil((new Date(deadline).getTime() - Date.now()) / 1000))
}

export function getActivityLabel(activityType: string, locale: string = 'en'): string {
  const labels: Record<string, Record<string, string>> = {
    whos_that_character: { en: "Who's That Character?", ar: 'من هذه الشخصية؟' },
    spacetoon_nostalgia: { en: 'Spacetoon Nostalgia', ar: 'نوستالجيا سبيستون' },
    anime_expert_exam: { en: 'Anime Expert Exam', ar: 'اختبار خبير الأنمي' },
    sakura_feud: { en: 'Sakura Feud', ar: 'فيود ساكورا' },
    draw_it_guess_it: { en: 'Draw It, Guess It', ar: 'ارسم واخمّن' },
  }
  return labels[activityType]?.[locale] ?? activityType
}

export function getActivityIcon(activityType: string): string {
  const icons: Record<string, string> = {
    whos_that_character: '🎭',
    spacetoon_nostalgia: '📺',
    anime_expert_exam: '📚',
    sakura_feud: '⚔️',
    draw_it_guess_it: '🎨',
  }
  return icons[activityType] ?? '🎮'
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: 'badge-plum',
    published: 'badge-success',
    active: 'badge-pink',
    completed: 'badge-plum',
    cancelled: 'badge-error',
    lobby: 'badge-warning',
    question_active: 'badge-pink',
    final_results: 'badge-success',
  }
  return colors[status] ?? 'badge-plum'
}

export function formatPin(pin: string): string {
  // Format: 123 456
  return pin.replace(/(\d{3})(\d{3})/, '$1 $2')
}

export function getRarityColor(rarity: string | null): string {
  switch (rarity) {
    case 'legendary': return '#D59A45'
    case 'rare': return '#5B8AE8'
    case 'uncommon': return '#438A68'
    default: return '#B9A1C8'
  }
}

export function sanitizeNickname(nickname: string): string {
  return nickname.trim().replace(/\s+/g, ' ').slice(0, 32)
}

export function isValidNickname(nickname: string): boolean {
  const cleaned = sanitizeNickname(nickname)
  return (
    cleaned.length >= 2 &&
    cleaned.length <= 32 &&
    /^[a-zA-Z0-9\u0600-\u06FF _\-.]+$/.test(cleaned)
  )
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
