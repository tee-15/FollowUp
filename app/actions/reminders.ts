'use server'

// app/actions/reminders.ts
// Server actions for all Reminder CRUD operations

import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { ActionResult, Reminder } from '@/lib/types'

// ---------------------------------------------------------------------------
// createReminder
// ---------------------------------------------------------------------------
export async function createReminder(data: {
  customer_name: string
  phone?: string | null
  topic: string
  summary?: string | null
  source: string
  due_date: string
  notes?: string | null
}): Promise<ActionResult<Reminder>> {
  const supabase = createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  if (!data.customer_name?.trim()) return { success: false, error: 'Customer name is required', fields: { customer_name: 'Required' } }
  if (!data.topic?.trim()) return { success: false, error: 'Topic is required', fields: { topic: 'Required' } }
  if (!data.due_date) return { success: false, error: 'Due date is required', fields: { due_date: 'Required' } }

  const { data: reminder, error } = await supabase
    .from('reminders')
    .insert({
      user_id: user.id,
      customer_name: data.customer_name.trim(),
      phone: data.phone?.trim() || null,
      topic: data.topic.trim(),
      summary: data.summary?.trim() || null,
      source: data.source || 'Manual',
      due_date: data.due_date,
      notes: data.notes?.trim() || null,
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, data: reminder as Reminder }
}

// ---------------------------------------------------------------------------
// updateReminder
// ---------------------------------------------------------------------------
export async function updateReminder(
  id: string,
  data: Partial<{
    customer_name: string
    phone: string | null
    topic: string
    summary: string | null
    due_date: string
    notes: string | null
    status: string
  }>
): Promise<ActionResult<Reminder>> {
  const supabase = createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  const { data: reminder, error } = await supabase
    .from('reminders')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, data: reminder as Reminder }
}

// ---------------------------------------------------------------------------
// completeReminder
// ---------------------------------------------------------------------------
export async function completeReminder(id: string): Promise<ActionResult<null>> {
  const supabase = createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  const { error } = await supabase
    .from('reminders')
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }
  return { success: true, data: null }
}

// ---------------------------------------------------------------------------
// snoozeReminder
// ---------------------------------------------------------------------------
export async function snoozeReminder(id: string, newDate: string): Promise<ActionResult<null>> {
  const supabase = createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  const { error } = await supabase
    .from('reminders')
    .update({ status: 'pending', due_date: newDate, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }
  return { success: true, data: null }
}

// ---------------------------------------------------------------------------
// deleteReminder
// ---------------------------------------------------------------------------
export async function deleteReminder(id: string): Promise<ActionResult<null>> {
  const supabase = createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  const { error } = await supabase
    .from('reminders')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }
  return { success: true, data: null }
}
