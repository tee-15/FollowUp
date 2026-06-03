'use server'

// app/actions/followups.ts
// Server Actions for follow-up scheduling and completion.
// Each action validates inputs server-side, enforces RLS via the server Supabase client,
// and returns ActionResult<FollowUp>.

import { createServerClient } from '@/lib/supabase/server'
import { ActionResult, FollowUp } from '@/lib/types'

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

/**
 * Validates that a YYYY-MM-DD date string is on or after a reference date string.
 * Both strings must be in YYYY-MM-DD format.
 * Lexicographic comparison works correctly for ISO date strings.
 */
function validateDateNotInPast(
  dueDate: string,
  today: string
): string | null {
  if (!dueDate || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    return 'Due date must be a valid date in YYYY-MM-DD format'
  }
  if (dueDate < today) {
    return 'Due date cannot be in the past'
  }
  return null
}

// ---------------------------------------------------------------------------
// scheduleFollowUp
// ---------------------------------------------------------------------------

/**
 * Creates a new Follow_Up record for the given lead.
 *
 * The `today` parameter is the client's current local calendar date in YYYY-MM-DD
 * format. The client supplies this to avoid server timezone conversion issues —
 * the server uses it only for validation (Req 5.3), not for storing the date.
 *
 * Requirements: 5.1, 5.3, 5.5, 10.5
 */
export async function scheduleFollowUp(params: {
  leadId: string
  dueDate: string   // YYYY-MM-DD (client local date)
  today: string     // YYYY-MM-DD (client local "today" for validation)
}): Promise<ActionResult<FollowUp>> {
  const { leadId, dueDate, today } = params

  // Server-side field validation (Req 10.5)
  if (!leadId || leadId.trim().length === 0) {
    return {
      success: false,
      error: 'Lead ID is required',
      fields: { leadId: 'Lead ID is required' },
    }
  }

  const dateError = validateDateNotInPast(dueDate, today)
  if (dateError) {
    return {
      success: false,
      error: dateError,
      fields: { dueDate: dateError },
    }
  }

  const supabase = createServerClient()

  // Retrieve the authenticated user (RLS will also enforce ownership)
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      success: false,
      error: 'You must be signed in to schedule a follow-up',
    }
  }

  // Insert the follow-up record with completed = false (Req 5.1)
  const { data, error: insertError } = await supabase
    .from('follow_ups')
    .insert({
      lead_id: leadId,
      user_id: user.id,
      due_date: dueDate,
      completed: false,
    })
    .select()
    .single()

  if (insertError || !data) {
    return {
      success: false,
      error: insertError?.message ?? 'Failed to schedule follow-up. Please try again.',
    }
  }

  return {
    success: true,
    data: data as FollowUp,
  }
}

// ---------------------------------------------------------------------------
// completeFollowUp
// ---------------------------------------------------------------------------

/**
 * Marks an existing Follow_Up as complete and logs a "followup" activity.
 *
 * Sets `completed = true` on the follow-up record, then inserts an activity
 * record of type "followup" with the description
 * `"Follow-up for {due_date} marked complete"` (Req 5.4, 7.3).
 *
 * Requirements: 5.4, 7.3, 10.5
 */
export async function completeFollowUp(params: {
  followUpId: string
}): Promise<ActionResult<FollowUp>> {
  const { followUpId } = params

  if (!followUpId || followUpId.trim().length === 0) {
    return {
      success: false,
      error: 'Follow-up ID is required',
      fields: { followUpId: 'Follow-up ID is required' },
    }
  }

  const supabase = createServerClient()

  // Retrieve the authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      success: false,
      error: 'You must be signed in to complete a follow-up',
    }
  }

  // Set completed = true and retrieve the updated record (including lead_id and due_date)
  const { data: followUp, error: updateError } = await supabase
    .from('follow_ups')
    .update({ completed: true })
    .eq('id', followUpId)
    .eq('user_id', user.id)   // redundant with RLS but explicit for clarity
    .select()
    .single()

  if (updateError || !followUp) {
    return {
      success: false,
      error: updateError?.message ?? 'Failed to complete follow-up. Please try again.',
    }
  }

  // Insert activity record: "Follow-up for {due_date} marked complete" (Req 5.4, 7.3)
  const activityDescription = `Follow-up for ${followUp.due_date} marked complete`

  const { error: activityError } = await supabase
    .from('activities')
    .insert({
      lead_id: followUp.lead_id,
      user_id: user.id,
      type: 'followup',
      description: activityDescription,
    })

  if (activityError) {
    // The follow-up is already marked complete; return a partial-success error
    // so the UI can reflect the state change while surfacing the logging failure.
    return {
      success: false,
      error: `Follow-up marked complete but failed to log activity: ${activityError.message}`,
    }
  }

  return {
    success: true,
    data: followUp as FollowUp,
  }
}
