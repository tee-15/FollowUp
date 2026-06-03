// lib/whatsapp.ts
// WhatsApp link construction utility for FollowUp CRM

export interface WhatsAppLinkResult {
  url: string
  valid: boolean
  error?: string
}

/**
 * Builds a wa.me deep-link for one-click WhatsApp messaging.
 *
 * @param phone        - Raw phone string from the lead record (may contain spaces, dashes, +, etc.)
 * @param businessName - The user's business name, or null/undefined if not set
 * @param leadFirstName - The lead's first name (first whitespace-delimited token of full_name),
 *                        or null/undefined if not available
 *
 * @returns A result object with:
 *   - `valid: true`  and the fully-formed URL when the phone is valid (7–15 digits after stripping)
 *   - `valid: false` and an error message when the phone digit count is out of range
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 4.9
 */
export function buildWhatsAppLink(
  phone: string,
  businessName: string | null | undefined,
  leadFirstName: string | null | undefined
): WhatsAppLinkResult {
  // Strip all non-digit characters (Req 8.1)
  const digits = phone.replace(/\D/g, '')

  // Validate digit count: must be between 7 and 15 inclusive (Req 8.2)
  if (digits.length < 7 || digits.length > 15) {
    return {
      url: '',
      valid: false,
      error: `Phone number must contain between 7 and 15 digits (found ${digits.length}).`,
    }
  }

  // Build the message template, omitting absent values (Req 8.5, Req 4.9)
  const message = buildMessageTemplate(businessName, leadFirstName)

  // Construct the final URL (Req 8.1, 8.3)
  const url = `https://wa.me/${digits}?text=${encodeURIComponent(message)}`

  return { url, valid: true }
}

/**
 * Constructs the pre-filled message template.
 *
 * Rules (Req 8.5, 4.9):
 *   - Include lead's first name if available:  "Hi {firstName}, ..."
 *   - Include business name if available:       "... this is {businessName}."
 *   - Omit each absent value without breaking the surrounding text
 *
 * Examples:
 *   ("Acme", "John")  → "Hi John, this is Acme."
 *   (null,   "John")  → "Hi John."
 *   ("Acme",  null)   → "This is Acme."
 *   (null,    null)   → "Hello."
 */
export function buildMessageTemplate(
  businessName: string | null | undefined,
  leadFirstName: string | null | undefined
): string {
  const hasBusiness = !!businessName
  const hasFirstName = !!leadFirstName

  if (hasFirstName && hasBusiness) {
    return `Hi ${leadFirstName}, this is ${businessName}.`
  }
  if (hasFirstName && !hasBusiness) {
    return `Hi ${leadFirstName}.`
  }
  if (!hasFirstName && hasBusiness) {
    return `This is ${businessName}.`
  }
  // Both absent — fallback greeting
  return 'Hello.'
}
