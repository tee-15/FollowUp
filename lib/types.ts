// lib/types.ts
// Core TypeScript types for FollowUp AI

export type ReminderSource = 'WhatsApp' | 'Instagram' | 'Voice' | 'Manual' | 'Screenshot'
export type ReminderStatus = 'pending' | 'completed' | 'snoozed'

export interface Profile {
  id: string
  name: string
  business_name: string
  push_subscription: PushSubscriptionJSON | null
  created_at: string
}

export interface Reminder {
  id: string
  user_id: string
  customer_name: string
  phone: string | null
  topic: string
  summary: string | null
  source: ReminderSource
  status: ReminderStatus
  due_date: string // 'YYYY-MM-DD'
  notes: string | null
  created_at: string
  updated_at: string
}

export interface AIExtractResult {
  customer_name: string
  phone: string | null
  topic: string
  summary: string
  suggested_due_date: string // 'YYYY-MM-DD'
  source: ReminderSource
}

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; fields?: Record<string, string> }
