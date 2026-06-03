'use client'

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

  function validate(): FormErrors {
    const errs: FormErrors = {}
    if (!name.trim()) errs.name = 'Name is required'
    if (!businessName.trim()) errs.businessName = 'Business name is required'
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

  const inputBase = 'w-full rounded-xl border px-4 py-3.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 hover:bg-white focus:bg-white font-sans-body'
  const inputError = 'border-red-300 bg-red-50 focus:ring-red-400'
  const inputNormal = 'border-gray-200'

  const PERKS = [
    { icon: '📊', text: 'Visual Kanban pipeline' },
    { icon: '💬', text: 'One-click WhatsApp messaging' },
    { icon: '📅', text: 'Smart follow-up scheduling' },
    { icon: '⚡️', text: 'Instant load, zero lag' },
  ]

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left Panel — Decorative */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden bg-[#0A0A0A] flex-col justify-between p-12">
        <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-600/20 rounded-full blur-[80px]" />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-white text-lg shadow-lg">F</div>
          <span className="text-xl font-bold text-white tracking-tight font-sans-body">FollowUp</span>
        </div>

        {/* Center content */}
        <div className="relative z-10">
          <h2 className="text-3xl font-bold text-white leading-snug mb-8" style={{fontFamily: 'var(--font-playfair)'}}>
            Everything you need to close more deals.
          </h2>
          <ul className="space-y-4">
            {PERKS.map((perk) => (
              <li key={perk.text} className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-lg shrink-0 border border-white/10">
                  {perk.icon}
                </div>
                <span className="text-gray-300 font-sans-body text-sm font-medium">{perk.text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom CTA note */}
        <p className="text-gray-600 text-xs font-sans-body relative z-10">
          🔒 Secured by Supabase Auth. Your data is end-to-end encrypted.
        </p>
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-gray-50/50 overflow-y-auto">
        <div className="w-full max-w-md">

          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-white text-lg shadow-lg">F</div>
            <span className="text-xl font-bold text-gray-900 tracking-tight font-sans-body">FollowUp</span>
          </div>

          <div className="mb-10">
            <h1 className="text-4xl font-bold text-gray-900 mb-3 leading-tight" style={{fontFamily: 'var(--font-playfair)'}}>
              Create your account
            </h1>
            <p className="text-gray-500 font-sans-body text-base">
              Start closing more deals today. Free forever.
            </p>
          </div>

          {errors.general && (
            <div role="alert" className="mb-6 rounded-xl bg-red-50 border border-red-200 px-4 py-3.5 text-sm text-red-700 font-sans-body">
              {errors.general}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Name + Business Name side by side */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2 font-sans-body">
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
                  className={`${inputBase} ${errors.name ? inputError : inputNormal}`}
                  placeholder="Jane Smith"
                  disabled={loading}
                />
                {errors.name && (
                  <p id="name-error" role="alert" className="mt-2 text-xs text-red-600 font-sans-body font-medium">{errors.name}</p>
                )}
              </div>
              <div>
                <label htmlFor="businessName" className="block text-sm font-semibold text-gray-700 mb-2 font-sans-body">
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
                  className={`${inputBase} ${errors.businessName ? inputError : inputNormal}`}
                  placeholder="Acme Ltd"
                  disabled={loading}
                />
                {errors.businessName && (
                  <p id="businessName-error" role="alert" className="mt-2 text-xs text-red-600 font-sans-body font-medium">{errors.businessName}</p>
                )}
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2 font-sans-body">
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
                className={`${inputBase} ${errors.email ? inputError : inputNormal}`}
                placeholder="you@example.com"
                disabled={loading}
              />
              {errors.email && (
                <p id="email-error" role="alert" className="mt-2 text-xs text-red-600 font-sans-body font-medium">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2 font-sans-body">
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
                className={`${inputBase} ${errors.password ? inputError : inputNormal}`}
                placeholder="Min. 8 characters"
                disabled={loading}
              />
              {errors.password ? (
                <p id="password-error" role="alert" className="mt-2 text-xs text-red-600 font-sans-body font-medium">{errors.password}</p>
              ) : (
                <p id="password-hint" className="mt-2 text-xs text-gray-400 font-sans-body">Between 8 and 128 characters</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[52px] rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-base shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-[1.01] transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 font-sans-body mt-2"
            >
              {loading ? 'Creating account…' : 'Create free account'}
            </button>

            <p className="text-center text-xs text-gray-400 font-sans-body">
              By signing up you agree to our Terms of Service and Privacy Policy.
            </p>
          </form>

          <p className="mt-8 text-center text-sm text-gray-500 font-sans-body">
            Already have an account?{' '}
            <Link href="/login" className="font-bold text-blue-600 hover:text-blue-700 underline-offset-2 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
