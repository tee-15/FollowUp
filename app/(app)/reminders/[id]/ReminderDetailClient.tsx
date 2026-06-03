'use client'

// app/(app)/reminders/[id]/ReminderDetailClient.tsx

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { updateReminder, completeReminder, snoozeReminder, deleteReminder } from '@/app/actions/reminders'
import type { Reminder } from '@/lib/types'

function addDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function getWhatsAppUrl(phone: string | null, name: string, topic: string): string | null {
  if (!phone) return null
  const cleaned = phone.replace(/\D/g, '')
  const message = encodeURIComponent(
    `Hi ${name}, just checking in regarding your ${topic} inquiry. Are you still interested?`
  )
  return `https://wa.me/${cleaned}?text=${message}`
}

const SOURCE_ICONS: Record<string, string> = {
  WhatsApp: '💬', Instagram: '📸', Voice: '🎤', Screenshot: '📷', Manual: '✏️',
}

export default function ReminderDetailClient({ reminder: initial }: { reminder: Reminder }) {
  const router = useRouter()
  const [reminder, setReminder] = useState(initial)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const [showDelete, setShowDelete] = useState(false)
  const [showSnooze, setShowSnooze] = useState(false)

  const [form, setForm] = useState({
    customer_name: reminder.customer_name,
    phone: reminder.phone || '',
    topic: reminder.topic,
    summary: reminder.summary || '',
    due_date: reminder.due_date,
    notes: reminder.notes || '',
  })

  const waUrl = getWhatsAppUrl(reminder.phone, reminder.customer_name, reminder.topic)
  const isOverdue = reminder.due_date < new Date().toISOString().slice(0, 10) && reminder.status === 'pending'
  const isToday = reminder.due_date === new Date().toISOString().slice(0, 10)

  const handleSave = async () => {
    setLoading('save')
    const result = await updateReminder(reminder.id, {
      customer_name: form.customer_name,
      phone: form.phone || null,
      topic: form.topic,
      summary: form.summary || null,
      due_date: form.due_date,
      notes: form.notes || null,
    })
    setLoading(null)
    if (result.success) {
      setReminder(result.data)
      setEditing(false)
    }
  }

  const handleComplete = async () => {
    setLoading('complete')
    await completeReminder(reminder.id)
    setLoading(null)
    router.push('/dashboard')
  }

  const handleSnooze = async (days: number | null, customDate?: string) => {
    setLoading('snooze')
    const newDate = customDate || addDays(days!)
    await snoozeReminder(reminder.id, newDate)
    setLoading(null)
    setShowSnooze(false)
    router.refresh()
  }

  const handleDelete = async () => {
    setLoading('delete')
    await deleteReminder(reminder.id)
    router.push('/reminders')
  }

  const inputCls = 'w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 font-sans-body'

  return (
    <div className="px-4 py-6 lg:px-8 max-w-2xl mx-auto pb-24">
      {/* Back + header */}
      <div className="flex items-center gap-3 mb-8">
        <Link
          href="/dashboard"
          className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors shadow-sm"
        >
          ←
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span title={reminder.source}>{SOURCE_ICONS[reminder.source]}</span>
            <h1 className="text-xl font-bold text-gray-900 truncate">{reminder.customer_name}</h1>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{reminder.topic}</p>
        </div>
        {reminder.status === 'pending' && (
          <button
            onClick={() => setEditing(!editing)}
            className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-bold hover:bg-gray-200 transition-colors"
          >
            {editing ? 'Cancel' : 'Edit'}
          </button>
        )}
      </div>

      {/* Status banner */}
      {isOverdue && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-center gap-3">
          <span className="text-red-500 text-lg">⚠️</span>
          <p className="text-sm font-bold text-red-700">This follow-up is overdue!</p>
        </div>
      )}
      {isToday && !isOverdue && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3 flex items-center gap-3">
          <span className="text-blue-500 text-lg">📅</span>
          <p className="text-sm font-bold text-blue-700">Follow up with this customer today.</p>
        </div>
      )}

      {/* Detail / Edit Card */}
      <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm space-y-5 mb-6">
        {editing ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Customer Name</label>
                <input type="text" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Phone (WhatsApp)</label>
                <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+234..." className={inputCls} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Topic</label>
              <input type="text" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Summary</label>
              <textarea value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} className={`${inputCls} h-20 resize-none`} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Follow-up Date</label>
              <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Notes</label>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={`${inputCls} h-20 resize-none`} placeholder="Personal notes..." />
            </div>
            <button
              onClick={handleSave}
              disabled={loading === 'save'}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-lg hover:scale-[1.01] transition-all disabled:opacity-50"
            >
              {loading === 'save' ? 'Saving…' : 'Save Changes'}
            </button>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Customer</p>
                <p className="font-semibold text-gray-900">{reminder.customer_name}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Phone</p>
                <p className="font-semibold text-gray-900">{reminder.phone || <span className="text-gray-400 italic">Not set</span>}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Topic</p>
                <p className="font-semibold text-gray-900">{reminder.topic}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Source</p>
                <p className="font-semibold text-gray-900">{SOURCE_ICONS[reminder.source]} {reminder.source}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Follow-up Date</p>
                <p className={`font-semibold ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                  {new Date(reminder.due_date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Status</p>
                <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full ${
                  reminder.status === 'completed' ? 'bg-green-100 text-green-700' :
                  isOverdue ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {reminder.status === 'completed' ? '✓ Completed' : isOverdue ? 'Overdue' : 'Pending'}
                </span>
              </div>
            </div>
            {reminder.summary && (
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Summary</p>
                <p className="text-sm text-gray-600 leading-relaxed">{reminder.summary}</p>
              </div>
            )}
            {reminder.notes && (
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Notes</p>
                <p className="text-sm text-gray-600 leading-relaxed">{reminder.notes}</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Actions */}
      {reminder.status === 'pending' && !editing && (
        <div className="space-y-3">
          {waUrl && (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-green-500 text-white font-black text-base hover:bg-green-600 shadow-lg shadow-green-500/30 hover:scale-[1.01] transition-all"
            >
              💬 Message on WhatsApp
            </a>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <button
                onClick={() => setShowSnooze(!showSnooze)}
                className="w-full py-3 rounded-2xl bg-gray-100 text-gray-700 font-bold text-sm hover:bg-gray-200 transition-colors"
              >
                ⏰ Snooze
              </button>
              {showSnooze && (
                <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-2xl shadow-xl z-20 min-w-[180px] overflow-hidden">
                  {[{ label: 'Tomorrow', days: 1 }, { label: 'In 3 days', days: 3 }, { label: 'Next week', days: 7 }].map((opt) => (
                    <button key={opt.label} onClick={() => handleSnooze(opt.days)} className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 font-medium border-b border-gray-50 last:border-0">
                      {opt.label}
                    </button>
                  ))}
                  <div className="px-3 pb-3 pt-2">
                    <input type="date" className="w-full text-xs border border-gray-200 rounded-xl px-2 py-2 outline-none focus:ring-1 focus:ring-blue-500" min={addDays(1)} onChange={(e) => e.target.value && handleSnooze(null, e.target.value)} />
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={handleComplete}
              disabled={loading === 'complete'}
              className="py-3 rounded-2xl bg-emerald-500 text-white font-bold text-sm hover:bg-emerald-600 shadow-md shadow-emerald-500/20 transition-colors disabled:opacity-50"
            >
              {loading === 'complete' ? '...' : '✓ Mark Done'}
            </button>
          </div>
        </div>
      )}

      {/* Delete */}
      <div className="mt-8 pt-6 border-t border-gray-100">
        {!showDelete ? (
          <button onClick={() => setShowDelete(true)} className="text-sm text-gray-400 hover:text-red-500 transition-colors font-medium">
            Delete reminder
          </button>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <p className="text-sm text-red-700 font-bold mb-3">Are you sure? This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDelete(false)} className="flex-1 py-2 rounded-xl bg-white border border-gray-200 text-gray-600 text-sm font-bold">Cancel</button>
              <button onClick={handleDelete} disabled={loading === 'delete'} className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-black hover:bg-red-600 disabled:opacity-50">
                {loading === 'delete' ? '...' : 'Delete'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
