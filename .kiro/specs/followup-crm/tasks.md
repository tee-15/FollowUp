# Implementation Plan: FollowUp CRM

## Overview

Implement the FollowUp CRM as a Next.js App Router PWA backed by Supabase. Tasks are sequenced so each step builds directly on the previous one — starting with project scaffolding and types, then the database layer, then feature-by-feature UI/server actions, and finally PWA wiring and integration tests. All code is TypeScript; property-based tests use `fast-check` with Vitest.

## Tasks

- [ ] 1. Project scaffolding and core types
  - Bootstrap a Next.js 14 App Router project with TypeScript, Tailwind CSS, and `next-pwa`
  - Install dependencies: `@supabase/ssr`, `@supabase/supabase-js`, `@dnd-kit/core`, `@dnd-kit/sortable`, `fast-check`, `vitest`, `@testing-library/react`, `@testing-library/user-event`
  - Create `lib/types.ts` with all TypeScript interfaces and union types (`Status`, `Source`, `ActivityType`, `Profile`, `Lead`, `FollowUp`, `Note`, `Activity`, `ActionResult<T>`)
  - Create `lib/supabase/server.ts` (exports `createServerClient` helper) and `lib/supabase/client.ts` (exports `createBrowserClient` helper)
  - Configure `vitest.config.ts` with jsdom environment and path aliases
  - _Requirements: 3.2, 10.1_

- [x] 2. Database schema and RLS policies
  - [x] 2.1 Write Supabase migration: `profiles`, `leads`, `follow_ups`, `notes`, `activities` tables with all `CHECK` constraints, indexes, and RLS policies as specified in the design
    - Include `handle_new_user` trigger that inserts a `profiles` row on `auth.users` INSERT
    - _Requirements: 1.9, 3.2, 4.6, 7.8, 10.1, 10.6_

  - [x] 2.2 Write Supabase migration: seed the local emulator with two test-user fixtures for RLS integration tests
    - _Requirements: 10.1, 10.6_

- [ ] 3. Authentication — server actions and pages
  - [x] 3.1 Implement `app/actions/auth.ts`: `registerUser`, `loginUser`, `logoutUser`, `updateProfile` server actions
    - Each action returns `ActionResult<T>`; validate all fields server-side before calling Supabase Auth
    - `registerUser` passes `name` and `business_name` as user metadata so the DB trigger can populate `profiles`
    - _Requirements: 1.1, 1.2, 1.3, 1.6, 1.9, 1.10, 10.5_

  - [x] 3.2 Implement `app/middleware.ts`: read session cookie via `createServerClient`; redirect unauthenticated requests to `/login` for all protected routes; return `401` for protected API routes without a session
    - _Requirements: 1.7, 1.8, 10.3, 10.4_

  - [ ] 3.3 Build `app/login/page.tsx` and `app/register/page.tsx` pages with client-side validation (email format, password 8–128 chars, name and business name non-empty); call auth server actions; render inline field errors from `ActionResult`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [-] 3.4 Build `app/settings/page.tsx` with `UpdateProfileForm` client component; calls `updateProfile` server action; re-renders updated values without full page reload
    - _Requirements: 1.10_

- [x] 4. WhatsApp link utility and property tests
  - [x] 4.1 Implement `lib/whatsapp.ts`: `buildWhatsAppLink(phone, businessName, leadFirstName)` — strip non-digits, validate 7–15 digit range, construct URL with `encodeURIComponent` message, handle absent `businessName`/`leadFirstName` per design spec
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 4.9_

  - [ ]* 4.2 Write property tests for `buildWhatsAppLink` (`lib/__tests__/whatsapp.property.test.ts`)
    - **Property 11: WhatsApp Link Construction**
    - **Validates: Requirements 8.1, 8.2, 8.5, 4.9**

