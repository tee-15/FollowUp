// app/leads/[id]/page.tsx
// Lead Detail page — React Server Component.
// Fetches the lead, its follow-ups, notes, and activities in parallel,
// then passes everything to the LeadDetailClient component.

import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import LeadDetailClient from './LeadDetailClient'
import type { Lead, FollowUp, Note, Activity } from '@/lib/types'

interface Props {
  params: { id: string }
}

export async function generateMetadata() {
  return { title: `Lead | FollowUp CRM` }
}

export default async function LeadDetailPage({ params }: Props) {
  const supabase = createServerClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  // Fetch lead, follow-ups, notes, activities, and profile in parallel
  const [leadResult, followUpsResult, notesResult, activitiesResult, profileResult] =
    await Promise.all([
      supabase.from('leads').select('*').eq('id', params.id).eq('user_id', user.id).single(),
      supabase
        .from('follow_ups')
        .select('*')
        .eq('lead_id', params.id)
        .order('due_date', { ascending: false }),
      supabase
        .from('notes')
        .select('*')
        .eq('lead_id', params.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('activities')
        .select('*')
        .eq('lead_id', params.id)
        .order('created_at', { ascending: false }),
      supabase.from('profiles').select('business_name').eq('id', user.id).single(),
    ])

  if (leadResult.error || !leadResult.data) {
    notFound()
  }

  const lead = leadResult.data as Lead
  const followUps = (followUpsResult.data ?? []) as FollowUp[]
  const notes = (notesResult.data ?? []) as Note[]
  const activities = (activitiesResult.data ?? []) as Activity[]
  const businessName = profileResult.data?.business_name ?? null

  return (
    <>
      {/* Back navigation bar */}
      <div className="sticky top-0 z-10 bg-white/70 backdrop-blur-xl border-b border-gray-200/50 px-4 py-3 flex items-center gap-3 shadow-sm">
        <Link
          href="/leads"
          className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 shadow-sm"
          aria-label="Back to leads"
        >
          ←
        </Link>
        <h1 className="text-sm font-bold text-gray-700 truncate tracking-wide uppercase">Lead Profile</h1>
      </div>

      <LeadDetailClient
        lead={lead}
        followUps={followUps}
        notes={notes}
        activities={activities}
        businessName={businessName}
      />
    </>
  )
}
