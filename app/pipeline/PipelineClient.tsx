'use client'

// app/pipeline/PipelineClient.tsx
// Kanban pipeline board using @dnd-kit.
// Renders 6 status columns. Dragging a lead card calls updateLeadStatus.
// Optimistic UI: the card moves immediately; a server error reverts it.

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

const STATUS_HEADER_COLORS: Record<Status, string> = {
  New: 'bg-blue-600',
  Contacted: 'bg-yellow-500',
  Interested: 'bg-purple-600',
  Negotiation: 'bg-orange-500',
  Won: 'bg-green-600',
  Lost: 'bg-red-600',
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
      className={`rounded-lg bg-white border border-gray-200 p-3 shadow-sm cursor-grab active:cursor-grabbing select-none ${
        overlay ? 'shadow-lg rotate-1' : 'hover:shadow-md transition-shadow'
      }`}
    >
      <Link
        href={`/leads/${lead.id}`}
        onClick={(e) => e.stopPropagation()}
        className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
      >
        <p className="text-sm font-semibold text-gray-900 truncate">{lead.full_name}</p>
        <p className="text-xs text-gray-500 mt-0.5 truncate">{lead.phone}</p>
        {lead.source && (
          <p className="mt-1.5 text-xs text-gray-400">{lead.source}</p>
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

  return (
    <div className="flex flex-col min-w-[220px] w-[220px] shrink-0">
      {/* Column header */}
      <div className={`rounded-t-xl px-3 py-2 ${STATUS_HEADER_COLORS[status]}`}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-white">{status}</span>
          <span className="text-xs font-semibold text-white/80">{leads.length}</span>
        </div>
      </div>

      {/* Cards */}
      <div
        className="flex-1 rounded-b-xl bg-gray-100 border border-t-0 border-gray-200 p-2 min-h-[200px] space-y-2"
        data-column-status={status}
      >
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
        </SortableContext>

        {leads.length === 0 && (
          <div className="flex items-center justify-center h-20 rounded-lg border-2 border-dashed border-gray-300">
            <p className="text-xs text-gray-400">Drop here</p>
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

  // Find the lead being dragged (for DragOverlay)
  const activeLead = activeId
    ? Object.values(groups).flat().find((l) => l.id === activeId) ?? null
    : null

  // Find which column a lead id belongs to
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

    // Determine target column: over.id may be a lead id or a column status key
    let targetStatus: Status | null = null
    if (PIPELINE_STATUSES.includes(over.id as Status)) {
      targetStatus = over.id as Status
    } else {
      // over.id is another lead — find its column
      targetStatus = findLeadColumn(over.id as string)
    }

    if (!targetStatus || targetStatus === sourceStatus) return

    // Optimistic update
    const movedLead = groups[sourceStatus].find((l) => l.id === leadId)!
    const updatedLead: Lead = { ...movedLead, status: targetStatus }
    const prevGroups = { ...groups }

    setGroups((prev) => ({
      ...prev,
      [sourceStatus]: prev[sourceStatus].filter((l) => l.id !== leadId),
      [targetStatus]: [updatedLead, ...prev[targetStatus]],
    }))

    // Persist to server
    updateLeadStatus({ id: leadId, newStatus: targetStatus }).then((result) => {
      if (!result.success) {
        // Revert optimistic update
        setGroups(prevGroups)
        setErrorMsg(result.error)
      }
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between max-w-full">
          <h1 className="text-2xl font-bold text-gray-900">Pipeline</h1>
          <Link
            href="/leads/new"
            className="min-h-[44px] flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            + Add Lead
          </Link>
        </div>

        {errorMsg && (
          <div role="alert" className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
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
          <div className="flex gap-4 overflow-x-auto pb-6">
            {PIPELINE_STATUSES.map((status) => (
              <Column key={status} status={status} leads={groups[status]} />
            ))}
          </div>

          <DragOverlay>
            {activeLead ? <LeadCard lead={activeLead} overlay /> : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  )
}
