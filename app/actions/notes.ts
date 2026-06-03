'use server'

// app/actions/notes.ts
// Server Action for adding a note to a lead.
// Validates content server-side (non-empty and ≤500 characters), inserts the note record,
// and inserts a "note" activity record. Returns ActionResult<Note>.
//
// Requirements: 4.5, 4.7, 7.4, 7.8, 7.9, 10.5

import { createServerClient } from '@/lib/supabase/server'
import { ActionResult, Note } from '@/lib/types'

// ---------------------------------------------------------------------------
// addNote
// ---------------------------------------------------------------------------

/**
 * Adds a new note to an existing lead.
 *
 * Validation (server-side):
 * - `content` must not be empty or whitespace-only (Req 4.7, 7.9)
 * - `content` must be at most 500 characters (Req 7.8, 10.5)
 *
 * On success:
 * - Inserts the note into the `notes` table (Req 4.5, 7.8)
 * - Inserts a "note" activity with description "Note added" into the `activities` table (Req 7.4)
 *
 * Requirements: 4.5, 4.7, 7.4, 7.8, 7.9, 10.5
 */
export async function addNote(input: {
  leadId: string
  content: string
}): Promise<ActionResult<Note>> {
  const { leadId, content } = input

  // ------------------------------------------------------------------
  // Server-side validation
  // ------------------------------------------------------------------

  const trimmedContent = content?.trim() ?? ''

  if (trimmedContent.length === 0) {
    return {
      success: false,
      error: 'Note content cannot be empty',
      fields: { content: 'Note content cannot be empty' },
    }
  }

  if (trimmedContent.length > 500) {
    return {
      success: false,
      error: 'Note content must be at most 500 characters',
      fields: { content: 'Note content must be at most 500 characters' },
    }
  }

  if (!leadId) {
    return {
      success: false,
      error: 'Lead ID is required',
    }
  }

  // ------------------------------------------------------------------
  // Authenticate
  // ------------------------------------------------------------------

  const supabase = createServerClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      success: false,
      error: 'You must be signed in to add a note',
    }
  }

  // ------------------------------------------------------------------
  // Insert note
  // ------------------------------------------------------------------

  const { data: note, error: noteError } = await supabase
    .from('notes')
    .insert({
      lead_id: leadId,
      user_id: user.id,
      content: trimmedContent,
    })
    .select()
    .single()

  if (noteError) {
    return {
      success: false,
      error: noteError.message,
    }
  }

  // ------------------------------------------------------------------
  // Insert "note" activity (Req 7.4: description = "Note added")
  // ------------------------------------------------------------------

  const { error: activityError } = await supabase.from('activities').insert({
    lead_id: leadId,
    user_id: user.id,
    type: 'note',
    description: 'Note added',
  })

  if (activityError) {
    // The note was persisted successfully; failing to log the activity should
    // not surface as a hard error to the user. Log for observability but
    // return success so the UI reflects the saved note.
    console.error('[addNote] Failed to insert activity record:', activityError.message)
  }

  return {
    success: true,
    data: note as Note,
  }
}
