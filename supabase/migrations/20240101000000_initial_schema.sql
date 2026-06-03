-- ============================================================
-- FollowUp CRM — Initial Schema Migration
-- Tables: profiles, leads, follow_ups, notes, activities
-- Includes: CHECK constraints, indexes, RLS policies, and
--           handle_new_user trigger for profiles auto-creation
-- Requirements: 1.9, 3.2, 4.6, 7.8, 10.1, 10.6
-- ============================================================

-- ------------------------------------------------------------
-- profiles
-- Stores user-facing profile data (name, business name, push
-- subscription). One row per auth.users row, enforced by the
-- primary key FK and the handle_new_user trigger.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id                UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name              TEXT        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  business_name     TEXT        NOT NULL CHECK (char_length(business_name) BETWEEN 1 AND 100),
  push_subscription JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their profile"
  ON public.profiles
  FOR ALL
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ------------------------------------------------------------
-- leads
-- Core lead record. status and source are enforced via CHECK
-- constraints that mirror the TypeScript union types exactly.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.leads (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  TEXT        NOT NULL,
  phone      TEXT        NOT NULL,
  email      TEXT,
  source     TEXT        NOT NULL
               CHECK (source IN ('WhatsApp','Instagram','Facebook','Referral','Other')),
  status     TEXT        NOT NULL DEFAULT 'New'
               CHECK (status IN ('New','Contacted','Interested','Negotiation','Won','Lost')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their leads"
  ON public.leads
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Composite index for sorted list queries (Req 3.4)
CREATE INDEX IF NOT EXISTS leads_user_id_created_at_idx
  ON public.leads (user_id, created_at DESC);

-- Composite index for status-filter queries (Req 3.5)
CREATE INDEX IF NOT EXISTS leads_user_id_status_idx
  ON public.leads (user_id, status);

-- ------------------------------------------------------------
-- follow_ups
-- Scheduled reminders. due_date is a plain DATE (no timezone)
-- because reminders are anchored to the user's local calendar
-- day. The partial index on incomplete follow-ups powers the
-- dashboard due-today / overdue queries efficiently.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.follow_ups (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id    UUID    NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id    UUID    NOT NULL REFERENCES auth.users(id)  ON DELETE CASCADE,
  due_date   DATE    NOT NULL,
  completed  BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their follow_ups"
  ON public.follow_ups
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Partial index: only incomplete follow-ups, ordered by date
-- (powers dashboard due-today / overdue queries, Req 2.3, 2.4)
CREATE INDEX IF NOT EXISTS follow_ups_user_date_idx
  ON public.follow_ups (user_id, due_date)
  WHERE completed = false;

-- Index for lead-scoped follow-up look-ups (Req 5.9)
CREATE INDEX IF NOT EXISTS follow_ups_lead_id_idx
  ON public.follow_ups (lead_id);

-- ------------------------------------------------------------
-- notes
-- Free-text notes attached to a lead. Content is limited to
-- 500 characters per Req 7.8 (stricter than Req 4.6 which
-- mentions 1000; 500 is used as the safe choice — confirm with
-- product owner before relaxing this constraint).
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id    UUID        NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES auth.users(id)  ON DELETE CASCADE,
  content    TEXT        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their notes"
  ON public.notes
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for chronological note list on lead detail page (Req 4.1)
CREATE INDEX IF NOT EXISTS notes_lead_id_idx
  ON public.notes (lead_id, created_at DESC);

-- ------------------------------------------------------------
-- activities
-- Immutable event log. Rows are never updated or deleted
-- except via ON DELETE CASCADE from the parent lead.
-- type values mirror the ActivityType TypeScript union.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.activities (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     UUID        NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES auth.users(id)  ON DELETE CASCADE,
  type        TEXT        NOT NULL
                CHECK (type IN ('created','updated','note','followup','message')),
  description TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their activities"
  ON public.activities
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for chronological activity list on lead detail page (Req 7.6)
CREATE INDEX IF NOT EXISTS activities_lead_id_idx
  ON public.activities (lead_id, created_at DESC);

-- ============================================================
-- handle_new_user trigger
--
-- Fires on every INSERT into auth.users.  Reads the `name` and
-- `business_name` values from the raw_user_meta_data JSONB
-- column that Supabase Auth stores during sign-up (supplied by
-- the client via the `data` option in signUp()).
--
-- If metadata keys are absent (e.g. social OAuth sign-up) the
-- trigger falls back to empty strings so the NOT NULL
-- constraint is satisfied and the profile row is still created.
-- The user can then complete their profile from the Settings page.
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, business_name)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''), 'User'),
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'business_name'), ''), 'My Business')
  );
  RETURN NEW;
END;
$$;

-- Drop trigger first so this migration is re-runnable in dev
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
