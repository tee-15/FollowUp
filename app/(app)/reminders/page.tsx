// app/(app)/reminders/page.tsx
// All Reminders list page with filter tabs

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import type { Reminder } from '@/lib/types'
import ReminderCard from '@/components/ReminderCard'

export const metadata = { title: 'All Reminders | FollowUp AI' }

export default async function RemindersPage({
  searchParams,
}: {
  searchParams: { filter?: string }
}) {
  const supabase = createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  const filter = searchParams.filter || 'pending'
  const today = new Date().toISOString().slice(0, 10)

  let query = supabase
    .from('reminders')
    .select('*')
    .eq('user_id', user.id)
    .order('due_date', { ascending: true })

  if (filter === 'pending') query = query.eq('status', 'pending')
  else if (filter === 'completed') query = query.eq('status', 'completed')
  else if (filter === 'overdue') query = query.eq('status', 'pending').lt('due_date', today)

  const { data } = await query
  const reminders = (data ?? []) as Reminder[]

  const FILTERS = [
    { id: 'pending', label: 'Pending' },
    { id: 'overdue', label: 'Overdue' },
    { id: 'completed', label: 'Completed' },
    { id: 'all', label: 'All' },
  ]

  return (
    <div className="px-4 py-6 lg:px-8 max-w-2xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Reminders</h1>
        <Link
          href="/reminders/new"
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm shadow-md shadow-blue-500/20 hover:scale-[1.02] transition-all"
        >
          + New
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <Link
            key={f.id}
            href={`/reminders?filter=${f.id}`}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all ${
              filter === f.id
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {/* List */}
      {reminders.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-4">📋</div>
          <p className="text-gray-500 font-medium mb-6">
            {filter === 'completed' ? 'No completed reminders yet.' : 'No reminders found.'}
          </p>
          {filter !== 'completed' && (
            <Link
              href="/reminders/new"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-lg shadow-blue-500/30 hover:scale-[1.02] transition-all"
            >
              + Add Reminder
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {reminders.map((r) => (
            <ReminderCard key={r.id} reminder={r} />
          ))}
        </div>
      )}
    </div>
  )
}
