'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X, Cherry, Globe } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { Profile, UserRole } from '@/types/database'
import { cn } from '@/lib/utils'

interface NavProps {
  locale?: string
  onLocaleChange?: (locale: string) => void
}

const DICT: Record<string, Record<string, string>> = {
  en: {
    'nav.home': 'Home',
    'nav.joinGame': 'Join Game',
    'nav.events': 'Events',
    'nav.passport': 'Passport',
    'nav.host': 'Host Room',
    'nav.admin': 'Admin',
    'common.language': 'Language',
    'common.profile': 'Profile',
    'common.signOut': 'Sign Out',
    'common.signIn': 'Sign In',
    'common.signUp': 'Sign Up',
  },
  ar: {
    'nav.home': 'الرئيسية',
    'nav.joinGame': 'انضم للعبة',
    'nav.events': 'الفعاليات',
    'nav.passport': 'الجواز',
    'nav.host': 'غرفة المنظم',
    'nav.admin': 'الإدارة',
    'common.language': 'اللغة',
    'common.profile': 'الملف الشخصي',
    'common.signOut': 'تسجيل الخروج',
    'common.signIn': 'تسجيل الدخول',
    'common.signUp': 'حساب جديد',
  },
}

export default function Navbar({ locale = 'en', onLocaleChange }: NavProps) {
  const t = (key: string): string => DICT[locale]?.[key] || DICT['en']?.[key] || key
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [role, setRole] = useState<UserRole | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        const [{ data: profileData }, { data: roleData }] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', user.id).single(),
          supabase.from('user_roles').select('role').eq('user_id', user.id)
            .order('role').limit(1).single(),
        ])
        setProfile(profileData)
        setRole(roleData?.role ?? null)
      }
    }
    fetchUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
      if (!session) { setProfile(null); setRole(null) }
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const toggleLocale = () => {
    const newLocale = locale === 'en' ? 'ar' : 'en'
    document.cookie = `locale=${newLocale}; path=/; max-age=31536000`
    window.location.reload()
  }

  const isAdmin = role && ['super_admin', 'club_admin'].includes(role)
  const isHost = role && ['super_admin', 'club_admin', 'event_host'].includes(role)

  return (
    <nav
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-[rgba(24,12,34,0.98)] backdrop-blur-md border-b border-[rgba(244,167,197,0.2)] shadow-xl'
          : 'bg-[rgba(24,12,34,0.85)] backdrop-blur-md border-b border-[rgba(244,167,197,0.12)]'
      )}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="container-sakura">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 group"
            aria-label="Sakura home"
          >
            <div className="w-8 h-8 relative">
              <Cherry
                className="text-[var(--sakura-pink)] group-hover:scale-110 transition-transform"
                size={32}
                aria-hidden="true"
              />
            </div>
            <span className="font-bold text-xl text-white tracking-tight hidden sm:block">
              さ<span className="text-gradient-sakura">くら</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-2">
            <NavLink href="/" label={t('nav.home')} />
            <NavLink href="/join" label={t('nav.joinGame')} />
            <NavLink href="/events" label={t('nav.events')} />
            <NavLink href="/passport" label={t('nav.passport')} />
            {isHost && <NavLink href="/admin" label={t('nav.host')} />}
            {isAdmin && <NavLink href="/admin" label={t('nav.admin')} />}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {/* Language toggle */}
            <button
              onClick={toggleLocale}
              className="btn btn-ghost btn-sm text-[var(--muted-lavender)] hover:text-white"
              aria-label={t('common.language')}
              id="locale-toggle"
            >
              <Globe size={16} aria-hidden="true" />
              <span className="text-xs">{locale === 'en' ? 'عربي' : 'EN'}</span>
            </button>

            {/* Join game CTA */}
            <Link href="/join" className="btn btn-primary btn-sm hidden sm:inline-flex" id="nav-join-cta">
              {t('nav.joinGame')}
            </Link>

            {/* Auth */}
            {user ? (
              <div className="relative group hidden md:block">
                <button
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white hover:bg-[rgba(244,167,197,0.1)] transition-colors"
                  id="user-menu-btn"
                  aria-haspopup="true"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--deep-sakura)] to-[var(--sakura-pink)] flex items-center justify-center text-xs font-bold text-white">
                    {profile?.nickname?.charAt(0).toUpperCase() ?? '?'}
                  </div>
                  <span className="max-w-24 truncate">{profile?.nickname ?? user.email}</span>
                </button>
                <div className="absolute right-0 top-full mt-1 w-44 bg-[var(--dark-plum-surface)] border border-[rgba(244,167,197,0.15)] rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-dropdown">
                  <Link href="/profile" className="block px-4 py-2.5 text-sm text-[var(--muted-lavender)] hover:text-white hover:bg-[rgba(244,167,197,0.08)] rounded-t-xl transition-colors">
                    {t('common.profile')}
                  </Link>
                  <Link href="/passport" className="block px-4 py-2.5 text-sm text-[var(--muted-lavender)] hover:text-white hover:bg-[rgba(244,167,197,0.08)] rounded-t-xl transition-colors">
                    {t('nav.passport')}
                  </Link>
                  <hr className="border-[rgba(244,167,197,0.1)]" />
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-4 py-2.5 text-sm text-[var(--error)] hover:bg-[rgba(201,76,100,0.1)] rounded-b-xl transition-colors"
                    id="sign-out-btn"
                  >
                    {t('common.signOut')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link href="/login" className="btn btn-ghost btn-sm text-pink-200 hover:text-white" id="nav-login">
                  {t('common.signIn')}
                </Link>
                <Link href="/register" className="btn btn-secondary btn-sm" id="nav-register">
                  {t('common.signUp')}
                </Link>
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              className="md:hidden btn btn-ghost btn-sm text-white p-2"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-expanded={mobileOpen}
              aria-label="Toggle menu"
              id="mobile-menu-btn"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-[#180C22]/95 backdrop-blur-xl border-t border-[rgba(244,167,197,0.15)] px-4 py-4 animate-fade-in shadow-2xl">
          <div className="flex flex-col gap-2">
            <MobileNavLink href="/" label={t('nav.home')} onClick={() => setMobileOpen(false)} />
            <MobileNavLink href="/join" label={t('nav.joinGame')} onClick={() => setMobileOpen(false)} />
            <MobileNavLink href="/events" label={t('nav.events')} onClick={() => setMobileOpen(false)} />
            <MobileNavLink href="/passport" label={t('nav.passport')} onClick={() => setMobileOpen(false)} />
            {isHost && (
              <MobileNavLink href="/admin" label={t('nav.host')} onClick={() => setMobileOpen(false)} />
            )}
            {isAdmin && (
              <MobileNavLink href="/admin" label={t('nav.admin')} onClick={() => setMobileOpen(false)} />
            )}
            <hr className="border-[rgba(244,167,197,0.15)] my-2" />
            {user ? (
              <button
                onClick={() => { handleSignOut(); setMobileOpen(false) }}
                className="text-left px-4 py-3 text-sm text-[var(--error)] rounded-lg hover:bg-[rgba(201,76,100,0.1)] transition-colors"
              >
                {t('common.signOut')}
              </button>
            ) : (
              <div className="flex flex-col gap-2 pt-1">
                <Link href="/login" className="btn btn-secondary w-full" onClick={() => setMobileOpen(false)}>
                  {t('common.signIn')}
                </Link>
                <Link href="/register" className="btn btn-primary w-full" onClick={() => setMobileOpen(false)}>
                  {t('common.signUp')}
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="px-3 py-1.5 text-sm text-pink-100/80 hover:text-white rounded-xl hover:bg-pink-500/15 border border-transparent hover:border-pink-500/20 transition-all font-semibold whitespace-nowrap"
    >
      {label}
    </Link>
  )
}

function MobileNavLink({ href, label, onClick }: { href: string; label: string; onClick: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="px-4 py-3 text-sm text-pink-100 hover:text-white rounded-xl hover:bg-pink-500/15 transition-all font-semibold"
    >
      {label}
    </Link>
  )
}
