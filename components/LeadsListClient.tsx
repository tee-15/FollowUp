'use client'

// components/LeadsListClient.tsx
// Client component for the Leads List page.
// Receives leads and their next incomplete follow-up due dates as props,
// renders a status filter bar, and filters leads client-side without a page reload.
//
// Requirements: 3.4, 3.5

import Link from 'next/link'
import { useState } from 'react'
import type { Lead, Status } from '@/lib/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LeadWithNextFollowUp extends Lead {
  /** The earliest incomplete follow-up due date for this lead ('YYYY-MM-DD'), or null if none. */
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

const STATUS_BADGE_CLASSES: Record<Status, string> = {
  New: 'bg-blue-100 text-blue-800',
  Contacted: 'bg-yellow-100 text-yellow-800',
  Interested: 'bg-purple-100 text-purple-800',
  Negotiation: 'bg-orange-100 text-orange-800',
  Won: 'bg-green-100 text-green-800',
  Lost: 'bg-red-100 text-red-800',
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASSES[status]}`}
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
    <div className="flex flex-col gap-4">
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
            className={`min-h-[44px] min-w-[44px] rounded-full px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 ${
              activeFilter === filter
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
          <p className="text-sm text-gray-500">
            {activeFilter === 'All'
              ? 'No leads yet. Add your first lead to get started.'
              : `No leads with status "${activeFilter}".`}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3" role="list" aria-label="Leads">
          {filteredLeads.map((lead) => (
            <li key={lead.id}>
              <Link
                href={`/leads/${lead.id}`}
                className="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                {/* Top row: name + status badge */}
                <div className="flex items-start justify-between gap-2">
                  <span className="text-base font-semibold text-gray-900 leading-tight">
                    {lead.full_name}
                  </span>
                  <StatusBadge status={lead.status} />
                </div>

                {/* Middle row: phone + source */}
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600">
                  <span>{lead.phone}</span>
                  <span className="text-gray-400" aria-hidden="true">·</span>
                  <span>{lead.source}</span>
                </div>

                {/* Bottom row: next follow-up */}
                <div className="mt-2 text-xs text-gray-500">
                  {lead.next_follow_up_date ? (
                    <span>
                      Next follow-up:{' '}
                      <time dateTime={lead.next_follow_up_date} className="font-medium text-gray-700">
                        {lead.next_follow_up_date}
                      </time>
                    </span>
                  ) : (
                    <span className="text-gray-400">No upcoming follow-up</span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
