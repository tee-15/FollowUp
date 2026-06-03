// app/settings/page.tsx
// Settings page — React Server Component.
// Fetches the current user's profile from Supabase and passes name + businessName
// to the UpdateProfileForm client component. Middleware handles the primary auth
// guard, but this page adds a defensive redirect in case the middleware is bypassed.
//
// Requirements: 1.10, 1.9

import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import UpdateProfileForm from '@/components/UpdateProfileForm'

export const metadata = {
  title: 'Settings — FollowUp CRM',
}

export default async function SettingsPage() {
  const supabase = createServerClient()

  // Defensive auth guard — middleware handles this for every request, but this
  // provides a safety net if the page is accessed directly in unusual scenarios.
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  // Fetch the authenticated user's profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('name, business_name')
    .eq('id', user.id)
    .single()

  // Fall back to empty strings if the profile row hasn't been created yet
  // (e.g., if the DB trigger fired asynchronously and the user lands here fast)
  const initialName = profile?.name ?? ''
  const initialBusinessName = profile?.business_name ?? ''

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        {/* Page heading */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="mt-1 text-sm text-gray-500">
            Update your name and business name below.
          </p>
        </div>

        {/* Profile section */}
        <section
          aria-labelledby="profile-section-heading"
          className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200"
        >
          <h2
            id="profile-section-heading"
            className="mb-6 text-base font-semibold text-gray-800"
          >
            Profile
          </h2>

          <UpdateProfileForm
            initialName={initialName}
            initialBusinessName={initialBusinessName}
          />
        </section>
      </div>
    </main>
  )
}
