# Design Document: FollowUp CRM

## Overview

FollowUp CRM is a lightweight, mobile-first Progressive Web App (PWA) that enables small business owners to track leads through a sales pipeline, schedule follow-up reminders, and initiate WhatsApp contact in one click. The primary design goal is **speed** — adding a lead in under 10 seconds and surfacing exactly who to contact each day on the dashboard.

### Key Design Decisions

- **Next.js App Router** (React Server Components + Server Actions) reduces round-trips by co-locating data fetching with UI rendering, enabling fast server-side rendering with no client-side waterfall.
- **Supabase** provides Auth, PostgreSQL, and Row-Level Security (RLS) as a single managed backend — eliminating a separate API layer for simple CRUD while enforcing per-user data isolation at the database level.
- **Optimistic UI** for lead creation and status updates makes the experience feel instant on mobile networks.
- **`@dnd-kit/core`** is used for the Kanban board. It is actively maintained, accessibility-first, and integrates cleanly with React 18+ and TypeScript — unlike `react-beautiful-dnd` which is no longer maintained.
- **Notifications** are delivered via the Web Push API (VAPID) from a Next.js API route, triggered by a scheduled Supabase Edge Function running daily at 9:00 AM UTC offset by user timezone.
- **`next-pwa`** (Workbox-based) handles the Service Worker registration and manifest wiring for PWA installability.

---

## Architecture

The application follows a **layered architecture** within a Next.js monolith deployed on Vercel:

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (Browser / PWA)                   │
│  React Server Components  │  Client Components  │  Service Worker│
└────────────────┬──────────────────┬─────────────────────────────┘
                 │ RSC requests      │ Client mutations (Server Actions)
                 ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js App Router (Vercel)                  │
│  app/  route handlers │  Server Actions  │  API Routes          │
│  (Data fetching via Supabase server client)                     │
└────────────────────────────┬────────────────────────────────────┘
                             │ Supabase JS (server-side)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Supabase                                │
