import { Metadata } from 'next'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { Cherry } from 'lucide-react'
import SignInForm from '@/components/auth/SignInForm'

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to your Sakura account.',
}

export default async function LoginPage() {
  const cookieStore = await cookies()
  const locale = cookieStore.get('locale')?.value || 'en'
  const isRtl = locale === 'ar'

  return (
    <div className="min-h-screen sakura-bg-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6" aria-label="Go to home">
            <Cherry size={32} className="text-[var(--sakura-pink)]" aria-hidden="true" />
            <span className="font-bold text-2xl text-white">さくら</span>
          </Link>
          <h1 className="text-white text-2xl font-bold mb-2">
            {isRtl ? 'مرحباً بعودتك' : 'Welcome back'}
          </h1>
          <p className="text-[var(--muted-lavender)] text-sm">
            {isRtl ? 'سجّل دخولك إلى حساب ساكورا.' : 'Sign in to your Sakura account.'}
          </p>
        </div>

        {/* Form card */}
        <div className="card-dark p-8 rounded-3xl border border-[rgba(244,167,197,0.15)]">
          <SignInForm locale={locale} />

          <div className="mt-6 text-center">
            <p className="text-[var(--muted-lavender)] text-sm">
              {isRtl ? 'ليس لديك حساب؟' : "Don't have an account?"}{' '}
              <Link href="/register" className="text-[var(--sakura-pink)] hover:text-white font-semibold transition-colors">
                {isRtl ? 'إنشاء حساب' : 'Sign up'}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
