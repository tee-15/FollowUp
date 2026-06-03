// lib/dashboard.ts
// Pure functions for computing dashboard metrics and filtering follow-up leads.
// All functions accept a caller-supplied `today` string (YYYY-MM-DD) as the
// reference date so they remain fully deterministic and testable.

import type { Lead, FollowUp } from './types'

export interface DashboardMetrics {
  /** Total number of leads owned by the user */
  totalLeads: number
  /** Count of leads with at least one incomplete follow-up due on `today` */
  followUpsDueToday: number
  /** Count of leads created in the 7 calendar days strictly before `today` */
  newLeadsLastSevenDays: number
  /** Count of leads with status "Won" */
  wonLeads: number
  /** Count of leads with status "Lost" */
  lostLeads: number
}

/**
 * Compute the five dashboard metrics from in-memory collections.
 *
 * @param leads     - All leads belonging to the user
 * @param followUps - All follow-up records belonging to the user
 * @param today     - Reference date in YYYY-MM-DD format (user's local calendar date)
 * @returns DashboardMetrics object with all five computed values
 *
 * Requirements: 2.1
 */
export function computeMetrics(
  leads: Lead[],
  followUps: FollowUp[],
  today: string
): DashboardMetrics {
  const totalLeads = leads.length

  // Build a set of lead IDs that have at least one incomplete follow-up due today
  const leadIdsWithDueToday = new Set<string>()
  for (const fu of followUps) {
    if (!fu.completed && fu.due_date === today) {
      leadIdsWithDueToday.add(fu.lead_id)
    }
  }
  const followUpsDueToday = leadIdsWithDueToday.size

  // "New leads last 7 days" = leads created strictly within the 7 calendar days
  // preceding today (i.e. created_at date >= 7-days-ago AND < today).
  const sevenDaysAgo = subtractDays(today, 7)
  let newLeadsLastSevenDays = 0
  for (const lead of leads) {
    // Extract the date portion only (YYYY-MM-DD) from the ISO timestamp
    const createdDate = lead.created_at.slice(0, 10)
    if (createdDate >= sevenDaysAgo && createdDate < today) {
      newLeadsLastSevenDays++
    }
  }

  const wonLeads = leads.filter((l) => l.status === 'Won').length
  const lostLeads = leads.filter((l) => l.status === 'Lost').length

  return {
    totalLeads,
    followUpsDueToday,
    newLeadsLastSevenDays,
    wonLeads,
    lostLeads,
  }
}

/**
 * Filter leads to those with at least one incomplete follow-up due on `today`.
 *
 * @param leads     - All leads belonging to the user
 * @param followUps - All follow-up records belonging to the user
 * @param today     - Reference date in YYYY-MM-DD format
 * @returns Array of Lead objects that have a follow-up due today
 *
 * Requirements: 2.3, 5.6
 */
export function getDueTodayLeads(
  leads: Lead[],
  followUps: FollowUp[],
  today: string
): Lead[] {
  const leadIdsWithDueToday = new Set<string>()
  for (const fu of followUps) {
    if (!fu.completed && fu.due_date === today) {
      leadIdsWithDueToday.add(fu.lead_id)
    }
  }
  return leads.filter((l) => leadIdsWithDueToday.has(l.id))
}

/**
 * Filter leads to those with at least one incomplete follow-up whose due date
 * is strictly before `today` (i.e. overdue follow-ups).
 *
 * @param leads     - All leads belonging to the user
 * @param followUps - All follow-up records belonging to the user
 * @param today     - Reference date in YYYY-MM-DD format
 * @returns Array of Lead objects that have an overdue follow-up
 *
 * Requirements: 2.4, 5.7
 */
export function getOverdueLeads(
  leads: Lead[],
  followUps: FollowUp[],
  today: string
): Lead[] {
  const leadIdsOverdue = new Set<string>()
  for (const fu of followUps) {
    if (!fu.completed && fu.due_date < today) {
      leadIdsOverdue.add(fu.lead_id)
    }
  }
  return leads.filter((l) => leadIdsOverdue.has(l.id))
}

/**
 * Return the earliest (minimum) `due_date` among incomplete follow-ups for a
 * given lead on `today`. Returns `null` if no qualifying follow-up exists.
 * Used by the dashboard to show the "earliest incomplete follow-up time" for
 * each due-today lead (Req 2.3).
 *
 * @param leadId    - The lead's id
 * @param followUps - All follow-up records belonging to the user
 * @param today     - Reference date in YYYY-MM-DD format
 */
export function getEarliestDueTodayFollowUp(
  leadId: string,
  followUps: FollowUp[],
  today: string
): FollowUp | null {
  const candidates = followUps.filter(
    (fu) => fu.lead_id === leadId && !fu.completed && fu.due_date === today
  )
  if (candidates.length === 0) return null
  return candidates.reduce((earliest, fu) =>
    fu.due_date < earliest.due_date ? fu : earliest
  )
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Subtract `days` calendar days from a YYYY-MM-DD date string and return the
 * resulting YYYY-MM-DD string. Pure — no side effects, no `new Date()` calls
 * that depend on runtime timezone.
 */
function subtractDays(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  // Use UTC midnight to avoid DST shifts
  const d = new Date(Date.UTC(year, month - 1, day))
  d.setUTCDate(d.getUTCDate() - days)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}