- [x] 5. Lead management — server actions
  - [x] 5.1 Implement `app/actions/leads.ts`: `createLead`, `updateLead`, `deleteLead`, `updateLeadStatus` server actions
    - Each action validates inputs server-side, returns `ActionResult<T>`, and inserts the appropriate activity record via shared `insertActivity` helper
    - `createLead` always sets `status = "New"` regardless of input; `deleteLead` cascades via DB foreign keys
    - _Requirements: 3.1, 3.2, 3.6, 3.7, 3.8, 7.1, 7.2, 10.5_

  - [ ]* 5.2 Write property tests for lead logic (`lib/__tests__/leads.property.test.ts`)
    - **Property 5: New Lead Status Invariant**
    - **Validates: Requirements 3.1, 3.2**
    - **Property 6: Lead Status Filter Correctness**
    - **Validates: Requirements 3.5**

- [ ] 6. Leads list page and add-lead form
  - [-] 6.1 Build `app/leads/page.tsx` (RSC): fetch all leads sorted by `created_at DESC`, render `LeadsListClient` with status filter
    - `LeadsListClient` client component handles status filter state; filters leads client-side without page reload; shows next incomplete follow-up due date per lead
    - _Requirements: 3.4, 3.5_

  - [~] 6.2 Build `app/leads/new/page.tsx` and `AddLeadForm` client component: client-side validation (name and phone required, source selected); calls `createLead` server action with optimistic redirect to new lead detail page; renders error banner with Retry on `ActionResult.success === false`
    - _Requirements: 3.1, 3.3, 3.10_

- [x] 7. Notes and activity log — server actions and property tests
  - [x] 7.1 Implement `app/actions/notes.ts`: `addNote` server action — validate non-empty and ≤500 chars server-side, insert note, insert "note" activity; return `ActionResult<Note>`
    - _Requirements: 4.5, 4.7, 7.4, 7.8, 7.9, 10.5_

  - [ ]* 7.2 Write property tests for note validation (`lib/__tests__/notes.property.test.ts`)
    - **Property 7: Note Content Validation**
    - **Validates: Requirements 4.7, 7.9**

  - [ ]* 7.3 Write property tests for activity description format (`lib/__tests__/activities.property.test.ts`)
    - **Property 10: Activity Description Format**
    - **Validates: Requirements 7.2, 7.3**

- [ ] 8. Lead detail page
  - [~] 8.1 Build `app/leads/[id]/page.tsx` (RSC): fetch lead, notes, activities, follow-ups in parallel; pass to client sub-components; render lead fields (name, phone, email if present, source, status, created date)
    - _Requirements: 4.1, 4.2, 4.3_

  - [~] 8.2 Build `LeadStatusSelect` client component: inline status dropdown; calls `updateLeadStatus` server action; re-renders without page reload
    - Build `NoteEditor` client component: textarea with 500-char counter; calls `addNote` server action; shows inline error on rejection
    - _Requirements: 4.8, 4.5, 4.6, 4.7, 7.7_

  - [~] 8.3 Build `WhatsAppButton` client component: calls `buildWhatsAppLink`; opens `wa.me` URL in new tab on success; shows inline error on invalid phone; calls `logWhatsAppClick` server action on click
    - Implement `app/actions/leads.ts#logWhatsAppClick` server action
    - _Requirements: 4.2, 4.3, 4.4, 8.3, 8.4, 7.5_

- [ ] 9. Follow-up scheduling — server actions and property tests
  - [x] 9.1 Implement `app/actions/followups.ts`: `scheduleFollowUp`, `completeFollowUp` server actions
    - `scheduleFollowUp`: validate `due_date >= today` (client-local `YYYY-MM-DD`), insert follow-up with `completed = false`, return `ActionResult<FollowUp>`
    - `completeFollowUp`: set `completed = true`, insert "followup" activity with description `"Follow-up for {due_date} marked complete"`, return `ActionResult<FollowUp>`
    - _Requirements: 5.1, 5.3, 5.4, 5.5, 7.3, 10.5_

  - [ ]* 9.2 Write property tests for follow-up creation (`lib/__tests__/followups.property.test.ts`)
    - **Property 8: Follow-Up Creation Defaults and Date Validation**
    - **Validates: Requirements 5.1, 5.3**

  - [~] 9.3 Build `FollowUpScheduler` client component: preset buttons (1d, 3d, 7d from today) + date picker; client-side validation rejects past dates; calls `scheduleFollowUp`; stays open on failure with inline error and Retry
    - Build `FollowUpItem` client component: displays due date and completion status; "Mark complete" toggle calls `completeFollowUp`
    - Integrate both into `LeadDetailPage`; render all follow-ups in reverse-chronological order
    - _Requirements: 5.2, 5.3, 5.5, 5.9, 5.11_