│  Auth (JWT sessions)  │  PostgreSQL + RLS  │  Edge Functions    │
└─────────────────────────────────────────────────────────────────┘
```

### Supabase Client Strategy

Following the Supabase/Next.js recommended pattern, two distinct clients are used:

| Context | Client | Notes |
|---|---|---|
| Server Components, Server Actions | `createServerClient` (from `@supabase/ssr`) | Reads session from cookies; respects RLS |
| Client Components (interactive mutations) | `createBrowserClient` | Used only for auth state listener and real-time if needed |
| Push scheduler (Edge Function) | `createClient` with service role key | Bypasses RLS intentionally to fan-out push notifications |

HTTPS is enforced at the Vercel platform level — all HTTP requests are redirected to HTTPS automatically.

### Navigation Structure

```
/               → redirect to /dashboard (if authenticated) or /login
/login          → Auth_Service login form
/register       → Auth_Service registration form
/dashboard      → Dashboard Overview
/leads          → Leads List
/leads/new      → Add Lead form
/leads/[id]     → Lead Detail Page
/pipeline       → Pipeline Board (Kanban)
/settings       → User profile settings
```

### Routing & Auth Guard

A Next.js `middleware.ts` at the root intercepts every request. It reads the session cookie via `createServerClient`. If the session is absent or expired and the route is not `/login` or `/register`, it redirects to `/login` within the same server response — satisfying the ≤1 second redirect requirement (Req 10.3) before any page renders.

---

## Components and Interfaces

### Page Components (React Server Components by default)

| Component | Path | Responsibility |
|---|---|---|
| `DashboardPage` | `app/dashboard/page.tsx` | Fetches and renders all 5 metrics + follow-up lists |
| `LeadsPage` | `app/leads/page.tsx` | Server-renders leads list with status filter |
| `NewLeadPage` | `app/leads/new/page.tsx` | Add Lead form shell |
| `LeadDetailPage` | `app/leads/[id]/page.tsx` | Full lead detail, notes, activities, follow-ups |
| `PipelinePage` | `app/pipeline/page.tsx` | Fetches all leads for Kanban board |
| `SettingsPage` | `app/settings/page.tsx` | Profile update form |

### Client Components (Interactive Islands)

| Component | Responsibility |
|---|---|
| `AddLeadForm` | Controlled form with client-side validation; calls `createLead` Server Action with optimistic redirect |
| `LeadStatusSelect` | Inline status selector on lead detail; calls `updateLeadStatus` Server Action |
| `NoteEditor` | Textarea + submit; calls `addNote` Server Action with client-side character count |
| `FollowUpScheduler` | Modal/drawer with preset buttons (1d, 3d, 7d) and date picker; calls `scheduleFollowUp` Server Action |
| `FollowUpItem` | Single follow-up row with "Mark complete" toggle |
| `PipelineBoard` | `use client` wrapper with `@dnd-kit/core` DndContext; holds optimistic status for all lead cards |
| `KanbanColumn` | `useDroppable` container for a single status column |
| `LeadCard` | `useDraggable` card inside a column |
| `NotificationBadge` | Client component polling (or subscribing to Supabase Realtime) for today+overdue count |
| `BottomNav` | Visible on `<1024px`; links to Dashboard, Leads, Pipeline |
| `SidebarNav` | Visible on `≥1024px`; links to Dashboard, Leads, Pipeline, Settings |
| `WhatsAppButton` | Constructs and opens wa.me link; logs activity on click |
| `PushPermissionBanner` | Prompt to grant browser notification permission |

### Server Actions

Server Actions are co-located in `app/actions/` and called directly from Client Components. Each action uses the server-side Supabase client (session from cookie) — RLS enforces ownership automatically.

| Action | Parameters | Behaviour |
|---|---|---|
| `createLead` | `{ name, phone, email?, source }` | Validates required fields; inserts lead; inserts "created" activity; returns new lead id |
| `updateLead` | `{ id, ...fields }` | Updates lead record; inserts "updated" activity |
| `deleteLead` | `{ id }` | Deletes lead cascade; redirects to `/leads` |
| `updateLeadStatus` | `{ id, newStatus }` | Updates status; inserts "updated" activity with prev/new values |
| `addNote` | `{ leadId, content }` | Validates length (≤500 chars) and non-empty; inserts note; inserts "note" activity |
| `scheduleFollowUp` | `{ leadId, dueDate }` | Validates date ≥ today; inserts follow-up record |
| `completeFollowUp` | `{ followUpId }` | Sets `completed = true`; inserts "followup" activity |
| `updateProfile` | `{ name, businessName }` | Validates lengths; upserts into `profiles` table |
| `logWhatsAppClick` | `{ leadId }` | Inserts "message" activity |

### WhatsApp Link Utility

A pure TypeScript utility (`lib/whatsapp.ts`) is responsible for link construction:

```typescript
export function buildWhatsAppLink(
  phone: string,
  businessName: string | null,
  leadFirstName: string | null
): { url: string; valid: boolean; error?: string }
```

- Strips all non-digit characters from `phone`
- Returns `valid: false` if digit count < 7 or > 15
- Constructs template: `"Hi {firstName}, this is {businessName}."` — omitting absent values
- URL-encodes the message with `encodeURIComponent`
- Returns the fully-formed `https://wa.me/{digits}?text={encoded}` URL

---

## Data Models

All tables live in the Supabase `public` schema with RLS enabled. The `user_id` column on every table references `auth.users(id)` and drives the RLS `USING` expression `(auth.uid() = user_id)`.

### `profiles`

Stores the user-facing profile data not held in `auth.users`.

```sql
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  business_name TEXT NOT NULL CHECK (char_length(business_name) BETWEEN 1 AND 100),
  push_subscription JSONB,          -- Web Push subscription object
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their profile"
  ON profiles FOR ALL
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
```

A `handle_new_user` trigger function fires on `INSERT` to `auth.users` and inserts a corresponding row into `profiles` using the `name` and `business_name` values passed as user metadata at registration.

### `leads`

Core lead record.

```sql
CREATE TABLE leads (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name    TEXT NOT NULL,
  phone        TEXT NOT NULL,
  email        TEXT,
  source       TEXT NOT NULL CHECK (source IN ('WhatsApp','Instagram','Facebook','Referral','Other')),
  status       TEXT NOT NULL DEFAULT 'New'
                CHECK (status IN ('New','Contacted','Interested','Negotiation','Won','Lost')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their leads"
  ON leads FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX leads_user_id_created_at_idx ON leads (user_id, created_at DESC);
CREATE INDEX leads_user_id_status_idx     ON leads (user_id, status);
```

### `follow_ups`

Scheduled reminders for a lead.

```sql
CREATE TABLE follow_ups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  due_date    DATE NOT NULL,         -- stored as calendar date (no time component)
  completed   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their follow_ups"
  ON follow_ups FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX follow_ups_user_date_idx ON follow_ups (user_id, due_date)
  WHERE completed = false;
CREATE INDEX follow_ups_lead_id_idx   ON follow_ups (lead_id);
```

> The `due_date` is stored as a plain `DATE` (no timezone) because reminder semantics are anchored to the user's local calendar day. The client sends a `YYYY-MM-DD` string derived from the user's local date, avoiding server timezone conversion issues.

