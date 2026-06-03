'use client'

// components/LeadsListClient.tsx

import Link from 'next/link'
import { useState } from 'react'
import type { Lead, Status } from '@/lib/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LeadWithNextFollowUp extends Lead {
  next_follow_up_date: string | null
}

type FilterValue = 'All' | Status

const STATUS_FILTERS: FilterValue[] = [
  'All',
  'New',
  'Contacted',
  'Interested',
  'Negotiation',
  'Won',
  'Lost',
]

// ---------------------------------------------------------------------------
// Status badge colour map
// ---------------------------------------------------------------------------

const STATUS_THEMES: Record<Status, string> = {
  New: 'bg-blue-100 text-blue-800 ring-blue-500/20',
  Contacted: 'bg-yellow-100 text-yellow-800 ring-yellow-500/20',
  Interested: 'bg-purple-100 text-purple-800 ring-purple-500/20',
  Negotiation: 'bg-orange-100 text-orange-800 ring-orange-500/20',
  Won: 'bg-green-100 text-green-800 ring-green-500/20',
  Lost: 'bg-red-100 text-red-800 ring-red-500/20',
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ring-1 ring-inset ${STATUS_THEMES[status]}`}
    >
      {status}
    </span>
  )
}

// ---------------------------------------------------------------------------
// LeadsListClient
// ---------------------------------------------------------------------------

interface LeadsListClientProps {
  leads: LeadWithNextFollowUp[]
}

export default function LeadsListClient({ leads }: LeadsListClientProps) {
  const [activeFilter, setActiveFilter] = useState<FilterValue>('All')

  const filteredLeads =
    activeFilter === 'All'
      ? leads
      : leads.filter((lead) => lead.status === activeFilter)

  return (
    <div className="flex flex-col gap-6">
      {/* ------------------------------------------------------------------ */}
      {/* Status filter bar                                                   */}
      {/* ------------------------------------------------------------------ */}
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Filter leads by status"
      >
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            aria-pressed={activeFilter === filter}
            className={`min-h-[40px] rounded-full px-5 py-2 text-sm font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 ${
              activeFilter === filter
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-gray-100/50 text-gray-600 hover:bg-gray-200 border border-transparent'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Lead cards                                                          */}
      {/* ------------------------------------------------------------------ */}
      {filteredLeads.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-12 text-center">
          <p className="text-gray-500 font-medium">
            {activeFilter === 'All'
              ? 'No leads yet. Add your first lead to get started.'
              : `No leads found with status "${activeFilter}".`}
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4" role="list" aria-label="Leads">
          {filteredLeads.map((lead) => (
            <li key={lead.id}>
              <Link
                href={`/leads/${lead.id}`}
                className="group flex flex-col h-full rounded-2xl border border-gray-200/60 bg-white/70 backdrop-blur-sm p-5 shadow-sm hover:shadow-md hover:bg-white hover:border-blue-200 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <span className="block text-lg font-black text-gray-900 leading-tight group-hover:text-blue-600 transition-colors truncate">
                      {lead.full_name}
                    </span>
                    <div className="mt-1.5 flex items-center gap-2 text-sm text-gray-500">
                      <span>{lead.phone}</span>
                      <span className="w-1 h-1 rounded-full bg-gray-300" aria-hidden="true" />
                      <span>{lead.source}</span>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <StatusBadge status={lead.status} />
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs">
                  {lead.next_follow_up_date ? (
                    <span className="flex items-center gap-1.5 font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded-md">
                      <span>📅</span> Next follow-up: {lead.next_follow_up_date}
                    </span>
                  ) : (
                    <span className="text-gray-400 font-medium">No upcoming follow-up</span>
                  )}
                  <span className="text-blue-600 font-bold opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
                    View →
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
