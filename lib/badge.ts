// lib/badge.ts
// Pure utility for computing the notification badge count

import type { FollowUp } from './types'

/**
 * Computes the number of incomplete follow-ups that are due today or overdue.
 *
 * @param followUps - The full list of follow-up records to evaluate
 * @param today     - The reference calendar date in 'YYYY-MM-DD' format
 * @returns The count of records where `completed === false` AND `due_date <= today`
 */
export function computeBadgeCount(followUps: FollowUp[], today: string): number {
  return followUps.filter(
    (f) => !f.completed && f.due_date <= today
  ).length
}
