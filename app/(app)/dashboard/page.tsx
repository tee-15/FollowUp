// app/(app)/dashboard/page.tsx
// FollowUp AI — Dashboard: Today, Overdue, Upcoming reminders

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import type { Reminder } from '@/lib/types'
import ReminderCard from '@/components/ReminderCard'

export const metadata = { title: 'Today | FollowUp AI' }

function getDateStr(offsetDays = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

export default async function DashboardPage() {
  const supabase = createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  const [remindersResult, profileResult] = await Promise.all([
    supabase
      .from('reminders')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('due_date', { ascending: true }),
    supabase.from('profiles').select('name, business_name').eq('id', user.id).single(),
  ])

  const today = getDateStr()
  const in7Days = getDateStr(7)
  const allPending = (remindersResult.data ?? []) as Reminder[]

  const overdue = allPending.filter((r) => r.due_date < today)
  const todayList = allPending.filter((r) => r.due_date === today)
  const upcoming = allPending.filter((r) => r.due_date > today && r.due_date <= in7Days)

  const name = profileResult.data?.name?.split(' ')[0] ?? 'there'
  const totalPending = allPending.length

  // Empty state
  if (allPending.length === 0 && overdue.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center text-4xl mb-6">🎉</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">You&apos;re all caught up, {name}!</h1>
        <p className="text-gray-500 mb-8 max-w-sm">No pending follow-ups. Add a new reminder whenever a customer reaches out.</p>
        <Link
          href="/reminders/new"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-lg shadow-blue-500/30 hover:scale-[1.02] transition-all"
        >
          + New Reminder
        </Link>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 lg:px-8 max-w-2xl mx-auto space-y-8 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 leading-tight">Hi, {name} 👋</h1>
          <p className="text-gray-500 mt-1 text-sm font-medium">
            {totalPending} follow-up{totalPending !== 1 ? 's' : ''} pending
          </p>
        </div>
        <Link
          href="/reminders/new"
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm shadow-md shadow-blue-500/20 hover:scale-[1.02] transition-all"
        >
          + New
        </Link>
      </div>

      {/* Overdue */}
      {overdue.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <h2 className="font-black text-red-600 uppercase text-xs tracking-widest">Overdue</h2>
            <span className="ml-auto bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">{overdue.length}</span>
          </div>
          <div className="space-y-3">
            {overdue.map((r) => <ReminderCard key={r.id} reminder={r} />)}
          </div>
        </section>
      )}

      {/* Today */}
      {todayList.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <h2 className="font-black text-blue-600 uppercase text-xs tracking-widest">Today</h2>
            <span className="ml-auto bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">{todayList.length}</span>
          </div>
          <div className="space-y-3">
            {todayList.map((r) => <ReminderCard key={r.id} reminder={r} />)}
          </div>
        </section>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2.5 h-2.5 rounded-full bg-gray-400" />
            <h2 className="font-black text-gray-500 uppercase text-xs tracking-widest">Upcoming (7 days)</h2>
            <span className="ml-auto bg-gray-100 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full">{upcoming.length}</span>
          </div>
          <div className="space-y-3">
            {upcoming.map((r) => <ReminderCard key={r.id} reminder={r} compact />)}
          </div>
        </section>
      )}

      {/* See all link */}
      <div className="text-center pt-2">
        <Link href="/reminders" className="text-sm text-blue-600 font-bold hover:underline">
          View all reminders →
        </Link>
      </div>
    </div>
  )
}
