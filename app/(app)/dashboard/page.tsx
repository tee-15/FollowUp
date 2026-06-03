// app/(app)/dashboard/page.tsx
// Dashboard page — React Server Component.
// Premium redesign with glassmorphism and modern empty states.

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
  gradient,
  icon,
}: {
  label: string
  value: number
  gradient: string
  icon: string
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-6 shadow-sm border border-white/20 transition-transform hover:scale-[1.02] hover:shadow-md`}>
      <div className="absolute -right-4 -top-4 opacity-10 text-7xl select-none">
        {icon}
      </div>
      <p className="text-sm font-medium text-gray-700/80 mb-1">{label}</p>
      <p className="text-4xl font-black text-gray-900 tracking-tight">{value}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Lead row sub-component
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<string, string> = {
  New: 'bg-blue-100 text-blue-800 ring-blue-500/20',
  Contacted: 'bg-yellow-100 text-yellow-800 ring-yellow-500/20',
  Interested: 'bg-purple-100 text-purple-800 ring-purple-500/20',
  Negotiation: 'bg-orange-100 text-orange-800 ring-orange-500/20',
  Won: 'bg-green-100 text-green-800 ring-green-500/20',
  Lost: 'bg-red-100 text-red-800 ring-red-500/20',
}

function LeadRow({ lead }: { lead: Lead }) {
  return (
    <li>
      <Link
        href={`/leads/${lead.id}`}
        className="group flex items-center justify-between rounded-xl border border-gray-200/60 bg-white/50 backdrop-blur-sm px-5 py-4 shadow-sm hover:shadow-md hover:bg-white transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">{lead.full_name}</p>
          <p className="text-xs text-gray-500 mt-0.5 truncate">{lead.phone}</p>
        </div>
        <span
          className={`ml-3 shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${STATUS_COLORS[lead.status] ?? 'bg-gray-100 text-gray-700 ring-gray-500/20'}`}
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

  const today = new Date().toISOString().slice(0, 10)

  const metrics = computeMetrics(leads, followUps, today)
  const dueTodayLeads = getDueTodayLeads(leads, followUps, today)
  const overdueLeads = getOverdueLeads(leads, followUps, today)

  // Empty State Layout
  if (leads.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-24 h-24 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto text-4xl shadow-inner">
            👋
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome to FollowUp!</h1>
            <p className="text-gray-500 mt-2">
              You don't have any leads yet. Let's get your pipeline started by adding your first contact.
            </p>
          </div>
          <Link
            href="/leads/new"
            className="inline-flex items-center justify-center min-h-[48px] px-8 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-[1.02] transition-all"
          >
            + Add Your First Lead
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full px-4 py-8 lg:px-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">
          {profile?.name ? `Hi, ${profile.name.split(' ')[0]} 👋` : 'Dashboard'}
        </h1>
        {profile?.business_name && (
          <p className="mt-1 text-gray-500">{profile.business_name}</p>
        )}
      </div>

      {/* Metric cards */}
      <section aria-label="Key metrics">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <MetricCard
            label="Total Leads"
            value={metrics.totalLeads}
            gradient="from-gray-50 to-gray-100"
            icon="👥"
          />
          <MetricCard
            label="Due Today"
            value={metrics.followUpsDueToday}
            gradient={metrics.followUpsDueToday > 0 ? 'from-blue-50 to-indigo-50 border-blue-200' : 'from-gray-50 to-gray-100'}
            icon="📅"
          />
          <MetricCard
            label="New (7 days)"
            value={metrics.newLeadsLastSevenDays}
            gradient="from-purple-50 to-fuchsia-50"
            icon="✨"
          />
          <MetricCard
            label="Won"
            value={metrics.wonLeads}
            gradient={metrics.wonLeads > 0 ? 'from-green-50 to-emerald-50 border-green-200' : 'from-gray-50 to-gray-100'}
            icon="🏆"
          />
        </div>
      </section>

      {/* Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Due today */}
        <section aria-labelledby="due-today-heading">
          <div className="flex items-center justify-between mb-4">
            <h2 id="due-today-heading" className="text-lg font-bold text-gray-900">
              Due Today
            </h2>
            <span className="px-2.5 py-1 rounded-full bg-gray-100 text-xs font-bold text-gray-600">
              {dueTodayLeads.length}
            </span>
          </div>
          {dueTodayLeads.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white/50 p-8 text-center">
              <p className="text-gray-500 font-medium">No follow-ups due today 🎉</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-3" role="list">
              {dueTodayLeads.map((lead) => (
                <LeadRow key={lead.id} lead={lead} />
              ))}
            </ul>
          )}
        </section>

        {/* Overdue */}
        {overdueLeads.length > 0 && (
          <section aria-labelledby="overdue-heading">
            <div className="flex items-center justify-between mb-4">
              <h2 id="overdue-heading" className="text-lg font-bold text-red-600">
                Overdue
              </h2>
              <span className="px-2.5 py-1 rounded-full bg-red-100 text-xs font-bold text-red-700">
                {overdueLeads.length}
              </span>
            </div>
            <ul className="flex flex-col gap-3" role="list">
              {overdueLeads.map((lead) => (
                <LeadRow key={lead.id} lead={lead} />
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  )
}
