'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { loginUser } from '@/app/actions/auth'

interface FormErrors {
  email?: string
  password?: string
  general?: string
}

export default function LoginForm() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)

  function validate(): FormErrors {
    const errs: FormErrors = {}
    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      errs.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errs.email = 'Enter a valid email address'
    }
    if (!password) {
      errs.password = 'Password is required'
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
      const result = await loginUser({ email: email.trim(), password })
      if (result.success) {
        router.push('/dashboard')
        return
      }
      setErrors({ general: result.error })
    } catch {
      setErrors({ general: 'An unexpected error occurred. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const inputBase = 'w-full rounded-xl border px-4 py-3.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 hover:bg-white focus:bg-white font-sans-body'
  const inputError = 'border-red-300 bg-red-50 focus:ring-red-400'
  const inputNormal = 'border-gray-200'

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left Panel — Decorative */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden bg-[#0A0A0A] flex-col justify-between p-12">
        {/* Background blobs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/25 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-indigo-600/20 rounded-full blur-[80px]" />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-white text-lg shadow-lg">F</div>
          <span className="text-xl font-bold text-white tracking-tight font-sans-body">FollowUp</span>
        </div>

        {/* Center quote */}
        <div className="relative z-10">
          <blockquote className="text-3xl font-bold text-white leading-snug mb-6" style={{fontFamily: 'var(--font-playfair)'}}>
            "The fortune is in the follow-up."
          </blockquote>
          <p className="text-gray-400 font-sans-body text-sm">— Every successful salesperson ever</p>
        </div>

        {/* Bottom stats */}
        <div className="flex gap-8 relative z-10">
          <div>
            <p className="text-2xl font-black text-white font-sans-body">500+</p>
            <p className="text-xs text-gray-500 font-sans-body mt-1">Sales teams</p>
          </div>
          <div>
            <p className="text-2xl font-black text-white font-sans-body">4.9★</p>
            <p className="text-xs text-gray-500 font-sans-body mt-1">Average rating</p>
          </div>
          <div>
            <p className="text-2xl font-black text-white font-sans-body">99%</p>
            <p className="text-xs text-gray-500 font-sans-body mt-1">Uptime</p>
          </div>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-gray-50/50">
        <div className="w-full max-w-md">

          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-white text-lg shadow-lg">F</div>
            <span className="text-xl font-bold text-gray-900 tracking-tight font-sans-body">FollowUp</span>
          </div>

          <div className="mb-10">
            <h1 className="text-4xl font-bold text-gray-900 mb-3 leading-tight" style={{fontFamily: 'var(--font-playfair)'}}>
              Welcome back
            </h1>
            <p className="text-gray-500 font-sans-body text-base">
              Sign in to your account to continue.
            </p>
          </div>

          {errors.general && (
            <div role="alert" className="mb-6 rounded-xl bg-red-50 border border-red-200 px-4 py-3.5 text-sm text-red-700 font-sans-body">
              {errors.general}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
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
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-describedby={errors.password ? 'password-error' : undefined}
                aria-invalid={!!errors.password}
                className={`${inputBase} ${errors.password ? inputError : inputNormal}`}
                placeholder="••••••••"
                disabled={loading}
              />
              {errors.password && (
                <p id="password-error" role="alert" className="mt-2 text-xs text-red-600 font-sans-body font-medium">{errors.password}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[52px] rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-base shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-[1.01] transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 font-sans-body mt-2"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-gray-500 font-sans-body">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-bold text-blue-600 hover:text-blue-700 underline-offset-2 hover:underline">
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
