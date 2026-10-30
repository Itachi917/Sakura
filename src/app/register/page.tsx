import { Metadata } from 'next'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { Cherry } from 'lucide-react'
import SignUpForm from '@/components/auth/SignUpForm'

export const metadata: Metadata = {
  title: 'Join Sakura',
  description: 'Create your Sakura account and start collecting stamps.',
}

export default async function RegisterPage() {
  const cookieStore = await cookies()
  const locale = cookieStore.get('locale')?.value || 'en'
  const isRtl = locale === 'ar'

  return (
    <div className="min-h-screen flex items-center justify-center p-4 py-12 relative z-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6 group" aria-label="Go to home">
            <div className="w-10 h-10 rounded-full overflow-hidden border border-pink-400/50 shadow-md">
              <img src="/logo.png" alt="Sakura" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
            </div>
            <span className="font-bold text-2xl text-white">さくら</span>
          </Link>
          <h1 className="text-white text-2xl font-bold mb-2">
            {isRtl ? 'انضم إلى ساكورا' : 'Join Sakura'}
          </h1>
          <p className="text-[var(--muted-lavender)] text-sm">
            {isRtl
              ? 'أنشئ حسابك وابدأ بجمع الأختام.'
              : 'Create your account and start collecting stamps.'}
          </p>
        </div>

        <div className="card-dark p-8 rounded-3xl border border-[rgba(244,167,197,0.15)]">
          <SignUpForm locale={locale} />

          <div className="mt-6 text-center">
            <p className="text-[var(--muted-lavender)] text-sm">
              {isRtl ? 'لديك حساب بالفعل؟' : 'Already have an account?'}{' '}
              <Link href="/login" className="text-[var(--sakura-pink)] hover:text-white font-semibold transition-colors">
                {isRtl ? 'تسجيل الدخول' : 'Sign in'}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
