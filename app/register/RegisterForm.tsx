'use client'

// app/register/RegisterForm.tsx
// Client-side registration form component.
// Validates: email format, password 8–128 chars, name and businessName non-empty.
// Calls registerUser server action and renders inline field errors from ActionResult.fields.

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { registerUser } from '@/app/actions/auth'

interface FormErrors {
  name?: string
  businessName?: string
  email?: string
  password?: string
  general?: string
}

export default function RegisterForm() {
  const router = useRouter()

  const [name, setName] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)

  // ---------------------------------------------------------------------------
  // Client-side validation
  // ---------------------------------------------------------------------------

  function validate(): FormErrors {
    const errs: FormErrors = {}

    if (!name.trim()) {
      errs.name = 'Name is required'
    }

    if (!businessName.trim()) {
      errs.businessName = 'Business name is required'
    }

    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      errs.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errs.email = 'Enter a valid email address'
    }

    if (!password) {
      errs.password = 'Password is required'
    } else if (password.length < 8) {
      errs.password = 'Password must be at least 8 characters'
    } else if (password.length > 128) {
      errs.password = 'Password must be at most 128 characters'
    }

    return errs
  }

  // ---------------------------------------------------------------------------
  // Submit handler
  // ---------------------------------------------------------------------------

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const clientErrors = validate()
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors)
      return
    }

    setErrors({})
    setLoading(true)

    try {
      const result = await registerUser({
        email: email.trim(),
        password,
        name: name.trim(),
        businessName: businessName.trim(),
      })

      if (result.success) {
        router.push('/dashboard')
        return
      }

      // Map server-returned field errors back to form state (ActionResult.fields)
      const serverErrors: FormErrors = { general: result.error }
      if (result.fields) {
        if (result.fields.name) serverErrors.name = result.fields.name
        if (result.fields.businessName) serverErrors.businessName = result.fields.businessName
        if (result.fields.email) serverErrors.email = result.fields.email
        if (result.fields.password) serverErrors.password = result.fields.password
      }
      setErrors(serverErrors)
    } catch {
      setErrors({ general: 'An unexpected error occurred. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Helper for input class names
  // ---------------------------------------------------------------------------

  function inputClass(hasError: boolean) {
    return [
      'w-full rounded-lg border px-4 py-3 text-sm text-gray-900 placeholder-gray-400',
      'outline-none transition focus:ring-2 focus:ring-blue-500 focus:border-transparent',
      hasError ? 'border-red-400 bg-red-50 focus:ring-red-400' : 'border-gray-300 bg-white',
    ].join(' ')
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
          <p className="mt-2 text-sm text-gray-600">Start managing your leads with FollowUp</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          {/* General error banner */}
          {errors.general && (
            <div
              role="alert"
              className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
            >
              {errors.general}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* Name */}
            <div className="mb-4">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Your name
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-describedby={errors.name ? 'name-error' : undefined}
                aria-invalid={!!errors.name}
                className={inputClass(!!errors.name)}
                placeholder="Jane Smith"
                disabled={loading}
              />
              {errors.name && (
                <p id="name-error" role="alert" className="mt-1 text-xs text-red-600">
                  {errors.name}
                </p>
              )}
            </div>

            {/* Business Name */}
            <div className="mb-4">
              <label
                htmlFor="businessName"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Business name
              </label>
              <input
                id="businessName"
                type="text"
                autoComplete="organization"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                aria-describedby={errors.businessName ? 'businessName-error' : undefined}
                aria-invalid={!!errors.businessName}
                className={inputClass(!!errors.businessName)}
                placeholder="Acme Ltd"
                disabled={loading}
              />
              {errors.businessName && (
                <p id="businessName-error" role="alert" className="mt-1 text-xs text-red-600">
                  {errors.businessName}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-describedby={errors.email ? 'email-error' : undefined}
                aria-invalid={!!errors.email}
                className={inputClass(!!errors.email)}
                placeholder="you@example.com"
                disabled={loading}
              />
              {errors.email && (
                <p id="email-error" role="alert" className="mt-1 text-xs text-red-600">
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="mb-6">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-describedby={errors.password ? 'password-error' : 'password-hint'}
                aria-invalid={!!errors.password}
                className={inputClass(!!errors.password)}
                placeholder="Min. 8 characters"
                disabled={loading}
              />
              {errors.password ? (
                <p id="password-error" role="alert" className="mt-1 text-xs text-red-600">
                  {errors.password}
                </p>
              ) : (
                <p id="password-hint" className="mt-1 text-xs text-gray-500">
                  Between 8 and 128 characters
                </p>
              )}
            </div>

            {/* Submit — min h-12 (48px) touch target, disabled while loading */}
            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-12 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </div>

        {/* Footer link */}
        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-semibold text-blue-600 hover:text-blue-700 underline-offset-2 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  )
}
