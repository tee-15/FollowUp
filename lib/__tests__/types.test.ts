import { describe, it, expect } from 'vitest'
import type { Status, Source, ActivityType, Profile, Lead, FollowUp, Note, Activity, ActionResult } from '@/lib/types'

// Smoke tests verifying TypeScript types compile and values satisfy type constraints

describe('Types', () => {
  it('Status values are valid', () => {
    const statuses: Status[] = ['New', 'Contacted', 'Interested', 'Negotiation', 'Won', 'Lost']
    expect(statuses).toHaveLength(6)
  })

  it('Source values are valid', () => {
    const sources: Source[] = ['WhatsApp', 'Instagram', 'Facebook', 'Referral', 'Other']
    expect(sources).toHaveLength(5)
  })

  it('ActivityType values are valid', () => {
    const types: ActivityType[] = ['created', 'updated', 'note', 'followup', 'message']
    expect(types).toHaveLength(5)
  })

  it('ActionResult success shape is correct', () => {
    const result: ActionResult<{ id: string }> = { success: true, data: { id: '123' } }
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.id).toBe('123')
    }
  })

  it('ActionResult failure shape is correct', () => {
    const result: ActionResult<never> = {
      success: false,
      error: 'Something went wrong',
      fields: { name: 'Name is required' },
    }
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('Something went wrong')
      expect(result.fields?.name).toBe('Name is required')
    }
  })

  it('Lead interface has all required fields', () => {
    const lead: Lead = {
      id: 'uuid-1',
      user_id: 'user-uuid',
      full_name: 'John Doe',
      phone: '+1234567890',
      email: null,
      source: 'WhatsApp',
      status: 'New',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    }
    expect(lead.status).toBe('New')
    expect(lead.email).toBeNull()
  })

  it('FollowUp interface has correct due_date as string', () => {
    const followUp: FollowUp = {
      id: 'fu-uuid',
      lead_id: 'lead-uuid',
      user_id: 'user-uuid',
      due_date: '2024-06-15',
      completed: false,
      created_at: '2024-01-01T00:00:00Z',
    }
    expect(followUp.completed).toBe(false)
    expect(followUp.due_date).toBe('2024-06-15')
  })

  it('Note interface enforces content field', () => {
    const note: Note = {
      id: 'note-uuid',
      lead_id: 'lead-uuid',
      user_id: 'user-uuid',
      content: 'Called the client — very interested.',
      created_at: '2024-01-01T00:00:00Z',
    }
    expect(note.content).toBeTruthy()
  })

  it('Activity interface has type and description', () => {
    const activity: Activity = {
      id: 'act-uuid',
      lead_id: 'lead-uuid',
      user_id: 'user-uuid',
      type: 'created',
      description: 'Lead created',
      created_at: '2024-01-01T00:00:00Z',
    }
    expect(activity.type).toBe('created')
    expect(activity.description).toBe('Lead created')
  })
})
