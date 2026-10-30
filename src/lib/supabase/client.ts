import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://oajakkpnttxccsnbdeks.supabase.co'
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_mWBTv6u4kmDOumsBV4gdSw_ktETEOV5'

  return createBrowserClient<Database>(url, key)
}