### `notes`

Free-text notes attached to a lead.

```sql
CREATE TABLE notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content     TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their notes"
  ON notes FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX notes_lead_id_idx ON notes (lead_id, created_at DESC);
```

> Note: Requirement 7.8 sets the limit at 500 characters, while Requirement 4.6 states 1000 characters. The `notes` table enforces the stricter 500-character constraint from Requirement 7.8. The UI will enforce 500 characters as well. This discrepancy should be confirmed with the product owner; in the meantime, 500 is used as the safe choice.

### `activities`

Immutable event log for a lead.

```sql
CREATE TABLE activities (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL
                CHECK (type IN ('created','updated','note','followup','message')),
  description TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their activities"
  ON activities FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX activities_lead_id_idx ON activities (lead_id, created_at DESC);
```

### Entity Relationship Diagram

```mermaid
erDiagram
  auth_users {
    uuid id PK
    text email
  }
  profiles {
    uuid id PK FK
    text name
    text business_name
    jsonb push_subscription
    timestamptz created_at
  }
  leads {
    uuid id PK
    uuid user_id FK
    text full_name
    text phone
    text email
    text source
    text status
    timestamptz created_at
    timestamptz updated_at
  }
  follow_ups {
    uuid id PK
    uuid lead_id FK
    uuid user_id FK
    date due_date
    boolean completed
    timestamptz created_at
  }
  notes {
    uuid id PK
    uuid lead_id FK
    uuid user_id FK
    text content
    timestamptz created_at
  }
  activities {
    uuid id PK
    uuid lead_id FK
    uuid user_id FK
    text type
    text description
    timestamptz created_at
  }

  auth_users ||--|| profiles : "has"
  auth_users ||--o{ leads : "owns"
  leads ||--o{ follow_ups : "has"
  leads ||--o{ notes : "has"
  leads ||--o{ activities : "has"
```

### TypeScript Types

```typescript
// lib/types.ts

export type Status = 'New' | 'Contacted' | 'Interested' | 'Negotiation' | 'Won' | 'Lost'
export type Source = 'WhatsApp' | 'Instagram' | 'Facebook' | 'Referral' | 'Other'
export type ActivityType = 'created' | 'updated' | 'note' | 'followup' | 'message'

export interface Profile {
  id: string
  name: string
  business_name: string
  push_subscription: PushSubscriptionJSON | null
  created_at: string
}

export interface Lead {
  id: string
  user_id: string
  full_name: string
  phone: string
  email: string | null
  source: Source
  status: Status
  created_at: string
  updated_at: string
}

export interface FollowUp {
  id: string
  lead_id: string
  user_id: string
  due_date: string       // 'YYYY-MM-DD'
  completed: boolean
  created_at: string
}

export interface Note {
  id: string
  lead_id: string
  user_id: string
  content: string
  created_at: string
}

export interface Activity {
  id: string
  lead_id: string
  user_id: string
  type: ActivityType
  description: string
  created_at: string
}
```

### PWA / Notification Architecture

The push notification flow:

1. On first authenticated load, `PushPermissionBanner` prompts the user.
2. If granted, the browser generates a `PushSubscription` object.
3. A client-side call updates `profiles.push_subscription` via Server Action.
4. A **Supabase Edge Function** (`send-followup-notifications`) runs daily at 9:00 AM UTC via a `pg_cron` job (or Supabase Cron). It:
   - Queries all incomplete follow-ups where `due_date = CURRENT_DATE` (UTC — acceptable because the 9 AM trigger is a best-effort delivery window, not exact per-user timezone scheduling, which is an acknowledged tradeoff).
   - Fans out Web Push messages to the stored subscription using the VAPID-signed Web Push Protocol.
5. The Service Worker (registered by `next-pwa`) receives the push event and calls `self.registration.showNotification(...)`.

The in-app badge count is computed server-side on each dashboard load. For real-time badge updates without polling, an optional Supabase Realtime subscription on `follow_ups` can be added in a later iteration.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the software is supposed to do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Dashboard Metric Calculations

*For any* collection of a user's leads, follow-ups, and a reference "today" date, the five dashboard metrics (total leads, follow-ups due today, new leads in past 7 days, Won count, Lost count) must each independently equal the count of records that satisfy their respective filter predicates applied to that collection.

**Validates: Requirements 2.1**

### Property 2: Follow-Up Due Today Filter

*For any* collection of leads with associated follow-up records, the "due today" section must contain exactly the set of leads that have at least one incomplete follow-up whose `due_date` equals the reference local date — no more, no less.

