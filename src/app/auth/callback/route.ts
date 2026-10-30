import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { type EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = (searchParams.get('type') as EmailOtpType) || 'signup'
  const next = searchParams.get('next') ?? '/'

  const origin = request.nextUrl.origin

  try {
    const supabase = await createClient()

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (!error) {
        return NextResponse.redirect(new URL(next, origin))
      }
      console.error('exchangeCodeForSession error in callback:', error)
    }

    if (token_hash) {
      const { error } = await supabase.auth.verifyOtp({
        type,
        token_hash,
      })
      if (!error) {
        return NextResponse.redirect(new URL(next, origin))
      }
      console.error('verifyOtp error in callback:', error)
    }
  } catch (err) {
    console.error('Auth callback route error:', err)
  }

  return NextResponse.redirect(new URL('/passport', origin))
}

