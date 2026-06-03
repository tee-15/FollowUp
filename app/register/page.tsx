// app/register/page.tsx
// Registration page — server component shell that renders the RegisterForm client component.
// Keeping the page itself as a server component allows future server-side
// metadata, redirect-if-already-authed logic, etc., without client overhead.

import RegisterForm from './RegisterForm'

export const metadata = {
  title: 'Create account — FollowUp CRM',
}

export default function RegisterPage() {
  return <RegisterForm />
}
