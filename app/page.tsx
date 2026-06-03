// app/page.tsx
// Root page — server component.
// Checks the Supabase session and redirects:
//   • Authenticated  →  /dashboard
//   • Unauthenticated →  /login

import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import LandingPage from '@/components/LandingPage'

export default async function RootPage() {
  const supabase = createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return <LandingPage />
}
