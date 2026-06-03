// app/login/page.tsx
// Login page — server component shell that renders the LoginForm client component.
// Keeping the page itself as a server component allows future server-side
// metadata, redirect-if-already-authed logic, etc., without client overhead.

import LoginForm from './LoginForm'

export const metadata = {
  title: 'Sign in — FollowUp CRM',
}

export default function LoginPage() {
  return <LoginForm />
}
