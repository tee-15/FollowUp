// lib/__tests__/badge.test.ts
// Unit tests for computeBadgeCount

import { describe, it, expect } from 'vitest'
import { computeBadgeCount } from '../badge'
import type { FollowUp } from '../types'

const makeFollowUp = (overrides: Partial<FollowUp> = {}): FollowUp => ({
  id: 'test-id',
  lead_id: 'lead-id',
  user_id: 'user-id',
  due_date: '2024-01-15',
  completed: false,
  created_at: '2024-01-01T00:00:00Z',
  ...overrides,
})

describe('computeBadgeCount', () => {
  it('returns 0 for an empty list', () => {
    expect(computeBadgeCount([], '2024-01-15')).toBe(0)
  })

  it('counts follow-up due exactly today', () => {
    const followUps = [makeFollowUp({ due_date: '2024-01-15', completed: false })]
    expect(computeBadgeCount(followUps, '2024-01-15')).toBe(1)
  })

  it('counts overdue follow-up (due_date before today)', () => {
    const followUps = [makeFollowUp({ due_date: '2024-01-10', completed: false })]
    expect(computeBadgeCount(followUps, '2024-01-15')).toBe(1)
  })

  it('excludes follow-up due in the future', () => {
    const followUps = [makeFollowUp({ due_date: '2024-01-20', completed: false })]
    expect(computeBadgeCount(followUps, '2024-01-15')).toBe(0)
  })

  it('excludes completed follow-ups even if due today or overdue', () => {
    const followUps = [
      makeFollowUp({ due_date: '2024-01-15', completed: true }),
      makeFollowUp({ due_date: '2024-01-10', completed: true }),
    ]
    expect(computeBadgeCount(followUps, '2024-01-15')).toBe(0)
  })

  it('counts only incomplete follow-ups due today or overdue in a mixed list', () => {
    const followUps = [
      makeFollowUp({ id: '1', due_date: '2024-01-10', completed: false }),  // overdue - counts
      makeFollowUp({ id: '2', due_date: '2024-01-15', completed: false }),  // today - counts
      makeFollowUp({ id: '3', due_date: '2024-01-20', completed: false }),  // future - excluded
      makeFollowUp({ id: '4', due_date: '2024-01-10', completed: true }),   // completed - excluded
      makeFollowUp({ id: '5', due_date: '2024-01-15', completed: true }),   // completed today - excluded
    ]
    expect(computeBadgeCount(followUps, '2024-01-15')).toBe(2)
  })

  it('returns 0 when all follow-ups are in the future', () => {
    const followUps = [
      makeFollowUp({ id: '1', due_date: '2024-01-16', completed: false }),
      makeFollowUp({ id: '2', due_date: '2024-02-01', completed: false }),
    ]
    expect(computeBadgeCount(followUps, '2024-01-15')).toBe(0)
  })

  it('counts all when all follow-ups are overdue and incomplete', () => {
    const followUps = [
      makeFollowUp({ id: '1', due_date: '2024-01-01', completed: false }),
      makeFollowUp({ id: '2', due_date: '2024-01-05', completed: false }),
      makeFollowUp({ id: '3', due_date: '2024-01-10', completed: false }),
    ]
    expect(computeBadgeCount(followUps, '2024-01-15')).toBe(3)
  })
})
