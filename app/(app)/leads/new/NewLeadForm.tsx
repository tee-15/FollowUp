'use client'

// app/leads/new/NewLeadForm.tsx
// Client component — new lead creation form.
// Fields: Full Name, Phone, Email (optional), Source (select).
// Calls createLead server action; on success redirects to the new lead's detail page.

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createLead } from '@/app/actions/leads'
import type { Source } from '@/lib/types'

const SOURCES: Source[] = ['WhatsApp', 'Instagram', 'Facebook', 'Referral', 'Other']

interface FormErrors {
  full_name?: string
  phone?: string
  source?: string
  general?: string
}

export default function NewLeadForm() {
  const router = useRouter()

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [source, setSource] = useState<string>('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)

  function validate(): FormErrors {
    const errs: FormErrors = {}
    if (!fullName.trim()) errs.full_name = 'Full name is required'
    if (!phone.trim()) errs.phone = 'Phone number is required'
    if (!source) errs.source = 'Please select a source'
    return errs
  }

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
      const result = await createLead({
        full_name: fullName.trim(),
        phone: phone.trim(),
        email: email.trim() || null,
        source,
      })

      if (result.success) {
        router.push(`/leads/${result.data.id}`)
        return
      }

      const serverErrors: FormErrors = { general: result.error }
      if (result.fields) {
        if (result.fields.full_name) serverErrors.full_name = result.fields.full_name
        if (result.fields.phone) serverErrors.phone = result.fields.phone
        if (result.fields.source) serverErrors.source = result.fields.source
      }
      setErrors(serverErrors)
    } catch {
      setErrors({ general: 'An unexpected error occurred. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  function inputClass(hasError: boolean) {
    return [
      'w-full rounded-lg border px-4 py-3 text-sm text-gray-900 placeholder-gray-400',
      'outline-none transition focus:ring-2 focus:ring-blue-500 focus:border-transparent',
      hasError ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white',
    ].join(' ')
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-lg px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <Link
            href="/leads"
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="Back to leads"
          >
            ←
          </Link>
          <h1 className="text-xl font-bold text-gray-900">New Lead</h1>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          {errors.general && (
            <div
              role="alert"
              className="mb-5 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
            >
              {errors.general}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Full Name */}
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">
                Full name <span aria-hidden="true" className="text-red-500">*</span>
              </label>
              <input
                id="full_name"
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                aria-invalid={!!errors.full_name}
                aria-describedby={errors.full_name ? 'full_name-error' : undefined}
                disabled={loading}
                placeholder="Jane Smith"
                className={inputClass(!!errors.full_name)}
              />
              {errors.full_name && (
                <p id="full_name-error" role="alert" className="mt-1 text-xs text-red-600">
                  {errors.full_name}
                </p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone number <span aria-hidden="true" className="text-red-500">*</span>
              </label>
              <input
                id="phone"
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                aria-invalid={!!errors.phone}
                aria-describedby={errors.phone ? 'phone-error' : undefined}
                disabled={loading}
                placeholder="+1 555 000 0000"
                className={inputClass(!!errors.phone)}
              />
              {errors.phone && (
                <p id="phone-error" role="alert" className="mt-1 text-xs text-red-600">
                  {errors.phone}
                </p>
              )}
            </div>

            {/* Email (optional) */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email address <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                placeholder="jane@example.com"
                className={inputClass(false)}
              />
            </div>

            {/* Source */}
            <div>
              <label htmlFor="source" className="block text-sm font-medium text-gray-700 mb-1">
                Source <span aria-hidden="true" className="text-red-500">*</span>
              </label>
              <select
                id="source"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                aria-invalid={!!errors.source}
                aria-describedby={errors.source ? 'source-error' : undefined}
                disabled={loading}
                className={`w-full rounded-lg border px-4 py-3 text-sm text-gray-900 outline-none transition focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white ${
                  errors.source ? 'border-red-400 bg-red-50' : 'border-gray-300'
                }`}
              >
                <option value="">Select a source…</option>
                {SOURCES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              {errors.source && (
                <p id="source-error" role="alert" className="mt-1 text-xs text-red-600">
                  {errors.source}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[48px] rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating lead…' : 'Create lead'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
