import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://oajakkpnttxccsnbdeks.supabase.co'
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_mWBTv6u4kmDOumsBV4gdSw_ktETEOV5'

  let supabaseResponse = NextResponse.next({ request })

  try {
    const supabase = createServerClient<Database>(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            )
            supabaseResponse = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

  // Refresh session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Protected admin routes
  const adminRoutes = ['/admin']
  const hostRoutes = ['/host']
  const authRoutes = ['/login', '/register']

  const isAdminRoute = adminRoutes.some(r => pathname.startsWith(r))
  const isHostRoute = hostRoutes.some(r => pathname.startsWith(r))
  const isAuthRoute = authRoutes.some(r => pathname.startsWith(r))

  // Redirect unauthenticated users trying to access protected routes
  if (!user && (isAdminRoute || isHostRoute)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from auth pages
  if (user && isAuthRoute) {
    const redirectTo = request.nextUrl.searchParams.get('redirectTo') || '/'
    const url = request.nextUrl.clone()
    url.pathname = redirectTo
    return NextResponse.redirect(url)
  }

    return supabaseResponse
  } catch (err) {
    console.error('Session update error in middleware:', err)
    return NextResponse.next({ request })
  }
}
