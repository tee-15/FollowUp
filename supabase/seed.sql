-- ============================================================
-- Seed file: test-user fixtures for RLS integration tests
-- ============================================================
-- Creates two deterministic test users in the local Supabase
-- emulator so that tasks 17.1–17.3 can verify that user A
-- cannot access user B's records across all five tables.
--
-- Requirements: 10.1, 10.6
--
-- These UUIDs are fixed so integration tests can reference
-- them by constant rather than querying the database.
--
-- test_user_a: 00000000-0000-0000-0000-000000000001
-- test_user_b: 00000000-0000-0000-0000-000000000002
-- ============================================================

-- ----------------------------------------------------------------
-- 1. Insert test users into auth.users
-- ----------------------------------------------------------------
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
)
VALUES
  -- test_user_a
  (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'test-user-a@example.com',
    -- bcrypt hash of 'password123' (12 rounds) — safe for local emulator only
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VK2PsW1Pm',
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"name": "Test User A", "business_name": "Business A"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  -- test_user_b
  (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'test-user-b@example.com',
    -- bcrypt hash of 'password123' (12 rounds) — safe for local emulator only
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VK2PsW1Pm',
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"name": "Test User B", "business_name": "Business B"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  )
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------
-- 2. Insert identities so Supabase Auth recognises the credentials
-- ----------------------------------------------------------------
INSERT INTO auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
VALUES
  -- identity for test_user_a
  (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'test-user-a@example.com',
    '{"sub": "00000000-0000-0000-0000-000000000001", "email": "test-user-a@example.com"}'::jsonb,
    'email',
    now(),
    now(),
    now()
  ),
  -- identity for test_user_b
  (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000002',
    'test-user-b@example.com',
    '{"sub": "00000000-0000-0000-0000-000000000002", "email": "test-user-b@example.com"}'::jsonb,
    'email',
    now(),
    now(),
    now()
  )
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------
-- 3. Insert profiles rows
--    (The handle_new_user trigger fires on INSERT to auth.users
--     but only when the application migration has run first.
--     These explicit inserts ensure profiles exist even when
--     running seed.sql in isolation, e.g. during CI.)
-- ----------------------------------------------------------------
INSERT INTO public.profiles (id, name, business_name, created_at)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'Test User A',
    'Business A',
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'Test User B',
    'Business B',
    now()
  )
ON CONFLICT (id) DO NOTHING;
