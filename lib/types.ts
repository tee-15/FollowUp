// lib/types.ts
// Core TypeScript types for the FollowUp CRM application

export type Status = 'New' | 'Contacted' | 'Interested' | 'Negotiation' | 'Won' | 'Lost'

export type Source = 'WhatsApp' | 'Instagram' | 'Facebook' | 'Referral' | 'Other'

export type ActivityType = 'created' | 'updated' | 'note' | 'followup' | 'message'

export interface Profile {
  id: string
  name: string
  business_name: string
  push_subscription: PushSubscriptionJSON | null
  created_at: string
}

export interface Lead {
  id: string
  user_id: string
  full_name: string
  phone: string
  email: string | null
  source: Source
  status: Status
  created_at: string
  updated_at: string
}

export interface FollowUp {
  id: string
  lead_id: string
  user_id: string
  due_date: string       // 'YYYY-MM-DD'
  completed: boolean
  created_at: string
}

export interface Note {
  id: string
  lead_id: string
  user_id: string
  content: string
  created_at: string
}

export interface Activity {
  id: string
  lead_id: string
  user_id: string
  type: ActivityType
  description: string
  created_at: string
}

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; fields?: Record<string, string> }
