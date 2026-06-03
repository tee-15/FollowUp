'use server'

// app/actions/leads.ts
// Server Actions for lead management: createLead, updateLead, deleteLead,
// updateLeadStatus, and logWhatsAppClick.
//
// Each action:
//   1. Validates inputs server-side.
//   2. Returns ActionResult<T> — a discriminated union of success/failure.
//   3. Inserts the appropriate activity record via the shared `insertActivity` helper.
//
// Requirements: 3.1, 3.2, 3.6, 3.7, 3.8, 7.1, 7.2, 10.5

import { createServerClient } from '@/lib/supabase/server'
import { ActionResult, Activity, ActivityType, Lead, Source, Status } from '@/lib/types'
import { redirect } from 'next/navigation'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALID_SOURCES: Source[] = ['WhatsApp', 'Instagram', 'Facebook', 'Referral', 'Other']
const VALID_STATUSES: Status[] = ['New', 'Contacted', 'Interested', 'Negotiation', 'Won', 'Lost']

// ---------------------------------------------------------------------------
// Shared helper: insertActivity
// ---------------------------------------------------------------------------

/**
 * Inserts a single activity record for the given lead.
 * Returns an error string on failure, or null on success.
 * The supabase client is passed in so it shares the same authenticated session.
 */
async function insertActivity(
  supabase: ReturnType<typeof createServerClient>,
  {
    leadId,
    userId,
    type,
    description,
  }: {
    leadId: string
    userId: string
    type: ActivityType
    description: string
  }
): Promise<string | null> {
  const { error } = await supabase.from('activities').insert({
    lead_id: leadId,
    user_id: userId,
    type,
    description,
  })

  if (error) {
    return error.message
  }
  return null
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

function validateRequiredText(value: string | undefined | null, fieldLabel: string): string | null {
  const trimmed = value?.trim() ?? ''
  if (trimmed.length === 0) return `${fieldLabel} is required`
  return null
}

function validateSource(source: string | undefined | null): string | null {
  if (!source) return 'Source is required'
  if (!VALID_SOURCES.includes(source as Source)) {
    return `Source must be one of: ${VALID_SOURCES.join(', ')}`
  }
  return null
}

function validateStatus(status: string | undefined | null): string | null {
  if (!status) return 'Status is required'
  if (!VALID_STATUSES.includes(status as Status)) {
    return `Status must be one of: ${VALID_STATUSES.join(', ')}`
  }
  return null
}

// ---------------------------------------------------------------------------
// createLead
// ---------------------------------------------------------------------------

/**
 * Creates a new Lead record.
 * - Validates full_name, phone, and source server-side.
 * - Always sets status to "New" regardless of any submitted status value (Req 3.1).
 * - Inserts a "created" activity with description "Lead created" (Req 7.1).
 * - Returns the new Lead on success.
 *
 * Requirements: 3.1, 3.2, 7.1, 10.5
 */
export async function createLead(formData: {
  full_name: string
  phone: string
  email?: string | null
  source: string
}): Promise<ActionResult<Lead>> {
  const fields: Record<string, string> = {}

  const nameError = validateRequiredText(formData.full_name, 'Full name')
  if (nameError) fields.full_name = nameError

  const phoneError = validateRequiredText(formData.phone, 'Phone number')
  if (phoneError) fields.phone = phoneError

  const sourceError = validateSource(formData.source)
  if (sourceError) fields.source = sourceError

  if (Object.keys(fields).length > 0) {
    return {
      success: false,
      error: 'Please correct the highlighted fields',
      fields,
    }
  }

  const supabase = createServerClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      success: false,
      error: 'You must be signed in to create a lead',
    }
  }

  const { data: lead, error: insertError } = await supabase
    .from('leads')
    .insert({
      user_id: user.id,
      full_name: formData.full_name.trim(),
      phone: formData.phone.trim(),
      email: formData.email?.trim() || null,
      source: formData.source as Source,
      // status is always "New" for new leads — Req 3.1
      status: 'New' as Status,
    })
    .select()
    .single()

  if (insertError || !lead) {
    return {
      success: false,
      error: insertError?.message ?? 'Failed to create lead. Please try again.',
    }
  }

  // Log "created" activity — Req 7.1
  const activityError = await insertActivity(supabase, {
    leadId: lead.id,
    userId: user.id,
    type: 'created',
    description: 'Lead created',
  })

  if (activityError) {
    // The lead was created successfully — return success even if activity
    // logging fails, to avoid rolling back the lead creation.
    console.error('Failed to insert activity for createLead:', activityError)
  }

  return {
    success: true,
    data: lead as Lead,
  }
}

// ---------------------------------------------------------------------------
// updateLead
// ---------------------------------------------------------------------------

/**
 * Updates an existing Lead's editable fields.
 * - Validates all provided fields server-side (Req 3.7, 10.5).
 * - Inserts an "updated" activity on success (Req 3.6, 7.2 — general update).
 * - Returns the updated Lead on success.
 *
 * Requirements: 3.6, 3.7, 10.5
 */
