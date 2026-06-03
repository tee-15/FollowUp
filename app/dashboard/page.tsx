// app/dashboard/page.tsx
// Dashboard page — React Server Component.
// Fetches leads and follow-ups, computes metrics via lib/dashboard.ts,
// and renders metric cards plus due-today and overdue lead lists.

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { computeMetrics, getDueTodayLeads, getOverdueLeads } from '@/lib/dashboard'
import type { Lead, FollowUp } from '@/lib/types'

export const metadata = {
  title: 'Dashboard | FollowUp CRM',
}

// ---------------------------------------------------------------------------
// Metric card sub-component
// ---------------------------------------------------------------------------

function MetricCard({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent: string
}) {
  return (
    <div className={`rounded-xl bg-white border p-5 shadow-sm ${accent}`}>
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Lead row sub-component
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<string, string> = {
  New: 'bg-blue-100 text-blue-800',
  Contacted: 'bg-yellow-100 text-yellow-800',
  Interested: 'bg-purple-100 text-purple-800',
  Negotiation: 'bg-orange-100 text-orange-800',
  Won: 'bg-green-100 text-green-800',
  Lost: 'bg-red-100 text-red-800',
}

function LeadRow({ lead }: { lead: Lead }) {
  return (
    <li>
      <Link
        href={`/leads/${lead.id}`}
        className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm hover:shadow-md transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{lead.full_name}</p>
          <p className="text-xs text-gray-500 mt-0.5 truncate">{lead.phone}</p>
        </div>
        <span
          className={`ml-3 shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[lead.status] ?? 'bg-gray-100 text-gray-700'}`}
        >
          {lead.status}
        </span>
      </Link>
    </li>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function DashboardPage() {
  const supabase = createServerClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  // Fetch leads and all incomplete follow-ups in parallel
  const [leadsResult, followUpsResult, profileResult] = await Promise.all([
    supabase.from('leads').select('*').order('created_at', { ascending: false }),
    supabase.from('follow_ups').select('*').eq('completed', false),
    supabase.from('profiles').select('name, business_name').eq('id', user.id).single(),
  ])

  const leads = (leadsResult.data ?? []) as Lead[]
  const followUps = (followUpsResult.data ?? []) as FollowUp[]
  const profile = profileResult.data

  // Today in YYYY-MM-DD (server UTC — acceptable for dashboard; follow-up
  // scheduling uses client-supplied date for timezone precision)
  const today = new Date().toISOString().slice(0, 10)

  const metrics = computeMetrics(leads, followUps, today)
  const dueTodayLeads = getDueTodayLeads(leads, followUps, today)
  const overdueLeads = getOverdueLeads(leads, followUps, today)

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {profile?.name ? `Hi, ${profile.name.split(' ')[0]} 👋` : 'Dashboard'}
          </h1>
          {profile?.business_name && (
            <p className="mt-1 text-sm text-gray-500">{profile.business_name}</p>
          )}
        </div>

        {/* Metric cards */}
        <section aria-label="Key metrics" className="mb-8">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricCard label="Total leads" value={metrics.totalLeads} accent="border-gray-200" />
            <MetricCard
              label="Due today"
              value={metrics.followUpsDueToday}
              accent={metrics.followUpsDueToday > 0 ? 'border-blue-200' : 'border-gray-200'}
            />
            <MetricCard
              label="New (7 days)"
              value={metrics.newLeadsLastSevenDays}
              accent="border-gray-200"
            />
            <MetricCard
              label="Won"
              value={metrics.wonLeads}
              accent={metrics.wonLeads > 0 ? 'border-green-200' : 'border-gray-200'}
            />
          </div>
        </section>

        {/* Due today */}
        <section aria-labelledby="due-today-heading" className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 id="due-today-heading" className="text-base font-semibold text-gray-800">
              Follow-ups due today
            </h2>
            <span className="text-xs text-gray-500">{dueTodayLeads.length} lead{dueTodayLeads.length !== 1 ? 's' : ''}</span>
          </div>
          {dueTodayLeads.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center">
              <p className="text-sm text-gray-400">No follow-ups due today 🎉</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2" role="list">
              {dueTodayLeads.map((lead) => (
                <LeadRow key={lead.id} lead={lead} />
              ))}
            </ul>
          )}
        </section>

        {/* Overdue */}
        {overdueLeads.length > 0 && (
          <section aria-labelledby="overdue-heading" className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 id="overdue-heading" className="text-base font-semibold text-red-700">
                Overdue
              </h2>
              <span className="text-xs text-red-500">{overdueLeads.length} lead{overdueLeads.length !== 1 ? 's' : ''}</span>
            </div>
            <ul className="flex flex-col gap-2" role="list">
              {overdueLeads.map((lead) => (
                <LeadRow key={lead.id} lead={lead} />
              ))}
            </ul>
          </section>
        )}

        {/* Quick actions */}
        <div className="flex gap-3 mt-8">
          <Link
            href="/leads/new"
            className="flex-1 text-center min-h-[48px] flex items-center justify-center rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            + Add Lead
          </Link>
          <Link
            href="/leads"
            className="flex-1 text-center min-h-[48px] flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            All Leads
          </Link>
          <Link
            href="/pipeline"
            className="flex-1 text-center min-h-[48px] flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Pipeline
          </Link>
        </div>
      </div>
    </main>
  )
}
