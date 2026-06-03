'use server'

// app/actions/ai.ts
// Server actions for AI extraction using Google Gemini

import { GoogleGenerativeAI } from '@google/generative-ai'
import type { ActionResult, AIExtractResult } from '@/lib/types'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

function getTodayStr() {
  return new Date().toISOString().slice(0, 10)
}

function addDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

const SYSTEM_PROMPT = `You are a business assistant that analyzes customer conversations and extracts follow-up reminder information.

Today's date is: ${getTodayStr()}

Extract the following from the conversation and respond ONLY with valid JSON (no markdown, no explanation):
{
  "customer_name": "extracted name or 'Unknown Customer' if not found",
  "phone": "phone number with country code if found, or null",
  "topic": "short 3-5 word description of what customer wants",
  "summary": "1-2 sentence summary of the customer's interest and situation",
  "suggested_due_date": "YYYY-MM-DD format - suggest when to follow up based on context",
  "source": "WhatsApp or Instagram or Manual based on conversation style"
}

Rules:
- If customer says "let me think about it" → suggest 3 days
- If customer says "later" or vague → suggest 2 days  
- If customer says "next week" → suggest 7 days
- If customer sounds very interested → suggest 1 day
- If no time context → suggest 3 days
- Always respond with valid JSON only`

// ---------------------------------------------------------------------------
// extractFromText
// ---------------------------------------------------------------------------
export async function extractFromText(
  conversationText: string
): Promise<ActionResult<AIExtractResult>> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const result = await model.generateContent([
      SYSTEM_PROMPT,
      `\n\nConversation to analyze:\n${conversationText}`,
    ])

    const text = result.response.text().trim()
    // Remove markdown code blocks if present
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleaned) as AIExtractResult
    parsed.suggested_due_date = parsed.suggested_due_date || addDays(3)

    return { success: true, data: parsed }
  } catch (err) {
    console.error('AI text extraction error:', err)
    return {
      success: false,
      error: 'AI extraction failed. Please fill in the details manually.',
    }
  }
}

// ---------------------------------------------------------------------------
// extractFromImage
// ---------------------------------------------------------------------------
export async function extractFromImage(
  base64Image: string,
  mimeType: string
): Promise<ActionResult<AIExtractResult>> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const result = await model.generateContent([
      SYSTEM_PROMPT,
      {
        inlineData: {
          data: base64Image,
          mimeType: mimeType as 'image/jpeg' | 'image/png' | 'image/webp',
        },
      },
      '\n\nExtract follow-up reminder information from this conversation screenshot.',
    ])

    const text = result.response.text().trim()
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleaned) as AIExtractResult
    parsed.suggested_due_date = parsed.suggested_due_date || addDays(3)
    parsed.source = 'Screenshot'

    return { success: true, data: parsed }
  } catch (err) {
    console.error('AI image extraction error:', err)
    return {
      success: false,
      error: 'Could not read the screenshot. Try pasting the conversation as text.',
    }
  }
}

// ---------------------------------------------------------------------------
// extractFromVoice (transcription via audio)
// ---------------------------------------------------------------------------
export async function extractFromVoice(
  base64Audio: string,
  mimeType: string
): Promise<ActionResult<AIExtractResult>> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const voicePrompt = `Today's date is: ${getTodayStr()}

The user recorded a voice note about a customer follow-up reminder. Transcribe and extract reminder information.

Respond ONLY with valid JSON:
{
  "customer_name": "name mentioned or 'Unknown Customer'",
  "phone": null,
  "topic": "short topic description",
  "summary": "what the voice note said in 1-2 sentences",
  "suggested_due_date": "YYYY-MM-DD - interpret dates like 'next Friday', 'tomorrow', 'next week'",
  "source": "Voice"
}`

    const result = await model.generateContent([
      voicePrompt,
      {
        inlineData: {
          data: base64Audio,
          mimeType: mimeType as 'audio/webm' | 'audio/mp4' | 'audio/wav',
        },
      },
    ])

    const text = result.response.text().trim()
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleaned) as AIExtractResult
    parsed.suggested_due_date = parsed.suggested_due_date || addDays(3)
    parsed.source = 'Voice'

    return { success: true, data: parsed }
  } catch (err) {
    console.error('AI voice extraction error:', err)
    return {
      success: false,
      error: 'Could not process the voice note. Please type your reminder instead.',
    }
  }
}
