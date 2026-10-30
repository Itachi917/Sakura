import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://oajakkpnttxccsnbdeks.supabase.co'
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_mWBTv6u4kmDOumsBV4gdSw_ktETEOV5'
  const cookieStore = await cookies()

  return createServerClient<Database>(
    url,
    key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component — cookie setting handled by middleware
          }
        },
      },
    }
  )
}