**Validates: Requirements 2.3, 5.6**

### Property 3: Overdue Follow-Up Filter

*For any* collection of leads with associated follow-up records and a reference "today" date, the "overdue" section must contain exactly the set of leads that have at least one incomplete follow-up whose `due_date` is strictly before the reference local date — no more, no less.

**Validates: Requirements 2.4, 5.7**

### Property 4: Notification Badge Count

*For any* collection of follow-up records, the notification badge count must equal the number of records where `completed = false` AND `due_date <= today`. If that count is zero, no badge is displayed.

**Validates: Requirements 5.8**

### Property 5: New Lead Status Invariant

*For any* valid lead creation input (non-empty name and phone, valid source), the created lead record must always have `status = "New"` regardless of any other input values, and must persist exactly the submitted field values.

**Validates: Requirements 3.1, 3.2**

### Property 6: Lead Status Filter Correctness

*For any* status value and *for any* collection of leads, applying a status filter must return exactly the sub-collection of leads whose `status` field matches the selected value — every matching lead is included and no non-matching lead is included.

**Validates: Requirements 3.5**

### Property 7: Note Content Validation

*For any* string composed entirely of whitespace characters (including the empty string), submitting it as a note must be rejected and no note or activity record must be created.

*For any* string whose character length exceeds 500, submitting it as a note must be rejected and no note or activity record must be created.

**Validates: Requirements 4.7, 7.9**

### Property 8: Follow-Up Creation Defaults and Date Validation

*For any* follow-up creation with a `due_date` that is on or after the user's current local calendar date, the created `follow_up` record must have `completed = false`.

*For any* date that is strictly before the user's current local calendar date, a follow-up creation attempt with that date must be rejected and no record created.

**Validates: Requirements 5.1, 5.3**

### Property 9: Pipeline Column Count Badge

*For any* collection of leads distributed across statuses, the count badge displayed on each Kanban column header must equal the exact number of leads whose `status` field matches that column's label.

**Validates: Requirements 6.3**

### Property 10: Activity Description Format

*For any* valid `(previous_status, new_status)` pair, the activity record generated on a status change must have a description that exactly matches the format `"Status changed from {previous_status} to {new_status}"`.

*For any* valid `due_date` string, the activity record generated when a follow-up is marked complete must have a description that exactly matches the format `"Follow-up for {due_date} marked complete"`.

**Validates: Requirements 7.2, 7.3**

### Property 11: WhatsApp Link Construction

*For any* phone string, the `buildWhatsAppLink` utility must strip all non-digit characters before embedding the phone in the URL, such that the phone segment of the resulting URL contains only the digits that appeared in the original string.

*For any* phone string yielding fewer than 7 or more than 15 digits after stripping, `buildWhatsAppLink` must return `valid: false`.

*For any* phone string yielding between 7 and 15 digits (inclusive) after stripping, `buildWhatsAppLink` must return `valid: true` and produce a URL beginning with `https://wa.me/`.

*For any* combination of present/absent `businessName` and `leadFirstName`, the message template embedded in the URL must include each available value and omit missing values without producing a malformed URL.

**Validates: Requirements 8.1, 8.2, 8.5, 4.9**

---

## Error Handling

### Client-Side Validation (Before Server Round-Trip)

All forms perform client-side validation before invoking Server Actions to give immediate feedback without a network round-trip:

| Form | Client Validations |
|---|---|
| Add Lead | `name` non-empty, `phone` non-empty, `source` selected |
| Add Note | content non-empty and ≤ 500 chars |
| Schedule Follow-Up | date ≥ today |
| Registration | email format, password 8–128 chars, name and business name non-empty |
| Profile Update | name and business name 1–100 chars |

### Server Action Error Handling

Every Server Action returns a discriminated union result type:

```typescript
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; fields?: Record<string, string> }
```

Client Components check `result.success` and render inline error messages from `result.error` / `result.fields`. No errors are swallowed silently.

### Optimistic Updates and Rollback

- **Lead creation**: The client redirects optimistically to the new lead's detail page after submitting. If the server action returns `success: false`, the detail page renders an error banner with a Retry action (Req 3.10).
- **Kanban drag-and-drop**: The card's column is updated immediately in React state (optimistic). If the Server Action fails, the card is moved back to its original column and a toast error is shown (Req 6.6).
- **Follow-Up scheduling**: The form stays open until the server confirms success. On failure, the error is shown inline with a Retry button (Req 5.5).

### Loading and Empty States

