'use client'

// components/UpdateProfileForm.tsx
// Client component for updating the user's name and business name.
// Calls the `updateProfile` server action and immediately reflects the
// updated values in the UI without a full page reload (Req 1.10).

import { useState, useTransition } from 'react'
import { updateProfile } from '@/app/actions/auth'

interface UpdateProfileFormProps {
  initialName: string
  initialBusinessName: string
}

export default function UpdateProfileForm({
  initialName,
  initialBusinessName,
}: UpdateProfileFormProps) {
  // Track displayed values — updated optimistically on success
  const [name, setName] = useState(initialName)
  const [businessName, setBusinessName] = useState(initialBusinessName)

  // Track draft input values (what the user is typing)
  const [draftName, setDraftName] = useState(initialName)
  const [draftBusinessName, setDraftBusinessName] = useState(initialBusinessName)

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFieldErrors({})
    setFormError(null)
    setSuccessMessage(null)

    // Basic client-side validation before hitting the server
    const errors: Record<string, string> = {}
    const trimmedName = draftName.trim()
    const trimmedBusiness = draftBusinessName.trim()

    if (trimmedName.length === 0) errors.name = 'Name is required'
    else if (trimmedName.length > 100) errors.name = 'Name must be at most 100 characters'

    if (trimmedBusiness.length === 0) errors.businessName = 'Business name is required'
    else if (trimmedBusiness.length > 100) errors.businessName = 'Business name must be at most 100 characters'

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    startTransition(async () => {
      const result = await updateProfile({
        name: trimmedName,
        businessName: trimmedBusiness,
      })

      if (result.success) {
        // Update displayed values immediately — no page reload
        setName(result.data.name)
        setBusinessName(result.data.business_name)
        setDraftName(result.data.name)
        setDraftBusinessName(result.data.business_name)
        setSuccessMessage('Profile updated successfully.')
      } else {
        if (result.fields) {
          setFieldErrors(result.fields)
        }
        setFormError(result.error)
      }
    })
  }

  return (
    <div className="max-w-lg w-full">
      {/* Display current saved values */}
      <div className="mb-6 rounded-lg bg-gray-50 p-4 text-sm text-gray-700">
        <p>
          <span className="font-medium">Name:</span> {name}
        </p>
        <p className="mt-1">
          <span className="font-medium">Business name:</span> {businessName}
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* Name field */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Name <span aria-hidden="true" className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            disabled={isPending}
            aria-invalid={!!fieldErrors.name}
            aria-describedby={fieldErrors.name ? 'name-error' : undefined}
            className={`w-full rounded-md border px-3 py-3 text-sm leading-tight shadow-sm
              focus:outline-none focus:ring-2 focus:ring-blue-500
              disabled:opacity-50 disabled:cursor-not-allowed
              min-h-[44px]
              ${fieldErrors.name ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white'}`}
          />
          {fieldErrors.name && (
            <p id="name-error" role="alert" className="mt-1 text-xs text-red-600">
              {fieldErrors.name}
            </p>
          )}
        </div>

        {/* Business name field */}
        <div>
          <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 mb-1">
            Business name <span aria-hidden="true" className="text-red-500">*</span>
          </label>
          <input
            id="businessName"
            type="text"
            value={draftBusinessName}
            onChange={(e) => setDraftBusinessName(e.target.value)}
            disabled={isPending}
            aria-invalid={!!fieldErrors.businessName}
            aria-describedby={fieldErrors.businessName ? 'businessName-error' : undefined}
            className={`w-full rounded-md border px-3 py-3 text-sm leading-tight shadow-sm
              focus:outline-none focus:ring-2 focus:ring-blue-500
              disabled:opacity-50 disabled:cursor-not-allowed
              min-h-[44px]
              ${fieldErrors.businessName ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white'}`}
          />
          {fieldErrors.businessName && (
            <p id="businessName-error" role="alert" className="mt-1 text-xs text-red-600">
              {fieldErrors.businessName}
            </p>
          )}
        </div>

        {/* Form-level error */}
        {formError && (
          <p role="alert" className="text-sm text-red-600">
            {formError}
          </p>
        )}

        {/* Success message */}
        {successMessage && (
          <p role="status" className="text-sm text-green-600">
            {successMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-md bg-blue-600 px-4 py-3 text-sm font-semibold text-white
            hover:bg-blue-700 active:bg-blue-800
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors min-h-[44px]"
        >
          {isPending ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </div>
  )
}
