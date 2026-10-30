'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { isValidNickname, sanitizeNickname } from '@/lib/utils'

export default function SignUpForm({ locale = 'en' }: { locale?: string }) {
  const router = useRouter()
  const isRtl = locale === 'ar'
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Client-side validation
    const cleanNickname = sanitizeNickname(nickname)

    if (!isValidNickname(cleanNickname)) {
      setError(
        isRtl
          ? 'يجب أن يكون الاسم المستعار 2-32 حرفاً (حروف وأرقام ومسافات و -_. فقط).'
          : 'Nickname must be 2–32 characters (letters, numbers, spaces, -_.) only.'
      )
      setLoading(false)
      return
    }

    if (password.length < 8) {
      setError(isRtl ? 'يجب أن تكون كلمة المرور 8 أحرف على الأقل.' : 'Password must be at least 8 characters.')
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError(isRtl ? 'كلمتا المرور غير متطابقتان.' : 'Passwords do not match.')
      setLoading(false)
      return
    }

    // Check nickname availability
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .ilike('nickname', cleanNickname)
      .maybeSingle()

    if (existingProfile) {
      setError(isRtl ? 'هذا الاسم المستعار محجوز.' : 'This nickname is already taken.')
      setLoading(false)
      return
    }

    // Sign up
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nickname: cleanNickname,
          preferred_language: locale,
        },
      },
    })

    if (signUpError) {
      if (signUpError.message.includes('already registered')) {
        setError(isRtl ? 'يوجد حساب بهذا البريد الإلكتروني.' : 'An account with this email already exists.')
      } else if (signUpError.message.toLowerCase().includes('invalid')) {
        setError(
          isRtl
            ? 'يرجى إدخال عنوان بريد إلكتروني صالح (مثل Gmail أو Outlook).'
            : 'Please enter a valid email address with an active domain (e.g. @gmail.com).'
        )
      } else {
        setError(signUpError.message)
      }
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="text-center py-6">
        <div className="text-5xl mb-4">🌸</div>
        <h3 className="text-white font-bold text-xl mb-3">
          {isRtl ? 'تم إنشاء الحساب!' : 'Account created!'}
        </h3>
        <p className="text-[var(--muted-lavender)] text-sm">
          {isRtl
            ? 'تحقق من بريدك الإلكتروني لتأكيد حسابك.'
            : 'Check your email to confirm your account.'}
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSignUp} noValidate className="flex flex-col gap-4">
      {/* Nickname */}
      <div className="form-group">
        <label htmlFor="nickname" className="form-label text-[var(--muted-lavender)]">
          {isRtl ? 'الاسم المستعار' : 'Nickname'}
        </label>
        <div className="relative">
          <User
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted-text)]"
            aria-hidden="true"
          />
          <input
            id="nickname"
            type="text"
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            className="form-input form-input-dark ps-10"
            placeholder={isRtl ? 'اسمك الذي سيظهر للآخرين' : 'Your display name'}
            required
            maxLength={32}
            autoComplete="username"
          />
        </div>
        <p className="text-xs text-[var(--muted-text)]">
          {isRtl ? 'ظاهر للجميع · 2-32 حرف' : 'Visible to everyone · 2-32 characters'}
        </p>
      </div>

      {/* Email */}
      <div className="form-group">
        <label htmlFor="reg-email" className="form-label text-[var(--muted-lavender)]">
          {isRtl ? 'البريد الإلكتروني' : 'Email'}
        </label>
        <div className="relative">
          <Mail
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted-text)]"
            aria-hidden="true"
          />
          <input
            id="reg-email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="form-input form-input-dark ps-10"
            placeholder="your@email.com"
            required
            autoComplete="email"
            dir="ltr"
          />
        </div>
      </div>

      {/* Password */}
      <div className="form-group">
        <label htmlFor="reg-password" className="form-label text-[var(--muted-lavender)]">
          {isRtl ? 'كلمة المرور' : 'Password'}
        </label>
        <div className="relative">
          <Lock
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted-text)]"
            aria-hidden="true"
          />
          <input
            id="reg-password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="form-input form-input-dark ps-10 pe-12"
            placeholder="••••••••"
            required
            autoComplete="new-password"
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

      {/* Confirm password */}
      <div className="form-group">
        <label htmlFor="confirm-password" className="form-label text-[var(--muted-lavender)]">
          {isRtl ? 'تأكيد كلمة المرور' : 'Confirm Password'}
        </label>
        <div className="relative">
          <Lock
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted-text)]"
            aria-hidden="true"
          />
          <input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            className="form-input form-input-dark ps-10"
            placeholder="••••••••"
            required
            autoComplete="new-password"
            dir="ltr"
          />
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
        id="signup-submit-btn"
      >
        {loading
          ? (isRtl ? 'جارٍ إنشاء الحساب...' : 'Creating account...')
          : (isRtl ? 'إنشاء حساب' : 'Create Account')}
      </button>
    </form>
  )
}