- Each dashboard section renders a `<Suspense>` boundary with a skeleton placeholder while data is fetching (Req 2.5).
- If any dashboard fetch throws, an error boundary catches it and renders a single error message with a "Retry" button that triggers a `router.refresh()` (Req 2.6).
- Empty state messages are rendered for the follow-up list when no leads are due today (Req 2.3).
- The Overdue section is conditionally rendered and only mounts when overdue count > 0 (Req 2.4).

### Session Expiry

The `middleware.ts` checks the Supabase session on every request. If expired or absent:
- Server-side navigation: responds with a redirect to `/login` immediately (< 1 RTT, satisfying Req 10.3).
- Client-side navigation: `useEffect` in the root layout listens to Supabase `onAuthStateChange`; on `SIGNED_OUT` it calls `router.push('/login')`.
- API routes return `401` for expired sessions (Req 1.7).

---

## Testing Strategy

### Overview

The testing approach combines **unit tests**, **property-based tests**, and **integration tests**. Property-based tests are appropriate here because the core application logic — data filtering, URL construction, validation, activity description formatting, and aggregation — consists of pure or near-pure functions with clear input/output contracts where input variation reveals bugs.

### Property-Based Testing

**Library**: [`fast-check`](https://fast-check.dev/) — the leading JavaScript/TypeScript PBT library with excellent TypeScript support and Vitest integration.

**Configuration**: Each property test runs a minimum of **100 iterations** (fast-check default is 100; configured explicitly via `{ numRuns: 100 }` in each `fc.assert`).

**Tag format**: Each property test is tagged with a comment:
```
// Feature: followup-crm, Property N: <property_text>
```

**Scope**: Property tests cover the pure logic functions and data-transformation utilities that implement the correctness properties defined in this document. UI components use snapshot/example-based tests instead.

| Property | Test File | What is generated |
|---|---|---|
| P1: Dashboard metrics | `lib/__tests__/dashboard.property.test.ts` | Arrays of random leads with varying statuses, creation dates, and follow-up collections |
| P2: Due today filter | `lib/__tests__/dashboard.property.test.ts` | Arrays of follow-up records with random dates and completion states |
| P3: Overdue filter | `lib/__tests__/dashboard.property.test.ts` | Same as P2 |
| P4: Badge count | `lib/__tests__/badge.property.test.ts` | Arrays of follow-up records with random dates/completion states |
| P5: New lead defaults | `lib/__tests__/leads.property.test.ts` | Valid lead creation inputs (random names, phones, sources) |
| P6: Status filter | `lib/__tests__/leads.property.test.ts` | Random lead arrays + random status values |
| P7: Note validation | `lib/__tests__/notes.property.test.ts` | Whitespace strings; strings with length > 500 |
| P8: Follow-up creation | `lib/__tests__/followups.property.test.ts` | Valid future dates; past dates |
| P9: Column badge count | `lib/__tests__/pipeline.property.test.ts` | Random lead arrays distributed across statuses |
| P10: Activity format | `lib/__tests__/activities.property.test.ts` | All combinations of valid Status values |
| P11: WhatsApp link | `lib/__tests__/whatsapp.property.test.ts` | Random phone strings with varying digit counts and non-digit noise |

### Unit Tests

Vitest + React Testing Library for component tests.

- **Focus**: Specific examples, edge cases, and integration points between components.
- **Coverage targets**: All Server Actions, all validation functions, `buildWhatsAppLink`, activity description generators.
- Example tests: Registration form renders errors on empty submit; Kanban renders 6 columns; lead detail shows WhatsApp button only when phone is present.

### Integration Tests

- **RLS policy verification**: Using Supabase's local emulator (`supabase start`), tests create two users and verify that queries by user A never return records created by user B (Req 10.1, 10.6).
- **Auth flow**: End-to-end test for register → login → session → logout via Supabase local emulator.
- **Database constraints**: Tests verify `CHECK` constraints on `status`, `source`, and character length fields reject invalid inserts.

### End-to-End Tests

Playwright tests for critical user journeys:
1. Register → Login → Add Lead → View Lead Detail
2. Schedule Follow-Up → Dashboard shows it → Mark Complete → Badge count updates
3. Drag lead card on Pipeline Board → Status persists after page reload
4. WhatsApp button opens correct URL

### Accessibility and Performance

- **Lighthouse CI** (via `@lhci/cli`) runs on every PR preview deployment targeting Performance ≥ 80 on mobile (Req 9.6).
- **axe-core** integrated with Playwright for automated accessibility checks on all primary pages.
- Manual keyboard navigation testing for the Kanban board drag-and-drop interactions (required for screen reader compatibility with `@dnd-kit`'s accessibility announcements).
