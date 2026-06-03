// app/leads/new/page.tsx
// New lead page — server component shell.

import NewLeadForm from './NewLeadForm'

export const metadata = {
  title: 'New Lead | FollowUp CRM',
}

export default function NewLeadPage() {
  return <NewLeadForm />
}
