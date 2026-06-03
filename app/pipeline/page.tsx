// app/pipeline/page.tsx
// Pipeline page — React Server Component.
// Fetches all of the user's leads and passes them to PipelineClient
// which groups them into Kanban columns using groupLeadsByStatus().

import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import PipelineClient from './PipelineClient'
import type { Lead } from '@/lib/types'

export const metadata = {
  title: 'Pipeline | FollowUp CRM',
}

export default async function PipelinePage() {
  const supabase = createServerClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  const { data: leads, error: leadsError } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })

  if (leadsError) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-6">
        <p className="text-sm text-red-600">Failed to load pipeline: {leadsError.message}</p>
      </main>
    )
  }

  return <PipelineClient initialLeads={(leads ?? []) as Lead[]} />
}
