// app/(app)/reminders/[id]/page.tsx
import { notFound, redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import ReminderDetailClient from './ReminderDetailClient'
import type { Reminder } from '@/lib/types'

interface Props { params: { id: string } }

export async function generateMetadata() {
  return { title: 'Reminder | FollowUp AI' }
}

export default async function ReminderDetailPage({ params }: Props) {
  const supabase = createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (error || !data) notFound()

  return <ReminderDetailClient reminder={data as Reminder} />
}