- [~] 10. Checkpoint — core features wired
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Dashboard — metrics, follow-up lists, and property tests
  - [x] 11.1 Implement `lib/dashboard.ts`: pure functions for computing the five metrics and filtering due-today / overdue leads from in-memory lead and follow-up collections, using a caller-supplied `today: string` reference date
    - _Requirements: 2.1, 2.3, 2.4_

  - [ ]* 11.2 Write property tests for dashboard metric calculations (`lib/__tests__/dashboard.property.test.ts`)
    - **Property 1: Dashboard Metric Calculations**
    - **Validates: Requirements 2.1**
    - **Property 2: Follow-Up Due Today Filter**
    - **Validates: Requirements 2.3, 5.6**
    - **Property 3: Overdue Follow-Up Filter**
    - **Validates: Requirements 2.4, 5.7**

  - [~] 11.3 Build `app/dashboard/page.tsx` (RSC): fetch all metrics data in parallel with `Promise.all`; wrap each section in `<Suspense>` with skeleton placeholder; add error boundary with "Retry" button that calls `router.refresh()`
    - Render "Add New Lead" button (min 44×44 CSS px touch target)
    - Render due-today list (empty-state message when empty) and overdue section (conditionally hidden when empty)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [ ] 12. Notification badge — server-computed count and property tests
  - [x] 12.1 Implement `lib/badge.ts`: pure function `computeBadgeCount(followUps: FollowUp[], today: string): number` — returns count of records where `completed = false` AND `due_date <= today`
    - _Requirements: 5.8_

  - [ ]* 12.2 Write property tests for badge count (`lib/__tests__/badge.property.test.ts`)
    - **Property 4: Notification Badge Count**
    - **Validates: Requirements 5.8**

  - [~] 12.3 Build `NotificationBadge` client component: receives server-computed count as prop; renders badge only when count > 0; integrate into `BottomNav` and `SidebarNav`
    - _Requirements: 5.8_

- [ ] 13. Navigation components
  - [~] 13.1 Build `BottomNav` client component: visible at `<1024px`; links to Dashboard, Leads, Pipeline; renders `NotificationBadge`
    - Build `SidebarNav` client component: visible at `≥1024px`; links to Dashboard, Leads, Pipeline, Settings; renders `NotificationBadge`
    - Add responsive layout shell in `app/layout.tsx` that conditionally renders the appropriate nav based on viewport class
    - _Requirements: 9.3, 9.4_

- [ ] 14. Pipeline board (Kanban) — components and property tests
  - [x] 14.1 Implement `lib/pipeline.ts`: pure function `groupLeadsByStatus(leads: Lead[]): Record<Status, Lead[]>` that partitions leads into the six status buckets
    - _Requirements: 6.1, 6.3_

  - [ ]* 14.2 Write property tests for pipeline column badge count (`lib/__tests__/pipeline.property.test.ts`)
    - **Property 9: Pipeline Column Badge Count**
    - **Validates: Requirements 6.3**

  - [~] 14.3 Build `app/pipeline/page.tsx` (RSC): fetch all leads; pass to `PipelineBoard` client component
    - Build `PipelineBoard` client component (`use client`): wrap with `@dnd-kit/core` `DndContext`; hold optimistic column state in `useState`; on drag end call `updateLeadStatus` server action; on failure revert card and show toast error
    - Build `KanbanColumn` (`useDroppable`) and `LeadCard` (`useDraggable`) components
    - Each column header shows count badge (displays "0" when empty); each card shows name, phone, next incomplete follow-up due date
    - Apply visual highlight to active drop target column during drag
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

