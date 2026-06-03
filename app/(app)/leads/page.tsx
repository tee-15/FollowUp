// app/leads/page.tsx
// React Server Component — Leads List page.
// Fetches all of the authenticated user's leads sorted by created_at DESC,
// enriches each lead with the earliest incomplete follow-up due date, and
// delegates rendering (including client-side status filtering) to LeadsListClient.
//
// Requirements: 3.4, 3.5

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import LeadsListClient, { LeadWithNextFollowUp } from '@/components/LeadsListClient'
import type { Lead } from '@/lib/types'

export const metadata = {
  title: 'Leads | FollowUp CRM',
}

export default async function LeadsPage() {
  const supabase = createServerClient()

  // Verify authenticated session — middleware handles the redirect, but we
  // guard here defensively as well.
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  // Fetch all leads sorted by created_at DESC (Req 3.4).
  // RLS ensures only this user's records are returned (Req 10.1).
  const { data: leads, error: leadsError } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })

  if (leadsError) {
    // Render an error state rather than crashing.
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-6">
        <div className="mx-auto max-w-2xl">
          <p className="text-sm text-red-600">
            Failed to load leads: {leadsError.message}
          </p>
        </div>
      </main>
    )
  }

  // Fetch the earliest incomplete follow-up due date for each lead in one
  // query, then join in memory — avoids N+1 queries.
  // Returns rows: { lead_id: string, due_date: string }
  const { data: followUps, error: followUpsError } = await supabase
    .from('follow_ups')
    .select('lead_id, due_date')
    .eq('completed', false)
    .order('due_date', { ascending: true })

  // Build a lookup map: lead_id → earliest incomplete due_date
  const nextFollowUpMap = new Map<string, string>()

  if (!followUpsError && followUps) {
    for (const fu of followUps) {
      // Because the query is ordered ASC by due_date, the first entry per
      // lead is already the earliest — only set if not yet present.
      if (!nextFollowUpMap.has(fu.lead_id)) {
        nextFollowUpMap.set(fu.lead_id, fu.due_date)
      }
    }
  }

  // Enrich each lead with its next follow-up date.
  const leadsWithNextFollowUp: LeadWithNextFollowUp[] = (leads as Lead[]).map(
    (lead) => ({
      ...lead,
      next_follow_up_date: nextFollowUpMap.get(lead.id) ?? null,
    })
  )

  return (
    <div className="h-full px-4 py-8 lg:px-8 max-w-5xl mx-auto">
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Leads</h1>
        <Link
          href="/leads/new"
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/30 transition-all hover:scale-[1.02] hover:shadow-blue-500/50 focus:outline-none"
        >
          + Add Lead
        </Link>
      </div>

      {/* Client component handles status filter + card rendering (Req 3.5) */}
      <LeadsListClient leads={leadsWithNextFollowUp} />
    </div>
  )
}
