'use client'

import { useState, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Link from 'next/link'
import type { Lead, Status } from '@/lib/types'
import { PIPELINE_STATUSES, groupLeadsByStatus } from '@/lib/pipeline'
import { updateLeadStatus } from '@/app/actions/leads'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PipelineClientProps {
  initialLeads: Lead[]
}

const STATUS_THEMES: Record<Status, { bg: string; text: string; ring: string }> = {
  New: { bg: 'bg-blue-50', text: 'text-blue-700', ring: 'ring-blue-500/20' },
  Contacted: { bg: 'bg-yellow-50', text: 'text-yellow-700', ring: 'ring-yellow-500/20' },
  Interested: { bg: 'bg-purple-50', text: 'text-purple-700', ring: 'ring-purple-500/20' },
  Negotiation: { bg: 'bg-orange-50', text: 'text-orange-700', ring: 'ring-orange-500/20' },
  Won: { bg: 'bg-green-50', text: 'text-green-700', ring: 'ring-green-500/20' },
  Lost: { bg: 'bg-red-50', text: 'text-red-700', ring: 'ring-red-500/20' },
}

// ---------------------------------------------------------------------------
// Sortable card
// ---------------------------------------------------------------------------

function LeadCard({ lead, overlay = false }: { lead: Lead; overlay?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
    data: { status: lead.status },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`relative group rounded-xl bg-white border border-gray-200/60 p-4 cursor-grab active:cursor-grabbing select-none transition-all duration-200 ${
        overlay ? 'shadow-2xl rotate-2 scale-105 ring-2 ring-blue-500/30' : 'shadow-sm hover:shadow-md hover:border-gray-300'
      }`}
    >
      <Link
        href={`/leads/${lead.id}`}
        onClick={(e) => e.stopPropagation()}
        className="block focus:outline-none"
      >
        <p className="text-sm font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
          {lead.full_name}
        </p>
        <p className="text-xs text-gray-500 mt-1 truncate">{lead.phone}</p>
        {lead.source && (
          <div className="mt-3">
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
              {lead.source}
            </span>
          </div>
        )}
      </Link>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Column
// ---------------------------------------------------------------------------

function Column({ status, leads }: { status: Status; leads: Lead[] }) {
  const cardIds = leads.map((l) => l.id)
  const theme = STATUS_THEMES[status]

  return (
    <div className="flex flex-col min-w-[280px] w-[280px] shrink-0 bg-gray-100/50 rounded-2xl border border-gray-200/50 backdrop-blur-sm overflow-hidden">
      {/* Column header */}
      <div className={`px-4 py-3 border-b border-gray-200/50 bg-white/50 backdrop-blur-md`}>
        <div className="flex items-center justify-between">
          <span className={`text-sm font-bold ${theme.text}`}>{status}</span>
          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ring-1 ring-inset ${theme.bg} ${theme.text} ${theme.ring}`}>
            {leads.length}
          </span>
        </div>
      </div>

      {/* Cards */}
      <div
        className="flex-1 p-3 min-h-[300px] space-y-3"
        data-column-status={status}
      >
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
        </SortableContext>

        {leads.length === 0 && (
          <div className="flex items-center justify-center h-24 rounded-xl border-2 border-dashed border-gray-300/50 bg-gray-50/50">
            <p className="text-xs font-medium text-gray-400">Drop leads here</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function PipelineClient({ initialLeads }: PipelineClientProps) {
  const [groups, setGroups] = useState<Record<Status, Lead[]>>(
    groupLeadsByStatus(initialLeads)
  )
  const [activeId, setActiveId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const activeLead = activeId
    ? Object.values(groups).flat().find((l) => l.id === activeId) ?? null
    : null

  const findLeadColumn = useCallback(
    (leadId: string): Status | null => {
      for (const status of PIPELINE_STATUSES) {
        if (groups[status].some((l) => l.id === leadId)) return status
      }
      return null
    },
    [groups]
  )

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
    setErrorMsg(null)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const leadId = active.id as string
    const sourceStatus = findLeadColumn(leadId)
    if (!sourceStatus) return

    let targetStatus: Status | null = null
    if (PIPELINE_STATUSES.includes(over.id as Status)) {
      targetStatus = over.id as Status
    } else {
      targetStatus = findLeadColumn(over.id as string)
    }

    if (!targetStatus || targetStatus === sourceStatus) return

    const movedLead = groups[sourceStatus].find((l) => l.id === leadId)!
    const updatedLead: Lead = { ...movedLead, status: targetStatus }
    const prevGroups = { ...groups }

    setGroups((prev) => ({
      ...prev,
      [sourceStatus]: prev[sourceStatus].filter((l) => l.id !== leadId),
      [targetStatus]: [updatedLead, ...prev[targetStatus]],
    }))

    updateLeadStatus({ id: leadId, newStatus: targetStatus }).then((result) => {
      if (!result.success) {
        setGroups(prevGroups)
        setErrorMsg(result.error)
      }
    })
  }

  return (
    <div className="h-full px-4 py-8 lg:px-8 max-w-[100vw]">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Pipeline</h1>
        <Link
          href="/leads/new"
          className="inline-flex items-center justify-center min-h-[44px] px-6 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-sm font-bold text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-[1.02] transition-all"
        >
          + Add Lead
        </Link>
      </div>

      {errorMsg && (
        <div role="alert" className="mb-6 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {/* Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-6 overflow-x-auto pb-8 snap-x snap-mandatory">
          {PIPELINE_STATUSES.map((status) => (
            <div key={status} className="snap-start">
              <Column status={status} leads={groups[status]} />
            </div>
          ))}
        </div>

        <DragOverlay>
          {activeLead ? <LeadCard lead={activeLead} overlay /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