- [ ] 15. PWA setup and push notifications
  - [~] 15.1 Configure `next.config.ts` with `next-pwa` (Workbox); create `public/manifest.webmanifest` with app name, icons, `display: "standalone"`, theme and background colours; register Service Worker
    - _Requirements: 9.5_

  - [~] 15.2 Build `PushPermissionBanner` client component: prompts user to grant notification permission on first authenticated load; on grant, serialises `PushSubscription` to JSON and calls `updateProfile` server action to persist `push_subscription`
    - _Requirements: 5.10_

  - [~] 15.3 Implement Supabase Edge Function `send-followup-notifications`: query incomplete follow-ups where `due_date = CURRENT_DATE`; fan-out VAPID-signed Web Push messages to each user's stored subscription; schedule via Supabase Cron at 9:00 AM UTC
    - _Requirements: 5.10_

- [ ] 16. Responsive layout and accessibility polish
  - [~] 16.1 Audit all interactive controls on mobile viewport (320px–1023px): enforce minimum 44×44 CSS px touch targets on buttons, links, and form inputs using Tailwind utilities
    - Verify no horizontal scroll at any viewport width from 320px to 2560px
    - _Requirements: 9.1, 9.2_

  - [~] 16.2 Add `aria-label`, `role`, and keyboard navigation attributes to `PipelineBoard`, `BottomNav`, `SidebarNav`, and modal/drawer components; verify `@dnd-kit` accessibility announcements are wired (`announcements` prop on `DndContext`)
    - _Requirements: 9.3, 9.4_

- [ ] 17. RLS and integration tests
  - [ ]* 17.1 Write RLS integration tests (`tests/integration/rls.test.ts`): using Supabase local emulator, create two users; assert that queries by user A return zero records created by user B across all five tables
    - _Requirements: 10.1, 10.6_

  - [ ]* 17.2 Write auth flow integration test (`tests/integration/auth.test.ts`): register → login → session active → logout → session gone; assert middleware redirects to `/login` for protected routes after logout
    - _Requirements: 1.1, 1.4, 1.6, 1.7, 10.3_

  - [ ]* 17.3 Write database constraint tests (`tests/integration/constraints.test.ts`): assert that direct Supabase inserts with invalid `status`, `source`, oversized `content`, or missing required fields are rejected by `CHECK` constraints
    - _Requirements: 3.2, 7.8, 10.5_

- [~] 18. Final checkpoint — all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- All property tests use `fast-check` with `{ numRuns: 100 }` and the tag comment `// Feature: followup-crm, Property N: <property_text>`
- The 500-character note limit (Req 7.8) takes precedence over the conflicting 1000-character mention in Req 4.6; confirm with product owner before changing
- Push notifications (Task 15) require VAPID keys set as Supabase Edge Function secrets
- Supabase local emulator (`supabase start`) is required for integration tests in Tasks 17.1–17.3

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1", "2.2"] },
    { "id": 1, "tasks": ["3.1", "3.2", "4.1", "5.1", "7.1", "9.1", "11.1", "12.1", "14.1"] },
    { "id": 2, "tasks": ["3.3", "3.4", "4.2", "5.2", "6.1", "7.2", "7.3", "9.2", "11.2", "12.2", "14.2"] },
    { "id": 3, "tasks": ["6.2", "8.1", "8.2", "8.3", "9.3", "11.3", "12.3", "13.1", "14.3"] },
    { "id": 4, "tasks": ["15.1", "15.2", "15.3", "16.1", "16.2"] },
    { "id": 5, "tasks": ["17.1", "17.2", "17.3"] }
  ]
}
```
