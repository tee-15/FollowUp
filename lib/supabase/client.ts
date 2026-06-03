// lib/supabase/client.ts
// Browser-side Supabase client for use in Client Components.
// Used for auth state listener and client-side interactions.

import { createBrowserClient as createSSRBrowserClient } from '@supabase/ssr'

export function createBrowserClient() {
  return createSSRBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
