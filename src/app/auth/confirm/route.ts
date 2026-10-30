import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = (searchParams.get('type') as EmailOtpType) || 'signup'
  const next = searchParams.get('next') ?? '/'
  const code = searchParams.get('code')

  const origin = request.nextUrl.origin

  try {
    const supabase = await createClient()

    // 1. Verify OTP using token_hash
    if (token_hash) {
      const { error } = await supabase.auth.verifyOtp({
        type,
        token_hash,
      })

      if (!error) {
        return NextResponse.redirect(new URL(next, origin))
      }
      console.error('verifyOtp error:', error)
    }

    // 2. Exchange code for session if code was passed
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (!error) {
        return NextResponse.redirect(new URL(next, origin))
      }
      console.error('exchangeCodeForSession error:', error)
    }
  } catch (err) {
    console.error('Auth confirm route error:', err)
  }

  // Redirect to passport or home on completion/fallback
  return NextResponse.redirect(new URL('/passport', origin))
}

