// lib/pipeline.ts
// Pure utility for grouping leads into Kanban pipeline status buckets.

import type { Lead, Status } from './types'

/** The six pipeline statuses in their fixed left-to-right display order. */
export const PIPELINE_STATUSES: Status[] = [
  'New',
  'Contacted',
  'Interested',
  'Negotiation',
  'Won',
  'Lost',
]

/**
 * Partition a flat array of leads into a record keyed by each of the six
 * pipeline statuses. Every key is always present in the returned object —
 * even when the corresponding bucket is empty — so consumers can safely
 * iterate `PIPELINE_STATUSES` without checking for key existence.
 *
 * @param leads - The full list of leads to group
 * @returns A `Record<Status, Lead[]>` with all six status keys populated
 *
 * Requirements: 6.1, 6.3
 */
export function groupLeadsByStatus(leads: Lead[]): Record<Status, Lead[]> {
  // Initialise all six buckets so every key is always present
  const groups: Record<Status, Lead[]> = {
    New: [],
    Contacted: [],
    Interested: [],
    Negotiation: [],
    Won: [],
    Lost: [],
  }

  for (const lead of leads) {
    groups[lead.status].push(lead)
  }

  return groups
}
