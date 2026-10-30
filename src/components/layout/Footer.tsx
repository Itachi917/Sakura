import Link from 'next/link'
import { Cherry } from 'lucide-react'

export default function Footer({ locale = 'en' }: { locale?: string }) {
  const isRtl = locale === 'ar'
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-[var(--midnight-plum)] border-t border-[rgba(244,167,197,0.1)] py-12">
      <div className="container-sakura">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <Cherry className="text-[var(--sakura-pink)]" size={24} />
              <span className="font-bold text-lg text-white">
                さくら <span className="text-[var(--sakura-pink)]">Sakura</span>
              </span>
            </Link>
            <p className="text-pink-100/75 text-sm leading-relaxed max-w-sm">
              {isRtl
                ? 'ساكورا — المنصة الرقمية الرسمية لنادي الثقافة اليابانية والأنمي الجامعي.'
                : 'Sakura — the official digital platform for our university Japanese culture and anime club.'}
            </p>
            <p className="text-pink-300/80 text-xs mt-3 font-medium">
              {isRtl ? 'عالم يجمع الأنمي والثقافة اليابانية' : 'Where Anime Meets Japanese Culture.'}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-bold text-white mb-4 tracking-wide uppercase">
              {isRtl ? 'روابط سريعة' : 'Quick Links'}
            </h4>
            <ul className="flex flex-col gap-2.5">
              {[
                { href: '/join', label: isRtl ? 'انضم إلى لعبة' : 'Join a Game' },
                { href: '/events', label: isRtl ? 'الفعاليات' : 'Events' },
                { href: '/passport', label: isRtl ? 'الجواز' : 'Passport' },
                { href: '/login', label: isRtl ? 'تسجيل الدخول' : 'Sign In' },
              ].map(link => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-pink-100/70 hover:text-white hover:translate-x-1 inline-block text-sm transition-all"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Activities */}
          <div>
            <h4 className="text-sm font-bold text-white mb-4 tracking-wide uppercase">
              {isRtl ? 'الأنشطة' : 'Activities'}
            </h4>
            <ul className="flex flex-col gap-2.5">
              {[
                { emoji: '🎭', label: isRtl ? 'من هذه الشخصية؟' : "Who's That Character?" },
                { emoji: '📺', label: isRtl ? 'نوستالجيا سبيستون' : 'Spacetoon Nostalgia' },
                { emoji: '📚', label: isRtl ? 'اختبار خبير الأنمي' : 'Anime Expert Exam' },
                { emoji: '⚔️', label: isRtl ? 'فيود ساكورا' : 'Sakura Feud' },
                { emoji: '🎨', label: isRtl ? 'ارسم واخمّن' : 'Draw It, Guess It' },
              ].map(item => (
                <li key={item.label} className="text-pink-100/70 text-sm flex items-center gap-2">
                  <span>{item.emoji}</span>
                  <span>{item.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-pink-500/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-pink-200/50 text-xs">
            © {currentYear} Sakura Club. {isRtl ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}
          </p>
          <div className="flex items-center gap-4">
            <span className="text-[var(--muted-lavender)] text-xs">
              🌸 {isRtl ? 'بُني بالحب' : 'Built with love'}
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
