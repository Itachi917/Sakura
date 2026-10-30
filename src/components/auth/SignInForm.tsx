'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Mail, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function SignInForm({ locale = 'en' }: { locale?: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isRtl = locale === 'ar'
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      if (error.message.toLowerCase().includes('confirm')) {
        setError(
          isRtl
            ? 'البريد الإلكتروني غير مؤكد بعد. يرجى تأكيد بريدك أو إيقاف "Confirm email" في إعدادات Supabase.'
            : 'Email not confirmed yet. Please confirm via your email link, or disable "Confirm email" in Supabase Auth.'
        )
      } else {
        setError(
          isRtl
            ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة.'
            : error.message || 'Invalid email or password.'
        )
      }
      setLoading(false)
      return
    }

    const redirectTo = searchParams.get('redirectTo') || '/'
    router.push(redirectTo)
    router.refresh()
  }

  return (
    <form onSubmit={handleSignIn} noValidate className="flex flex-col gap-4">
      {/* Email */}
      <div className="form-group">
        <label htmlFor="email" className="form-label text-[var(--muted-lavender)]">
          {isRtl ? 'البريد الإلكتروني' : 'Email'}
        </label>
        <div className="relative">
          <Mail
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted-text)]"
            aria-hidden="true"
          />
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="form-input form-input-dark ps-10"
            placeholder={isRtl ? 'بريدك الإلكتروني' : 'your@email.com'}
            required
            autoComplete="email"
            dir="ltr"
          />
        </div>
      </div>

      {/* Password */}
      <div className="form-group">
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="form-label text-[var(--muted-lavender)]">
            {isRtl ? 'كلمة المرور' : 'Password'}
          </label>
          <button
            type="button"
            className="text-xs text-[var(--sakura-pink)] hover:text-white transition-colors"
            onClick={() => {/* TODO: forgot password */}}
          >
            {isRtl ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
          </button>
        </div>
        <div className="relative">
          <Lock
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted-text)]"
            aria-hidden="true"
          />
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="form-input form-input-dark ps-10 pe-12"
            placeholder="••••••••"
            required
            autoComplete="current-password"
            dir="ltr"
          />
          <button
            type="button"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--muted-text)] hover:text-white transition-colors"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="form-error bg-[rgba(201,76,100,0.1)] px-4 py-3 rounded-lg text-sm" role="alert">
          ⚠️ {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        className="btn btn-primary w-full mt-2"
        disabled={loading}
        id="signin-submit-btn"
      >
        {loading ? (isRtl ? 'جارٍ تسجيل الدخول...' : 'Signing in...') : (isRtl ? 'تسجيل الدخول' : 'Sign In')}
      </button>
    </form>
  )
}
