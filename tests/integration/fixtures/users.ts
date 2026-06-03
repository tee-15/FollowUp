/**
 * Test-user fixtures for RLS integration tests.
 *
 * These constants match the UUIDs and credentials seeded by
 * supabase/seed.sql. Import them in 17.1–17.3 tests so that
 * user IDs and credentials are defined in exactly one place.
 *
 * Requirements: 10.1, 10.6
 */

export const TEST_USER_A = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'test-user-a@example.com',
  password: 'password123',
  name: 'Test User A',
  businessName: 'Business A',
} as const

export const TEST_USER_B = {
  id: '00000000-0000-0000-0000-000000000002',
  email: 'test-user-b@example.com',
  password: 'password123',
  name: 'Test User B',
  businessName: 'Business B',
} as const
