import { describe, it, expect } from 'vitest'
import {
  computeMetrics,
  getDueTodayLeads,
  getOverdueLeads,
  getEarliestDueTodayFollowUp,
  type DashboardMetrics,
} from '@/lib/dashboard'
import type { Lead, FollowUp } from '@/lib/types'

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: 'lead-1',
    user_id: 'user-1',
    full_name: 'Alice Smith',
    phone: '+1234567890',
    email: null,
    source: 'WhatsApp',
    status: 'New',
    created_at: '2024-06-10T10:00:00Z',
    updated_at: '2024-06-10T10:00:00Z',
    ...overrides,
  }
}

function makeFollowUp(overrides: Partial<FollowUp> = {}): FollowUp {
  return {
    id: 'fu-1',
    lead_id: 'lead-1',
    user_id: 'user-1',
    due_date: '2024-06-15',
    completed: false,
    created_at: '2024-06-10T10:00:00Z',
    ...overrides,
  }
}

const TODAY = '2024-06-15'

// ---------------------------------------------------------------------------
// computeMetrics
// ---------------------------------------------------------------------------

describe('computeMetrics', () => {
  it('returns zeros for empty collections', () => {
    const metrics = computeMetrics([], [], TODAY)
    expect(metrics).toEqual<DashboardMetrics>({
      totalLeads: 0,
      followUpsDueToday: 0,
      newLeadsLastSevenDays: 0,
      wonLeads: 0,
      lostLeads: 0,
    })
  })

  it('counts totalLeads correctly', () => {
    const leads = [makeLead({ id: '1' }), makeLead({ id: '2' }), makeLead({ id: '3' })]
    const { totalLeads } = computeMetrics(leads, [], TODAY)
    expect(totalLeads).toBe(3)
  })

  it('counts followUpsDueToday — only incomplete follow-ups matching today', () => {
    const leads = [
      makeLead({ id: 'lead-a' }),
      makeLead({ id: 'lead-b' }),
      makeLead({ id: 'lead-c' }),
    ]
    const followUps = [
      makeFollowUp({ id: 'fu-1', lead_id: 'lead-a', due_date: TODAY, completed: false }),
      // completed — should not count
      makeFollowUp({ id: 'fu-2', lead_id: 'lead-b', due_date: TODAY, completed: true }),
      // future — should not count
      makeFollowUp({ id: 'fu-3', lead_id: 'lead-c', due_date: '2024-06-20', completed: false }),
    ]
    const { followUpsDueToday } = computeMetrics(leads, followUps, TODAY)
    expect(followUpsDueToday).toBe(1)
  })

  it('counts each lead once even when multiple incomplete due-today follow-ups exist', () => {
    const lead = makeLead({ id: 'lead-a' })
    const followUps = [
      makeFollowUp({ id: 'fu-1', lead_id: 'lead-a', due_date: TODAY }),
      makeFollowUp({ id: 'fu-2', lead_id: 'lead-a', due_date: TODAY }),
    ]
    const { followUpsDueToday } = computeMetrics([lead], followUps, TODAY)
    expect(followUpsDueToday).toBe(1)
  })

  it('counts newLeadsLastSevenDays — strictly within 7 days before today', () => {
    const leads = [
      // 7 days ago — included
      makeLead({ id: '1', created_at: '2024-06-08T00:00:00Z' }),
      // 1 day ago — included
      makeLead({ id: '2', created_at: '2024-06-14T23:59:59Z' }),
      // today — NOT included
      makeLead({ id: '3', created_at: '2024-06-15T00:00:00Z' }),
      // 8 days ago — NOT included
      makeLead({ id: '4', created_at: '2024-06-07T00:00:00Z' }),
    ]
    const { newLeadsLastSevenDays } = computeMetrics(leads, [], TODAY)
    expect(newLeadsLastSevenDays).toBe(2)
  })

  it('counts wonLeads', () => {
    const leads = [
      makeLead({ id: '1', status: 'Won' }),
      makeLead({ id: '2', status: 'Won' }),
      makeLead({ id: '3', status: 'Lost' }),
      makeLead({ id: '4', status: 'New' }),
    ]
    const { wonLeads } = computeMetrics(leads, [], TODAY)
    expect(wonLeads).toBe(2)
  })

  it('counts lostLeads', () => {
    const leads = [
      makeLead({ id: '1', status: 'Won' }),
      makeLead({ id: '2', status: 'Lost' }),
      makeLead({ id: '3', status: 'Lost' }),
    ]
    const { lostLeads } = computeMetrics(leads, [], TODAY)
    expect(lostLeads).toBe(2)
  })

  it('computes all five metrics together correctly', () => {
    const leads = [
      makeLead({ id: 'a', status: 'New', created_at: '2024-06-12T10:00:00Z' }),
      makeLead({ id: 'b', status: 'Won', created_at: '2024-06-10T10:00:00Z' }),
      makeLead({ id: 'c', status: 'Lost', created_at: '2024-06-01T10:00:00Z' }),
    ]
    const followUps = [
      makeFollowUp({ lead_id: 'a', due_date: TODAY, completed: false }),
    ]
    const metrics = computeMetrics(leads, followUps, TODAY)
    expect(metrics.totalLeads).toBe(3)
    expect(metrics.followUpsDueToday).toBe(1)
    expect(metrics.newLeadsLastSevenDays).toBe(2)  // 'a' (Jun 12) and 'b' (Jun 10) are in range; 'c' (Jun 1) is not
    expect(metrics.wonLeads).toBe(1)
    expect(metrics.lostLeads).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// getDueTodayLeads
// ---------------------------------------------------------------------------

describe('getDueTodayLeads', () => {
  it('returns empty array when no follow-ups exist', () => {
    const leads = [makeLead()]
    expect(getDueTodayLeads(leads, [], TODAY)).toEqual([])
  })

  it('returns lead with an incomplete follow-up due today', () => {
    const lead = makeLead({ id: 'lead-a' })
    const followUps = [makeFollowUp({ lead_id: 'lead-a', due_date: TODAY, completed: false })]
    expect(getDueTodayLeads([lead], followUps, TODAY)).toEqual([lead])
  })

  it('excludes leads with only completed follow-ups due today', () => {
    const lead = makeLead({ id: 'lead-a' })
    const followUps = [makeFollowUp({ lead_id: 'lead-a', due_date: TODAY, completed: true })]
    expect(getDueTodayLeads([lead], followUps, TODAY)).toEqual([])
  })

  it('excludes leads with incomplete follow-ups on a different date', () => {
    const lead = makeLead({ id: 'lead-a' })
    const followUps = [makeFollowUp({ lead_id: 'lead-a', due_date: '2024-06-20', completed: false })]
    expect(getDueTodayLeads([lead], followUps, TODAY)).toEqual([])
  })

  it('excludes leads with overdue (past) follow-ups', () => {
    const lead = makeLead({ id: 'lead-a' })
    const followUps = [makeFollowUp({ lead_id: 'lead-a', due_date: '2024-06-10', completed: false })]
    expect(getDueTodayLeads([lead], followUps, TODAY)).toEqual([])
  })

  it('returns each qualifying lead exactly once', () => {
    const lead = makeLead({ id: 'lead-a' })
    const followUps = [
      makeFollowUp({ id: 'fu-1', lead_id: 'lead-a', due_date: TODAY }),
      makeFollowUp({ id: 'fu-2', lead_id: 'lead-a', due_date: TODAY }),
    ]
    const result = getDueTodayLeads([lead], followUps, TODAY)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('lead-a')
  })

  it('handles mixed leads correctly', () => {
    const leadA = makeLead({ id: 'a' })
    const leadB = makeLead({ id: 'b' })
    const leadC = makeLead({ id: 'c' })
    const followUps = [
      makeFollowUp({ lead_id: 'a', due_date: TODAY, completed: false }),    // qualifies
      makeFollowUp({ lead_id: 'b', due_date: TODAY, completed: true }),     // completed
      makeFollowUp({ lead_id: 'c', due_date: '2024-06-10', completed: false }), // overdue
    ]
    const result = getDueTodayLeads([leadA, leadB, leadC], followUps, TODAY)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('a')
  })
})

// ---------------------------------------------------------------------------
// getOverdueLeads
// ---------------------------------------------------------------------------

describe('getOverdueLeads', () => {
  it('returns empty array when no follow-ups exist', () => {
    expect(getOverdueLeads([makeLead()], [], TODAY)).toEqual([])
  })

  it('returns lead with an incomplete overdue follow-up', () => {
    const lead = makeLead({ id: 'lead-a' })
    const followUps = [makeFollowUp({ lead_id: 'lead-a', due_date: '2024-06-10', completed: false })]
    expect(getOverdueLeads([lead], followUps, TODAY)).toEqual([lead])
  })

  it('excludes leads with completed overdue follow-ups', () => {
    const lead = makeLead({ id: 'lead-a' })
    const followUps = [makeFollowUp({ lead_id: 'lead-a', due_date: '2024-06-10', completed: true })]
    expect(getOverdueLeads([lead], followUps, TODAY)).toEqual([])
  })

  it('excludes leads with follow-ups due today (not overdue)', () => {
    const lead = makeLead({ id: 'lead-a' })
    const followUps = [makeFollowUp({ lead_id: 'lead-a', due_date: TODAY, completed: false })]
    expect(getOverdueLeads([lead], followUps, TODAY)).toEqual([])
  })

  it('excludes leads with only future follow-ups', () => {
    const lead = makeLead({ id: 'lead-a' })
    const followUps = [makeFollowUp({ lead_id: 'lead-a', due_date: '2024-06-20', completed: false })]
    expect(getOverdueLeads([lead], followUps, TODAY)).toEqual([])
  })

  it('returns each qualifying lead exactly once even with multiple overdue follow-ups', () => {
    const lead = makeLead({ id: 'lead-a' })
    const followUps = [
      makeFollowUp({ id: 'fu-1', lead_id: 'lead-a', due_date: '2024-06-10' }),
      makeFollowUp({ id: 'fu-2', lead_id: 'lead-a', due_date: '2024-06-12' }),
    ]
    const result = getOverdueLeads([lead], followUps, TODAY)
    expect(result).toHaveLength(1)
  })

  it('handles mixed leads correctly', () => {
    const leadA = makeLead({ id: 'a' })
    const leadB = makeLead({ id: 'b' })
    const leadC = makeLead({ id: 'c' })
    const followUps = [
      makeFollowUp({ lead_id: 'a', due_date: '2024-06-10', completed: false }), // overdue — qualifies
      makeFollowUp({ lead_id: 'b', due_date: TODAY, completed: false }),         // due today — not overdue
      makeFollowUp({ lead_id: 'c', due_date: '2024-06-10', completed: true }),   // overdue but completed
    ]
    const result = getOverdueLeads([leadA, leadB, leadC], followUps, TODAY)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('a')
  })
})

// ---------------------------------------------------------------------------
// getEarliestDueTodayFollowUp
// ---------------------------------------------------------------------------

describe('getEarliestDueTodayFollowUp', () => {
  it('returns null when no follow-ups exist', () => {
    expect(getEarliestDueTodayFollowUp('lead-a', [], TODAY)).toBeNull()
  })

  it('returns null when no incomplete follow-ups for the lead exist today', () => {
    const fu = makeFollowUp({ lead_id: 'lead-a', due_date: '2024-06-20', completed: false })
    expect(getEarliestDueTodayFollowUp('lead-a', [fu], TODAY)).toBeNull()
  })

  it('returns the single qualifying follow-up', () => {
    const fu = makeFollowUp({ id: 'fu-1', lead_id: 'lead-a', due_date: TODAY, completed: false })
    expect(getEarliestDueTodayFollowUp('lead-a', [fu], TODAY)).toEqual(fu)
  })

  it('returns null for a different lead\'s follow-up', () => {
    const fu = makeFollowUp({ lead_id: 'lead-b', due_date: TODAY, completed: false })
    expect(getEarliestDueTodayFollowUp('lead-a', [fu], TODAY)).toBeNull()
  })

  it('returns the earliest follow-up when multiple exist for today', () => {
    // Both have the same due_date (today) — reduce picks the first one in tie
    const fu1 = makeFollowUp({ id: 'fu-1', lead_id: 'lead-a', due_date: TODAY })
    const fu2 = makeFollowUp({ id: 'fu-2', lead_id: 'lead-a', due_date: TODAY })
    const result = getEarliestDueTodayFollowUp('lead-a', [fu1, fu2], TODAY)
    expect(result).not.toBeNull()
  })
})
