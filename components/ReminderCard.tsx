'use client'

// components/ReminderCard.tsx
// The core card component shown on every list/dashboard view.

import { useState } from 'react'
import { completeReminder, snoozeReminder, deleteReminder } from '@/app/actions/reminders'
import type { Reminder } from '@/lib/types'
import Link from 'next/link'

function addDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function formatDate(dateStr: string): string {
  const today = new Date().toISOString().slice(0, 10)
  const tomorrow = addDays(1)
  if (dateStr === today) return 'Today'
  if (dateStr === tomorrow) return 'Tomorrow'
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

function isOverdue(dateStr: string): boolean {
  return dateStr < new Date().toISOString().slice(0, 10)
}

function isToday(dateStr: string): boolean {
  return dateStr === new Date().toISOString().slice(0, 10)
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
  WhatsApp: '💬',
  Instagram: '📸',
  Voice: '🎤',
  Screenshot: '📷',
  Manual: '✏️',
}

interface ReminderCardProps {
  reminder: Reminder
  onUpdated?: () => void
  compact?: boolean
}

export default function ReminderCard({ reminder, onUpdated, compact = false }: ReminderCardProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [showSnooze, setShowSnooze] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const overdue = isOverdue(reminder.due_date) && reminder.status === 'pending'
  const today = isToday(reminder.due_date)
  const waUrl = getWhatsAppUrl(reminder.phone, reminder.customer_name, reminder.topic)

  const handleComplete = async () => {
    setLoading('complete')
    await completeReminder(reminder.id)
    setLoading(null)
    onUpdated?.()
    window.location.reload()
  }

  const handleSnooze = async (days: number | null, customDate?: string) => {
    setLoading('snooze')
    const newDate = customDate || addDays(days!)
    await snoozeReminder(reminder.id, newDate)
    setLoading(null)
    setShowSnooze(false)
    onUpdated?.()
    window.location.reload()
  }

  const handleDelete = async () => {
    setLoading('delete')
    await deleteReminder(reminder.id)
    setLoading(null)
    window.location.reload()
  }

  const dateBadge = overdue
    ? 'bg-red-100 text-red-700 border-red-200'
    : today
    ? 'bg-blue-100 text-blue-700 border-blue-200'
    : 'bg-gray-100 text-gray-600 border-gray-200'

  return (
    <div
      className={`group relative bg-white rounded-2xl border transition-all hover:shadow-md ${
        overdue ? 'border-red-200 hover:border-red-300' : 'border-gray-200/60 hover:border-gray-300'
      } ${reminder.status === 'completed' ? 'opacity-60' : ''}`}
    >
      {/* Overdue accent bar */}
      {overdue && <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 rounded-l-2xl" />}
      {today && !overdue && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-l-2xl" />}

      <div className="p-4 pl-5">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm" title={reminder.source}>{SOURCE_ICONS[reminder.source] || '📌'}</span>
              <Link
                href={`/reminders/${reminder.id}`}
                className="font-bold text-gray-900 hover:text-blue-600 transition-colors truncate text-base leading-tight"
              >
                {reminder.customer_name}
              </Link>
            </div>
            <p className="text-sm text-gray-500 truncate font-medium">{reminder.topic}</p>
          </div>

          {/* Date badge */}
          <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full border ${dateBadge}`}>
            {overdue ? `⚠️ ${formatDate(reminder.due_date)}` : formatDate(reminder.due_date)}
          </span>
        </div>

        {/* Summary */}
        {reminder.summary && !compact && (
          <p className="text-xs text-gray-400 mb-3 leading-relaxed line-clamp-2">{reminder.summary}</p>
        )}

        {/* Actions row */}
        {reminder.status !== 'completed' && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {/* WhatsApp */}
            {waUrl ? (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-500 text-white text-xs font-bold hover:bg-green-600 transition-all hover:scale-[1.02] shadow-sm shadow-green-500/20"
              >
                <span>💬</span> WhatsApp
              </a>
            ) : (
              <Link
                href={`/reminders/${reminder.id}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 text-gray-600 text-xs font-semibold hover:bg-gray-200 transition-all"
              >
                <span>📞</span> Add Phone
              </Link>
            )}

            {/* Snooze */}
            <div className="relative">
              <button
                onClick={() => setShowSnooze(!showSnooze)}
                disabled={!!loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 text-gray-600 text-xs font-semibold hover:bg-gray-200 transition-all"
              >
                <span>⏰</span> Snooze
              </button>
              {showSnooze && (
                <div className="absolute bottom-full left-0 mb-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 min-w-[160px] overflow-hidden">
                  {[
                    { label: 'Tomorrow', days: 1 },
                    { label: 'In 3 days', days: 3 },
                    { label: 'Next week', days: 7 },
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => handleSnooze(opt.days)}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 font-medium"
                    >
                      {opt.label}
                    </button>
                  ))}
                  <div className="border-t border-gray-100 px-3 py-2">
                    <input
                      type="date"
                      className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-blue-500"
                      min={addDays(1)}
                      onChange={(e) => e.target.value && handleSnooze(null, e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Complete */}
            <button
              onClick={handleComplete}
              disabled={!!loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100 transition-all ml-auto"
            >
              {loading === 'complete' ? '...' : '✓ Done'}
            </button>
          </div>
        )}

        {/* Completed state */}
        {reminder.status === 'completed' && (
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-emerald-600 font-semibold">✓ Completed</span>
            <button
              onClick={() => setShowDelete(true)}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Delete confirm */}
      {showDelete && (
        <div className="border-t border-gray-100 px-4 py-3 flex items-center gap-3 bg-red-50 rounded-b-2xl">
          <p className="text-xs text-red-600 flex-1 font-medium">Delete this reminder?</p>
          <button onClick={() => setShowDelete(false)} className="text-xs text-gray-500 font-medium">Cancel</button>
          <button
            onClick={handleDelete}
            disabled={loading === 'delete'}
            className="text-xs text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-lg font-bold"
          >
            {loading === 'delete' ? '...' : 'Delete'}
          </button>
        </div>
      )}
    </div>
  )
}
