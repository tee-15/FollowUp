'use server'

// app/actions/auth.ts
// Server Actions for authentication: register, login, logout, and profile update.
// Each action validates all fields server-side before calling Supabase Auth.
// Returns ActionResult<T> — a discriminated union of success/failure.

import { createServerClient } from '@/lib/supabase/server'
import { ActionResult, Profile } from '@/lib/types'
import { redirect } from 'next/navigation'

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

function validateEmail(email: string): string | null {
  if (!email || email.trim().length === 0) return 'Email is required'
  // RFC-5322 simplified check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email.trim())) return 'Enter a valid email address'
  return null
}

function validatePassword(password: string): string | null {
  if (!password || password.length === 0) return 'Password is required'
  if (password.length < 8) return 'Password must be at least 8 characters'
  if (password.length > 128) return 'Password must be at most 128 characters'
  return null
}

function validateName(name: string, fieldLabel: string): string | null {
  const trimmed = name?.trim() ?? ''
  if (trimmed.length === 0) return `${fieldLabel} is required`
  if (trimmed.length > 100) return `${fieldLabel} must be at most 100 characters`
  return null
}

// ---------------------------------------------------------------------------
// registerUser
// ---------------------------------------------------------------------------

/**
 * Creates a new Supabase Auth user. Passes `name` and `business_name` as user
 * metadata so the `handle_new_user` DB trigger can populate the `profiles` table.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.9, 10.5
 */
export async function registerUser(formData: {
  email: string
  password: string
  name: string
  businessName: string
}): Promise<ActionResult<{ userId: string }>> {
  const fields: Record<string, string> = {}

  const emailError = validateEmail(formData.email)
  if (emailError) fields.email = emailError

  const passwordError = validatePassword(formData.password)
  if (passwordError) fields.password = passwordError

  const nameError = validateName(formData.name, 'Name')
  if (nameError) fields.name = nameError

  const businessNameError = validateName(formData.businessName, 'Business name')
  if (businessNameError) fields.businessName = businessNameError

  if (Object.keys(fields).length > 0) {
    return {
      success: false,
      error: 'Please correct the highlighted fields',
      fields,
    }
  }

  const supabase = createServerClient()

  const { data, error } = await supabase.auth.signUp({
    email: formData.email.trim(),
    password: formData.password,
    options: {
      data: {
        name: formData.name.trim(),
        business_name: formData.businessName.trim(),
      },
    },
  })

  if (error) {
    // Supabase returns a specific message when the email is already registered.
    // We surface it as a field error without leaking implementation details.
    if (
      error.message.toLowerCase().includes('already registered') ||
      error.message.toLowerCase().includes('user already exists') ||
      error.message.toLowerCase().includes('email address is already')
    ) {
      return {
        success: false,
        error: 'The email address is already in use',
        fields: { email: 'The email address is already in use' },
      }
    }

    return {
      success: false,
      error: error.message,
    }
  }

  if (!data.user) {
    return {
      success: false,
      error: 'Registration failed. Please try again.',
    }
  }

  return {
    success: true,
    data: { userId: data.user.id },
  }
}

// ---------------------------------------------------------------------------
// loginUser
// ---------------------------------------------------------------------------

/**
 * Signs in an existing user with email and password.
 * On credential mismatch, returns a generic error that does not indicate
 * which field was wrong (Req 1.5).
 *
 * Requirements: 1.4, 1.5, 10.3
 */
export async function loginUser(formData: {
  email: string
  password: string
}): Promise<ActionResult<{ userId: string }>> {
  const fields: Record<string, string> = {}

  const emailError = validateEmail(formData.email)
  if (emailError) fields.email = emailError

  if (!formData.password || formData.password.length === 0) {
    fields.password = 'Password is required'
  }

  if (Object.keys(fields).length > 0) {
    return {
      success: false,
      error: 'Please correct the highlighted fields',
      fields,
    }
  }

  const supabase = createServerClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email: formData.email.trim(),
    password: formData.password,
  })

  if (error) {
    // Return a generic message — do not reveal whether email or password is wrong (Req 1.5)
    return {
      success: false,
      error: 'Invalid email or password',
    }
  }

  if (!data.user) {
    return {
      success: false,
      error: 'Invalid email or password',
    }
  }

  return {
    success: true,
    data: { userId: data.user.id },
  }
}

// ---------------------------------------------------------------------------
// logoutUser
// ---------------------------------------------------------------------------

/**
 * Signs out the current user, invalidating the session token, and redirects
 * to the login page.
 *
 * Requirements: 1.6, 10.3
 */
export async function logoutUser(): Promise<ActionResult<null>> {
  const supabase = createServerClient()

  const { error } = await supabase.auth.signOut()

  if (error) {
    return {
      success: false,
      error: 'Failed to sign out. Please try again.',
    }
  }

  redirect('/login')
}

// ---------------------------------------------------------------------------
// updateProfile
// ---------------------------------------------------------------------------

/**
 * Updates the authenticated user's profile (name and business name).
 * Validates field lengths server-side before persisting.
 * Upserts into the `profiles` table — the DB trigger ensures the row exists
 * after registration, but upsert is used defensively.
 *
 * Requirements: 1.9, 1.10, 10.5
 */
export async function updateProfile(formData: {
  name: string
  businessName: string
}): Promise<ActionResult<Pick<Profile, 'name' | 'business_name'>>> {
  const fields: Record<string, string> = {}

  const nameError = validateName(formData.name, 'Name')
  if (nameError) fields.name = nameError

  const businessNameError = validateName(formData.businessName, 'Business name')
  if (businessNameError) fields.businessName = businessNameError

  if (Object.keys(fields).length > 0) {
    return {
      success: false,
      error: 'Please correct the highlighted fields',
      fields,
    }
  }

  const supabase = createServerClient()

  // Retrieve the authenticated user's ID
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      success: false,
      error: 'You must be signed in to update your profile',
    }
  }

  const trimmedName = formData.name.trim()
  const trimmedBusinessName = formData.businessName.trim()

  const { error: upsertError } = await supabase
    .from('profiles')
    .upsert(
      {
        id: user.id,
        name: trimmedName,
        business_name: trimmedBusinessName,
      },
      { onConflict: 'id' }
    )

  if (upsertError) {
    return {
      success: false,
      error: upsertError.message,
    }
  }

  return {
    success: true,
    data: {
      name: trimmedName,
      business_name: trimmedBusinessName,
    },
  }
}
