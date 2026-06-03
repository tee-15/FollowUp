'use client'

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

const STATUS_THEMES: Record<string, string> = {
  New: 'bg-blue-100 text-blue-800 ring-blue-500/20',
  Contacted: 'bg-yellow-100 text-yellow-800 ring-yellow-500/20',
  Interested: 'bg-purple-100 text-purple-800 ring-purple-500/20',
  Negotiation: 'bg-orange-100 text-orange-800 ring-orange-500/20',
  Won: 'bg-green-100 text-green-800 ring-green-500/20',
  Lost: 'bg-red-100 text-red-800 ring-red-500/20',
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
  const [lead, setLead] = useState(initialLead)
  const [followUps, setFollowUps] = useState(initialFollowUps)
  const [notes, setNotes] = useState(initialNotes)
  const [activities, setActivities] = useState(initialActivities)

  const [statusError, setStatusError] = useState<string | null>(null)
  const [isPendingStatus, startStatusTransition] = useTransition()

  const [dueDate, setDueDate] = useState('')
  const [scheduleError, setScheduleError] = useState<string | null>(null)
  const [isPendingSchedule, startScheduleTransition] = useTransition()

  const [noteContent, setNoteContent] = useState('')
  const [noteError, setNoteError] = useState<string | null>(null)
  const [isPendingNote, startNoteTransition] = useTransition()

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isPendingDelete, startDeleteTransition] = useTransition()

  const firstName = lead.full_name.split(' ')[0]
  const waResult = buildWhatsAppLink(lead.phone, businessName, firstName)

  function handleStatusChange(newStatus: string) {
    setStatusError(null)
    startStatusTransition(async () => {
      const result = await updateLeadStatus({ id: lead.id, newStatus: newStatus as Lead['status'] })
      if (result.success) {
        setLead(result.data)
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
    })
  }

  const incompleteFollowUps = followUps.filter((f) => !f.completed)
  const completedFollowUps = followUps.filter((f) => f.completed)

  return (
    <div className="h-full px-4 py-8 lg:px-8 max-w-5xl mx-auto space-y-6">
      
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">{lead.full_name}</h1>
          <p className="text-gray-500 font-medium mt-1">Source: {lead.source}</p>
        </div>
        
        {waResult.valid ? (
          <button
            onClick={handleWhatsAppClick}
            className="w-full md:w-auto min-h-[48px] flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-green-500/30 hover:shadow-green-500/50 hover:scale-[1.02] transition-all focus:outline-none"
          >
            <span aria-hidden="true" className="text-lg">💬</span> WhatsApp
          </button>
        ) : (
          <p className="text-xs text-gray-400">{waResult.error}</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* ── Status & Info ── */}
          <section className="bg-white/70 backdrop-blur-xl rounded-2xl border border-gray-200/60 shadow-sm p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500 rounded-l-2xl"></div>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <h2 className="text-lg font-bold text-gray-900">Lead Status</h2>
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-bold ring-1 ring-inset ${STATUS_THEMES[lead.status]}`}
              >
                {lead.status}
              </span>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-6">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  disabled={isPendingStatus || lead.status === s}
                  className={`rounded-lg px-4 py-2 text-xs font-bold transition-all focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                    lead.status === s
                      ? `${STATUS_THEMES[s]} shadow-sm`
                      : 'bg-gray-100/50 text-gray-600 hover:bg-gray-200/80 border border-transparent'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            {statusError && <p role="alert" className="mb-4 text-xs font-medium text-red-600">{statusError}</p>}

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-sm bg-gray-50/50 rounded-xl p-4 border border-gray-100">
              <div>
                <dt className="text-gray-500 font-medium mb-1">Phone</dt>
                <dd className="text-gray-900 font-semibold">{lead.phone}</dd>
              </div>
              {lead.email && (
                <div>
                  <dt className="text-gray-500 font-medium mb-1">Email</dt>
                  <dd className="text-gray-900 font-semibold">{lead.email}</dd>
                </div>
              )}
              <div>
                <dt className="text-gray-500 font-medium mb-1">Date Added</dt>
                <dd className="text-gray-900 font-semibold">{formatDate(lead.created_at)}</dd>
              </div>
            </dl>
          </section>

          {/* ── Notes ── */}
          <section className="bg-white/70 backdrop-blur-xl rounded-2xl border border-gray-200/60 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Notes</h2>
            
            <form onSubmit={handleAddNote} className="mb-6 relative">
              <textarea
                id="note-content"
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                disabled={isPendingNote}
                rows={3}
                maxLength={500}
                placeholder="Write a note..."
                className="w-full rounded-xl border border-gray-300/80 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-sm"
              />
              <div className="flex items-center justify-between mt-2">
                {noteError ? (
                  <p role="alert" className="text-xs font-medium text-red-600">{noteError}</p>
                ) : <span />}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 font-medium">{noteContent.length}/500</span>
                  <button
                    type="submit"
                    disabled={isPendingNote}
                    className="rounded-lg bg-gray-900 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-gray-800 transition-all disabled:opacity-60"
                  >
                    {isPendingNote ? '…' : 'Save Note'}
                  </button>
                </div>
              </div>
            </form>

            <div className="space-y-4">
              {notes.length === 0 ? (
                <p className="text-sm text-gray-400 font-medium text-center py-4 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">No notes yet</p>
              ) : (
                notes.map((note) => (
                  <div key={note.id} className="rounded-xl bg-gradient-to-br from-yellow-50/50 to-orange-50/50 border border-yellow-100/50 p-4">
                    <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{note.content}</p>
                    <time className="mt-2 block text-xs font-medium text-yellow-800/60">
                      {formatDate(note.created_at)}
                    </time>
                  </div>
                ))
              )}
            </div>
          </section>

        </div>

        {/* Right Column */}
        <div className="space-y-6">
          
          {/* ── Follow-ups ── */}
          <section className="bg-white/70 backdrop-blur-xl rounded-2xl border border-gray-200/60 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Follow-ups</h2>
            
            <form onSubmit={handleScheduleFollowUp} className="flex flex-col gap-3 mb-6">
              <input
                type="date"
                value={dueDate}
                min={todayISO()}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={isPendingSchedule}
                className="w-full rounded-xl border border-gray-300/80 bg-white px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm transition-all"
              />
              {scheduleError && <p role="alert" className="text-xs font-medium text-red-600">{scheduleError}</p>}
              <button
                type="submit"
                disabled={isPendingSchedule}
                className="w-full rounded-xl bg-blue-100/80 text-blue-700 px-4 py-2.5 text-sm font-bold hover:bg-blue-200/80 transition-all disabled:opacity-60"
              >
                Schedule Task
              </button>
            </form>

            {incompleteFollowUps.length > 0 && (
              <ul className="space-y-3 mb-4">
                {incompleteFollowUps.map((fu) => (
                  <li key={fu.id} className="flex items-center justify-between rounded-xl bg-blue-50/50 border border-blue-100/50 p-3">
                    <time className="text-sm font-bold text-blue-900">
                      📅 {fu.due_date}
                    </time>
                    <button
                      onClick={() => handleCompleteFollowUp(fu.id)}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-white px-3 py-1.5 rounded-lg shadow-sm border border-blue-200/50 transition-all"
                    >
                      Done
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {completedFollowUps.length > 0 && (
              <details className="mt-2 group">
                <summary className="text-xs font-bold text-gray-400 cursor-pointer hover:text-gray-600 select-none list-none flex items-center gap-2">
                  <span className="w-4 h-4 bg-gray-100 rounded flex items-center justify-center group-open:rotate-90 transition-transform">▸</span>
                  {completedFollowUps.length} completed
                </summary>
                <ul className="mt-3 space-y-2">
                  {completedFollowUps.map((fu) => (
                    <li key={fu.id} className="flex items-center gap-2 text-sm text-gray-400 font-medium">
                      <span className="text-green-500">✓</span>
                      <time className="line-through decoration-gray-300">{fu.due_date}</time>
                    </li>
                  ))}
                </ul>
              </details>
            )}
            
            {followUps.length === 0 && (
              <p className="text-sm text-gray-400 font-medium text-center py-2">No follow-ups</p>
            )}
          </section>

          {/* ── Activity ── */}
          <section className="bg-white/70 backdrop-blur-xl rounded-2xl border border-gray-200/60 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">History</h2>
            {activities.length === 0 ? (
              <p className="text-sm text-gray-400 font-medium text-center py-2">No activity yet</p>
            ) : (
              <ol className="relative border-l-2 border-gray-100 space-y-5 ml-2 mt-2">
                {activities.map((activity) => (
                  <li key={activity.id} className="ml-5 relative">
                    <div className="absolute -left-[27px] flex items-center justify-center w-5 h-5 rounded-full bg-white border-2 border-gray-200 text-[10px] shadow-sm">
                      {ACTIVITY_ICONS[activity.type] ?? '•'}
                    </div>
                    <p className="text-sm text-gray-700 font-medium mb-1">
                      {activity.description}
                    </p>
                    <time className="text-xs font-semibold text-gray-400">
                      {formatDate(activity.created_at)}
                    </time>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {/* ── Danger Zone ── */}
          <section className="bg-red-50/30 rounded-2xl border border-red-100/50 p-6 mt-8">
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full text-center text-sm font-bold text-red-600 hover:text-red-700 transition-colors"
              >
                Delete Lead
              </button>
            ) : (
              <div className="space-y-4">
                <p className="text-sm font-medium text-red-800/80 text-center">
                  Permanently delete this lead?
                </p>
                {deleteError && <p className="text-xs font-medium text-red-600 text-center">{deleteError}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={handleDelete}
                    disabled={isPendingDelete}
                    className="flex-1 rounded-xl bg-red-600 text-sm font-bold text-white py-2 hover:bg-red-700 transition-colors disabled:opacity-60 shadow-sm shadow-red-500/20"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 rounded-xl bg-white border border-gray-200 text-sm font-bold text-gray-700 py-2 hover:bg-gray-50 transition-colors shadow-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </section>

        </div>
      </div>
    </div>
  )
}
