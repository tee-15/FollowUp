import { describe, it, expect } from 'vitest'
import { groupLeadsByStatus, PIPELINE_STATUSES } from '@/lib/pipeline'
import type { Lead, Status } from '@/lib/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeLead(id: string, status: Status): Lead {
  return {
    id,
    user_id: 'user-1',
    full_name: 'Test Lead',
    phone: '1234567890',
    email: null,
    source: 'Other',
    status,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }
}

// ---------------------------------------------------------------------------
// Unit tests
// ---------------------------------------------------------------------------

describe('groupLeadsByStatus', () => {
  it('always returns all six status keys, even when the array is empty', () => {
    const result = groupLeadsByStatus([])
    expect(Object.keys(result)).toHaveLength(6)
    for (const status of PIPELINE_STATUSES) {
      expect(result).toHaveProperty(status)
      expect(result[status]).toEqual([])
    }
  })

  it('places a single lead in the correct bucket', () => {
    const lead = makeLead('a', 'New')
    const result = groupLeadsByStatus([lead])
    expect(result['New']).toHaveLength(1)
    expect(result['New'][0]).toBe(lead)
    // All other buckets remain empty
    for (const status of PIPELINE_STATUSES.filter((s) => s !== 'New')) {
      expect(result[status]).toHaveLength(0)
    }
  })

  it('distributes multiple leads with the same status into one bucket', () => {
    const leads = [makeLead('1', 'Interested'), makeLead('2', 'Interested'), makeLead('3', 'Interested')]
    const result = groupLeadsByStatus(leads)
    expect(result['Interested']).toHaveLength(3)
  })

  it('distributes leads across all six statuses correctly', () => {
    const leads: Lead[] = PIPELINE_STATUSES.map((s, i) => makeLead(String(i), s))
    const result = groupLeadsByStatus(leads)
    for (const status of PIPELINE_STATUSES) {
      expect(result[status]).toHaveLength(1)
      expect(result[status][0].status).toBe(status)
    }
  })

  it('total lead count across all buckets equals the input length', () => {
    const leads: Lead[] = [
      makeLead('1', 'New'),
      makeLead('2', 'New'),
      makeLead('3', 'Won'),
      makeLead('4', 'Lost'),
      makeLead('5', 'Contacted'),
    ]
    const result = groupLeadsByStatus(leads)
    const total = PIPELINE_STATUSES.reduce((sum, s) => sum + result[s].length, 0)
    expect(total).toBe(leads.length)
  })

  it('preserves the original lead objects (reference equality)', () => {
    const lead = makeLead('ref-1', 'Negotiation')
    const result = groupLeadsByStatus([lead])
    expect(result['Negotiation'][0]).toBe(lead)
  })

  it('PIPELINE_STATUSES has exactly six entries in the correct order', () => {
    expect(PIPELINE_STATUSES).toEqual(['New', 'Contacted', 'Interested', 'Negotiation', 'Won', 'Lost'])
  })
})
