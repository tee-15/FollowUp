// lib/__tests__/whatsapp.test.ts
// Unit tests for buildWhatsAppLink and buildMessageTemplate

import { describe, it, expect } from 'vitest'
import { buildWhatsAppLink, buildMessageTemplate } from '../whatsapp'

describe('buildWhatsAppLink', () => {
  describe('phone stripping', () => {
    it('strips spaces, dashes, and parentheses from phone', () => {
      const result = buildWhatsAppLink('+1 (555) 123-4567', 'Acme', 'John')
      expect(result.valid).toBe(true)
      expect(result.url).toContain('/15551234567?')
    })

    it('strips the + prefix', () => {
      const result = buildWhatsAppLink('+447911123456', 'Biz', 'Jane')
      expect(result.valid).toBe(true)
      expect(result.url).toContain('/447911123456?')
    })

    it('preserves only digit characters in the URL path', () => {
      const result = buildWhatsAppLink('234-801-000-0001', 'Corp', 'Ali')
      expect(result.valid).toBe(true)
      const urlPath = new URL(result.url).pathname
      expect(urlPath).toBe('/2348010000001')
    })
  })

  describe('phone validation (7–15 digits)', () => {
    it('returns valid: true for exactly 7 digits', () => {
      const result = buildWhatsAppLink('1234567', 'Biz', 'A')
      expect(result.valid).toBe(true)
    })

    it('returns valid: true for exactly 15 digits', () => {
      const result = buildWhatsAppLink('123456789012345', 'Biz', 'A')
      expect(result.valid).toBe(true)
    })

    it('returns valid: false for 6 digits', () => {
      const result = buildWhatsAppLink('123456', 'Biz', 'A')
      expect(result.valid).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.url).toBe('')
    })

    it('returns valid: false for 16 digits', () => {
      const result = buildWhatsAppLink('1234567890123456', 'Biz', 'A')
      expect(result.valid).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('returns valid: false for empty string', () => {
      const result = buildWhatsAppLink('', 'Biz', 'A')
      expect(result.valid).toBe(false)
    })

    it('returns valid: false for phone with only non-digit characters', () => {
      const result = buildWhatsAppLink('---+++   ', 'Biz', 'A')
      expect(result.valid).toBe(false)
    })
  })

  describe('URL construction', () => {
    it('constructs a URL starting with https://wa.me/', () => {
      const result = buildWhatsAppLink('12345678901', 'Acme', 'John')
      expect(result.valid).toBe(true)
      expect(result.url.startsWith('https://wa.me/')).toBe(true)
    })

    it('encodes the message with encodeURIComponent (spaces become %20)', () => {
      const result = buildWhatsAppLink('12345678901', 'Acme Corp', 'John')
      expect(result.valid).toBe(true)
      // The query string should be percent-encoded
      const queryString = result.url.split('?text=')[1]
      expect(queryString).toBe(encodeURIComponent('Hi John, this is Acme Corp.'))
    })

    it('produces a parseable URL', () => {
      const result = buildWhatsAppLink('+1-800-555-0199', 'My Business', 'Alice')
      expect(result.valid).toBe(true)
      expect(() => new URL(result.url)).not.toThrow()
    })
  })

  describe('absent businessName / leadFirstName handling', () => {
    it('omits firstName gracefully when null', () => {
      const result = buildWhatsAppLink('12345678901', 'Acme', null)
      expect(result.valid).toBe(true)
      const decoded = decodeURIComponent(result.url.split('?text=')[1])
      expect(decoded).toBe('This is Acme.')
      expect(decoded).not.toContain('null')
      expect(decoded).not.toContain('undefined')
    })

    it('omits businessName gracefully when null', () => {
      const result = buildWhatsAppLink('12345678901', null, 'John')
      expect(result.valid).toBe(true)
      const decoded = decodeURIComponent(result.url.split('?text=')[1])
      expect(decoded).toBe('Hi John.')
      expect(decoded).not.toContain('null')
    })

    it('produces a fallback greeting when both are null', () => {
      const result = buildWhatsAppLink('12345678901', null, null)
      expect(result.valid).toBe(true)
      const decoded = decodeURIComponent(result.url.split('?text=')[1])
      expect(decoded).toBe('Hello.')
    })

    it('omits firstName gracefully when undefined', () => {
      const result = buildWhatsAppLink('12345678901', 'Biz', undefined)
      expect(result.valid).toBe(true)
      const decoded = decodeURIComponent(result.url.split('?text=')[1])
      expect(decoded).not.toContain('undefined')
    })
  })
})

describe('buildMessageTemplate', () => {
  it('includes both names when both are present', () => {
    expect(buildMessageTemplate('Acme', 'John')).toBe('Hi John, this is Acme.')
  })

  it('returns greeting with firstName only when businessName absent', () => {
    expect(buildMessageTemplate(null, 'John')).toBe('Hi John.')
  })

  it('returns business-only greeting when firstName absent', () => {
    expect(buildMessageTemplate('Acme', null)).toBe('This is Acme.')
  })

  it('returns fallback greeting when both absent', () => {
    expect(buildMessageTemplate(null, null)).toBe('Hello.')
  })

  it('treats empty string businessName as absent', () => {
    expect(buildMessageTemplate('', 'John')).toBe('Hi John.')
  })

  it('treats empty string leadFirstName as absent', () => {
    expect(buildMessageTemplate('Acme', '')).toBe('This is Acme.')
  })
})