export async function updateLead(formData: {
  id: string
  full_name?: string
  phone?: string
  email?: string | null
  source?: string
  status?: string
}): Promise<ActionResult<Lead>> {
  if (!formData.id) {
    return { success: false, error: 'Lead ID is required' }
  }

  const fields: Record<string, string> = {}

  // Validate only the fields that are explicitly being updated
  if (formData.full_name !== undefined) {
    const nameError = validateRequiredText(formData.full_name, 'Full name')
    if (nameError) fields.full_name = nameError
  }

  if (formData.phone !== undefined) {
    const phoneError = validateRequiredText(formData.phone, 'Phone number')
    if (phoneError) fields.phone = phoneError
  }

  if (formData.source !== undefined) {
    const sourceError = validateSource(formData.source)
    if (sourceError) fields.source = sourceError
  }

  if (formData.status !== undefined) {
    const statusError = validateStatus(formData.status)
    if (statusError) fields.status = statusError
  }

  if (Object.keys(fields).length > 0) {
    return {
      success: false,
      error: 'Please correct the highlighted fields',
      fields,
    }
  }

  const supabase = createServerClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      success: false,
      error: 'You must be signed in to update a lead',
    }
  }

  // Build the update payload with only the supplied fields
  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (formData.full_name !== undefined) updatePayload.full_name = formData.full_name.trim()
  if (formData.phone !== undefined) updatePayload.phone = formData.phone.trim()
  if (formData.email !== undefined) updatePayload.email = formData.email?.trim() || null
  if (formData.source !== undefined) updatePayload.source = formData.source as Source
  if (formData.status !== undefined) updatePayload.status = formData.status as Status

  const { data: lead, error: updateError } = await supabase
    .from('leads')
    .update(updatePayload)
    .eq('id', formData.id)
    .eq('user_id', user.id) // RLS enforces this, but explicit for clarity
    .select()
    .single()

  if (updateError || !lead) {
    return {
      success: false,
      error: updateError?.message ?? 'Failed to update lead. Please try again.',
    }
  }

  // Log "updated" activity — Req 3.6, 7.2
  const activityError = await insertActivity(supabase, {
    leadId: lead.id,
    userId: user.id,
    type: 'updated',
    description: 'Lead updated',
  })

  if (activityError) {
    console.error('Failed to insert activity for updateLead:', activityError)
  }

  return {
    success: true,
    data: lead as Lead,
  }
}

// ---------------------------------------------------------------------------
// deleteLead
// ---------------------------------------------------------------------------

/**
 * Permanently deletes a Lead record and all associated records.
 * - Cascade deletion of follow_ups, notes, and activities is handled by DB
 *   foreign key constraints (`ON DELETE CASCADE`) — Req 3.8.
 * - Redirects to `/leads` after successful deletion.
 *
 * Requirements: 3.8
 */
export async function deleteLead(params: { id: string }): Promise<ActionResult<null>> {
  if (!params.id) {
    return { success: false, error: 'Lead ID is required' }
  }

  const supabase = createServerClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      success: false,
      error: 'You must be signed in to delete a lead',
    }
  }

  const { error: deleteError } = await supabase
    .from('leads')
    .delete()
    .eq('id', params.id)
    .eq('user_id', user.id) // RLS enforces this, but explicit for clarity

  if (deleteError) {
    return {
      success: false,
      error: deleteError.message,
    }
  }

  // Redirect to the leads list after deletion — Req 3.8
  redirect('/leads')
}

// ---------------------------------------------------------------------------
// updateLeadStatus
// ---------------------------------------------------------------------------

/**
 * Updates a Lead's status field.
 * - Fetches the current status before updating so the activity description
 *   can include the previous and new status values (Req 7.2).
 * - Inserts an "updated" activity with description
 *   "Status changed from {previous_status} to {new_status}" (Req 7.2).
 *
 * Requirements: 3.6, 3.7, 7.2, 10.5
 */
export async function updateLeadStatus(params: {
  id: string
  newStatus: Status
}): Promise<ActionResult<Lead>> {
  if (!params.id) {
    return { success: false, error: 'Lead ID is required' }
  }

  const statusError = validateStatus(params.newStatus)
  if (statusError) {
    return { success: false, error: statusError }
  }

  const supabase = createServerClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      success: false,
      error: 'You must be signed in to update a lead',
    }
  }

  // Fetch the current lead to capture the previous status for the activity log
  const { data: existingLead, error: fetchError } = await supabase
    .from('leads')
    .select('status')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !existingLead) {
    return {
      success: false,
      error: fetchError?.message ?? 'Lead not found',
    }
  }

  const previousStatus = existingLead.status as Status

  const { data: lead, error: updateError } = await supabase
    .from('leads')
    .update({
      status: params.newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (updateError || !lead) {
    return {
      success: false,
      error: updateError?.message ?? 'Failed to update lead status. Please try again.',
    }
  }

  // Log "updated" activity with previous and new status — Req 7.2
  const activityError = await insertActivity(supabase, {
    leadId: lead.id,
    userId: user.id,
    type: 'updated',
    description: `Status changed from ${previousStatus} to ${params.newStatus}`,
  })

  if (activityError) {
    console.error('Failed to insert activity for updateLeadStatus:', activityError)
  }

  return {
    success: true,
    data: lead as Lead,
  }
}

// ---------------------------------------------------------------------------
// logWhatsAppClick
// ---------------------------------------------------------------------------

/**
 * Inserts a "message" activity when a user clicks the WhatsApp button.
 * - Activity type: "message"
 * - Description: "WhatsApp message initiated" (Req 7.5)
 *
 * Requirements: 4.4, 7.5
 */
export async function logWhatsAppClick(params: {
  leadId: string
}): Promise<ActionResult<Activity>> {
  if (!params.leadId) {
    return { success: false, error: 'Lead ID is required' }
  }

  const supabase = createServerClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      success: false,
      error: 'You must be signed in to log activity',
    }
  }

  const { data: activity, error: insertError } = await supabase
    .from('activities')
    .insert({
      lead_id: params.leadId,
      user_id: user.id,
      type: 'message' as ActivityType,
      description: 'WhatsApp message initiated',
    })
    .select()
    .single()

  if (insertError || !activity) {
    return {
      success: false,
      error: insertError?.message ?? 'Failed to log WhatsApp activity',
    }
  }

  return {
    success: true,
    data: activity as Activity,
  }
}
