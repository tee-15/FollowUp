'use client'

// app/leads/[id]/LeadDetailClient.tsx
// Client component — handles all interactive state for the lead detail page:
//   • Status change (inline select)
//   • Schedule follow-up (date picker)
//   • Complete follow-up (per-item button)
//   • Add note (textarea form)
//   • WhatsApp click (logs activity, opens wa.me)
//   • Delete lead

import { useState, useTransition } from 'react'
import type { Lead, FollowUp, Note, Activity } from '@/lib/types'
import { updateLeadStatus, deleteLead, logWhatsAppClick } from '@/app/actions/leads'
import { scheduleFollowUp, completeFollowUp } from '@/app/actions/followups'
import { addNote } from '@/app/actions/notes'
import { buildWhatsAppLink } from '@/lib/whatsapp'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LeadDetailClientProps {
  lead: Lead
  followUps: FollowUp[]
  notes: Note[]
  activities: Activity[]
  businessName: string | null
}

const STATUSES = ['New', 'Contacted', 'Interested', 'Negotiation', 'Won', 'Lost'] as const

const STATUS_COLORS: Record<string, string> = {
  New: 'bg-blue-100 text-blue-800',
  Contacted: 'bg-yellow-100 text-yellow-800',
  Interested: 'bg-purple-100 text-purple-800',
  Negotiation: 'bg-orange-100 text-orange-800',
  Won: 'bg-green-100 text-green-800',
  Lost: 'bg-red-100 text-red-800',
}

const ACTIVITY_ICONS: Record<string, string> = {
  created: '✦',
  updated: '✎',
  note: '📝',
  followup: '✅',
  message: '💬',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function LeadDetailClient({
  lead: initialLead,
  followUps: initialFollowUps,
  notes: initialNotes,
  activities: initialActivities,
  businessName,
}: LeadDetailClientProps) {
  // Local state — optimistically updated after server actions
  const [lead, setLead] = useState(initialLead)
  const [followUps, setFollowUps] = useState(initialFollowUps)
  const [notes, setNotes] = useState(initialNotes)
  const [activities, setActivities] = useState(initialActivities)

  // Status
  const [statusError, setStatusError] = useState<string | null>(null)
  const [isPendingStatus, startStatusTransition] = useTransition()

  // Schedule follow-up
  const [dueDate, setDueDate] = useState('')
  const [scheduleError, setScheduleError] = useState<string | null>(null)
  const [isPendingSchedule, startScheduleTransition] = useTransition()

  // Note
  const [noteContent, setNoteContent] = useState('')
  const [noteError, setNoteError] = useState<string | null>(null)
  const [isPendingNote, startNoteTransition] = useTransition()

  // Delete
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isPendingDelete, startDeleteTransition] = useTransition()

  // WhatsApp
  const firstName = lead.full_name.split(' ')[0]
  const waResult = buildWhatsAppLink(lead.phone, businessName, firstName)

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleStatusChange(newStatus: string) {
    setStatusError(null)
    startStatusTransition(async () => {
      const result = await updateLeadStatus({ id: lead.id, newStatus: newStatus as Lead['status'] })
      if (result.success) {
        setLead(result.data)
        // Add optimistic activity
        setActivities((prev) => [
          {
            id: crypto.randomUUID(),
            lead_id: lead.id,
            user_id: lead.user_id,
            type: 'updated',
            description: `Status changed from ${lead.status} to ${newStatus}`,
            created_at: new Date().toISOString(),
          },
          ...prev,
        ])
      } else {
        setStatusError(result.error)
      }
    })
  }

  function handleScheduleFollowUp(e: React.FormEvent) {
    e.preventDefault()
    if (!dueDate) {
      setScheduleError('Please select a due date')
      return
    }
    setScheduleError(null)
    startScheduleTransition(async () => {
      const result = await scheduleFollowUp({ leadId: lead.id, dueDate, today: todayISO() })
      if (result.success) {
        setFollowUps((prev) => [result.data, ...prev])
        setDueDate('')
      } else {
        setScheduleError(result.error)
      }
    })
  }

  function handleCompleteFollowUp(followUpId: string) {
    startScheduleTransition(async () => {
      const result = await completeFollowUp({ followUpId })
      if (result.success) {
        setFollowUps((prev) =>
          prev.map((fu) => (fu.id === followUpId ? { ...fu, completed: true } : fu))
        )
        setActivities((prev) => [
          {
            id: crypto.randomUUID(),
            lead_id: lead.id,
            user_id: lead.user_id,
            type: 'followup',
            description: `Follow-up for ${result.data.due_date} marked complete`,
            created_at: new Date().toISOString(),
          },
          ...prev,
        ])
      }
    })
  }

  function handleAddNote(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = noteContent.trim()
    if (!trimmed) {
      setNoteError('Note cannot be empty')
      return
    }
    if (trimmed.length > 500) {
      setNoteError('Note must be at most 500 characters')
      return
    }
    setNoteError(null)
    startNoteTransition(async () => {
      const result = await addNote({ leadId: lead.id, content: trimmed })
      if (result.success) {
        setNotes((prev) => [result.data, ...prev])
        setActivities((prev) => [
          {
            id: crypto.randomUUID(),
            lead_id: lead.id,
            user_id: lead.user_id,
            type: 'note',
            description: 'Note added',
            created_at: new Date().toISOString(),
          },
          ...prev,
        ])
        setNoteContent('')
      } else {
        setNoteError(result.error)
      }
    })
  }

  async function handleWhatsAppClick() {
    if (!waResult.valid) return
    await logWhatsAppClick({ leadId: lead.id })
    window.open(waResult.url, '_blank', 'noopener,noreferrer')
  }

  function handleDelete() {
    setDeleteError(null)
    startDeleteTransition(async () => {
      const result = await deleteLead({ id: lead.id })
      if (!result?.success) {
        setDeleteError(result?.error ?? 'Failed to delete lead')
      }
      // On success, deleteLead redirects to /leads via server redirect()
    })
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const incompleteFollowUps = followUps.filter((f) => !f.completed)
  const completedFollowUps = followUps.filter((f) => f.completed)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-6 space-y-5">

        {/* ── Lead info card ── */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          {/* Name + status */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{lead.full_name}</h1>
              <p className="text-sm text-gray-500 mt-0.5">{lead.source}</p>
            </div>
            <span
              className={`shrink-0 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLORS[lead.status]}`}
            >
              {lead.status}
            </span>
          </div>

          {/* Contact info */}
          <dl className="space-y-2 text-sm mb-5">
            <div className="flex items-center gap-2">
              <dt className="w-12 text-gray-400 shrink-0">Phone</dt>
              <dd className="text-gray-900 font-medium">{lead.phone}</dd>
            </div>
            {lead.email && (
              <div className="flex items-center gap-2">
                <dt className="w-12 text-gray-400 shrink-0">Email</dt>
                <dd className="text-gray-900">{lead.email}</dd>
              </div>
            )}
            <div className="flex items-center gap-2">
              <dt className="w-12 text-gray-400 shrink-0">Added</dt>
              <dd className="text-gray-900">{formatDate(lead.created_at)}</dd>
            </div>
          </dl>

          {/* WhatsApp button */}
          {waResult.valid ? (
            <button
              onClick={handleWhatsAppClick}
              className="w-full min-h-[48px] flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
            >
              <span aria-hidden="true">💬</span> Message on WhatsApp
            </button>
          ) : (
            <p className="text-xs text-gray-400 text-center">{waResult.error}</p>
          )}
        </section>

        {/* ── Change status ── */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Change status</h2>
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                disabled={isPendingStatus || lead.status === s}
                className={`min-h-[40px] rounded-full px-4 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                  lead.status === s
                    ? `${STATUS_COLORS[s]} ring-2 ring-offset-1 ring-current`
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          {statusError && (
            <p role="alert" className="mt-2 text-xs text-red-600">{statusError}</p>
          )}
        </section>

        {/* ── Follow-ups ── */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Follow-ups</h2>

          {/* Schedule form */}
          <form onSubmit={handleScheduleFollowUp} className="flex items-start gap-2 mb-4">
            <div className="flex-1">
              <input
                type="date"
                id="due-date"
                value={dueDate}
                min={todayISO()}
                onChange={(e) => setDueDate(e.target.value)}
                aria-label="Follow-up due date"
                disabled={isPendingSchedule}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {scheduleError && (
                <p role="alert" className="mt-1 text-xs text-red-600">{scheduleError}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={isPendingSchedule}
              className="min-h-[44px] shrink-0 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isPendingSchedule ? '…' : 'Schedule'}
            </button>
          </form>

          {/* Incomplete follow-ups */}
          {incompleteFollowUps.length > 0 && (
            <ul className="space-y-2 mb-3" role="list">
              {incompleteFollowUps.map((fu) => (
                <li
                  key={fu.id}
                  className="flex items-center justify-between rounded-lg bg-blue-50 border border-blue-100 px-3 py-2.5"
                >
                  <time dateTime={fu.due_date} className="text-sm font-medium text-blue-800">
                    {fu.due_date}
                  </time>
                  <button
                    onClick={() => handleCompleteFollowUp(fu.id)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
                  >
                    Mark done
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Completed follow-ups */}
          {completedFollowUps.length > 0 && (
            <details className="mt-1">
              <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 select-none">
                {completedFollowUps.length} completed
              </summary>
              <ul className="mt-2 space-y-1.5" role="list">
                {completedFollowUps.map((fu) => (
                  <li
                    key={fu.id}
                    className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-400 line-through"
                  >
                    <span aria-hidden="true">✓</span>
                    <time dateTime={fu.due_date}>{fu.due_date}</time>
                  </li>
                ))}
              </ul>
            </details>
          )}

          {followUps.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-2">No follow-ups yet</p>
          )}
        </section>

        {/* ── Notes ── */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Notes</h2>

          {/* Add note form */}
          <form onSubmit={handleAddNote} className="mb-4">
            <textarea
              id="note-content"
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              aria-label="Note content"
              aria-invalid={!!noteError}
              disabled={isPendingNote}
              rows={3}
              maxLength={500}
              placeholder="Add a note about this lead…"
              className={`w-full rounded-lg border px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                noteError ? 'border-red-400 bg-red-50' : 'border-gray-300'
              }`}
            />
            <div className="flex items-center justify-between mt-1.5">
              <div>
                {noteError && (
                  <p role="alert" className="text-xs text-red-600">{noteError}</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">{noteContent.length}/500</span>
                <button
                  type="submit"
                  disabled={isPendingNote}
                  className="min-h-[36px] rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isPendingNote ? '…' : 'Add note'}
                </button>
              </div>
            </div>
          </form>

          {/* Notes list */}
          {notes.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-2">No notes yet</p>
          ) : (
            <ul className="space-y-3" role="list">
              {notes.map((note) => (
                <li key={note.id} className="rounded-lg bg-gray-50 p-3">
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.content}</p>
                  <time
                    dateTime={note.created_at}
                    className="mt-1.5 block text-xs text-gray-400"
                  >
                    {formatDate(note.created_at)}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── Activity timeline ── */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Activity</h2>
          {activities.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-2">No activity yet</p>
          ) : (
            <ol className="relative border-l border-gray-200 space-y-4 ml-3" role="list">
              {activities.map((activity) => (
                <li key={activity.id} className="ml-4">
                  <div className="absolute -left-1.5 flex items-center justify-center w-3 h-3 rounded-full bg-gray-200 ring-2 ring-white" aria-hidden="true" />
                  <p className="text-xs text-gray-500 mb-0.5">
                    <span className="mr-1.5">{ACTIVITY_ICONS[activity.type] ?? '•'}</span>
                    {activity.description}
                  </p>
                  <time dateTime={activity.created_at} className="text-xs text-gray-400">
                    {formatDate(activity.created_at)}
                  </time>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* ── Danger zone: Delete ── */}
        <section className="bg-white rounded-2xl border border-red-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-red-700 mb-3">Danger zone</h2>
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="min-h-[44px] w-full rounded-lg border border-red-300 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            >
              Delete this lead
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-700">
                Are you sure? This will permanently delete this lead and all associated follow-ups, notes, and activity.
              </p>
              {deleteError && (
                <p role="alert" className="text-xs text-red-600">{deleteError}</p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={handleDelete}
                  disabled={isPendingDelete}
                  className="flex-1 min-h-[44px] rounded-lg bg-red-600 text-sm font-semibold text-white hover:bg-red-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-60"
                >
                  {isPendingDelete ? 'Deleting…' : 'Yes, delete'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 min-h-[44px] rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
