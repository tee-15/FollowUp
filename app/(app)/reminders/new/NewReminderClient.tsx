'use client'

// app/(app)/reminders/new/NewReminderClient.tsx
// 3-tab AI-powered new reminder creation

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { extractFromText, extractFromImage, extractFromVoice } from '@/app/actions/ai'
import { createReminder } from '@/app/actions/reminders'
import type { AIExtractResult } from '@/lib/types'

type Tab = 'text' | 'screenshot' | 'voice'

function addDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

const TAB_CONFIG: { id: Tab; icon: string; label: string; description: string }[] = [
  { id: 'text', icon: '✏️', label: 'Paste Chat', description: 'Paste a WhatsApp or Instagram conversation' },
  { id: 'screenshot', icon: '📷', label: 'Screenshot', description: 'Upload a screenshot of your chat' },
  { id: 'voice', icon: '🎤', label: 'Voice Note', description: 'Record a quick voice reminder' },
]

export default function NewReminderClient() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('text')
  const [aiLoading, setAiLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [extracted, setExtracted] = useState<AIExtractResult | null>(null)

  // Text tab state
  const [pastedText, setPastedText] = useState('')

  // Screenshot tab state
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  // Voice tab state
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])

  // Form fields (populated by AI or manually)
  const [form, setForm] = useState({
    customer_name: '',
    phone: '',
    topic: '',
    summary: '',
    due_date: addDays(3),
    notes: '',
    source: 'Manual',
  })

  // -------------------------------------------------------------------------
  // AI Extraction handlers
  // -------------------------------------------------------------------------

  const handleExtractText = async () => {
    if (!pastedText.trim()) { setError('Please paste a conversation first.'); return }
    setAiLoading(true); setError(null)
    const result = await extractFromText(pastedText)
    setAiLoading(false)
    if (!result.success) { setError(result.error); return }
    applyExtracted(result.data)
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setImagePreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleExtractImage = async () => {
    if (!imageFile) { setError('Please select an image first.'); return }
    setAiLoading(true); setError(null)
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string
      const base64 = dataUrl.split(',')[1]
      const result = await extractFromImage(base64, imageFile.type)
      setAiLoading(false)
      if (!result.success) { setError(result.error); return }
      applyExtracted(result.data)
    }
    reader.readAsDataURL(imageFile)
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data)
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        setAudioUrl(URL.createObjectURL(blob))
        stream.getTracks().forEach((t) => t.stop())
      }
      mediaRecorderRef.current = recorder
      recorder.start()
      setIsRecording(true)
    } catch {
      setError('Could not access microphone. Please check permissions.')
    }
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    setIsRecording(false)
  }

  const handleExtractVoice = async () => {
    if (!audioBlob) { setError('Please record a voice note first.'); return }
    setAiLoading(true); setError(null)
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string
      const base64 = dataUrl.split(',')[1]
      const result = await extractFromVoice(base64, audioBlob.type)
      setAiLoading(false)
      if (!result.success) { setError(result.error); return }
      applyExtracted(result.data)
    }
    reader.readAsDataURL(audioBlob)
  }

  const applyExtracted = (data: AIExtractResult) => {
    setExtracted(data)
    setForm((prev) => ({
      ...prev,
      customer_name: data.customer_name || prev.customer_name,
      phone: data.phone || prev.phone,
      topic: data.topic || prev.topic,
      summary: data.summary || prev.summary,
      due_date: data.suggested_due_date || prev.due_date,
      source: data.source || prev.source,
    }))
  }

  // -------------------------------------------------------------------------
  // Save
  // -------------------------------------------------------------------------

  const handleSave = async () => {
    if (!form.customer_name.trim() || !form.topic.trim()) {
      setError('Customer name and topic are required.')
      return
    }
    setSaving(true); setError(null)
    const result = await createReminder({
      customer_name: form.customer_name,
      phone: form.phone || null,
      topic: form.topic,
      summary: form.summary || null,
      source: form.source,
      due_date: form.due_date,
      notes: form.notes || null,
    })
    setSaving(false)
    if (!result.success) { setError(result.error); return }
    router.push('/dashboard')
  }

  const inputCls = 'w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 hover:bg-white focus:bg-white font-sans-body'

  return (
    <div className="px-4 py-6 lg:px-8 max-w-2xl mx-auto pb-24">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 leading-tight mb-1">New Reminder</h1>
        <p className="text-gray-500 text-sm font-medium">Let AI extract the details, or fill them in yourself.</p>
      </div>

      {/* Tab Selector */}
      <div className="grid grid-cols-3 gap-2 mb-6 bg-gray-100 p-1.5 rounded-2xl">
        {TAB_CONFIG.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setError(null); setExtracted(null) }}
            className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === tab.id
                ? 'bg-white shadow-sm text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="text-lg">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Description */}
      <p className="text-xs text-gray-400 text-center mb-6 font-medium">
        {TAB_CONFIG.find((t) => t.id === activeTab)?.description}
      </p>

      {/* ------------------------------------------------------------------ */}
      {/* TAB: Paste Chat                                                    */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === 'text' && (
        <div className="mb-6 space-y-3">
          <textarea
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder={`Paste your WhatsApp or Instagram conversation here...\n\nExample:\nCustomer: "How much is your solar package?"\nYou: "₦850,000"\nCustomer: "Okay let me think about it."`}
            className={`${inputCls} h-48 resize-none leading-relaxed`}
          />
          <button
            onClick={handleExtractText}
            disabled={aiLoading || !pastedText.trim()}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white font-bold text-sm shadow-lg shadow-blue-500/20 hover:scale-[1.01] transition-all disabled:opacity-50 disabled:hover:scale-100"
          >
            {aiLoading ? '✨ Analyzing conversation…' : '✨ Extract with AI'}
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* TAB: Screenshot                                                    */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === 'screenshot' && (
        <div className="mb-6 space-y-3">
          <label className="block">
            <div className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ${imagePreview ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:border-gray-300 bg-gray-50'}`}>
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="max-h-48 mx-auto rounded-xl object-contain" />
              ) : (
                <>
                  <div className="text-4xl mb-3">📷</div>
                  <p className="text-sm font-semibold text-gray-600">Tap to upload screenshot</p>
                  <p className="text-xs text-gray-400 mt-1">JPG, PNG, or WebP</p>
                </>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleImageChange}
              />
            </div>
          </label>
          {imageFile && (
            <button
              onClick={handleExtractImage}
              disabled={aiLoading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white font-bold text-sm shadow-lg shadow-blue-500/20 hover:scale-[1.01] transition-all disabled:opacity-50"
            >
              {aiLoading ? '✨ Reading screenshot…' : '✨ Extract with AI'}
            </button>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* TAB: Voice Note                                                    */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === 'voice' && (
        <div className="mb-6 space-y-4">
          <div className="flex flex-col items-center gap-4 bg-gray-50 border border-gray-200 rounded-2xl p-8">
            {!isRecording && !audioUrl && (
              <>
                <div className="text-5xl">🎤</div>
                <p className="text-sm text-gray-500 text-center">
                  Record a voice note like:<br />
                  <span className="italic text-gray-400">"Remind me to follow up with John next Friday about his ecommerce website"</span>
                </p>
                <button
                  onClick={startRecording}
                  className="px-8 py-3 rounded-2xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                >
                  ● Start Recording
                </button>
              </>
            )}
            {isRecording && (
              <>
                <div className="w-16 h-16 rounded-full bg-red-500 animate-pulse flex items-center justify-center">
                  <span className="text-white text-2xl">●</span>
                </div>
                <p className="text-sm text-red-600 font-bold animate-pulse">Recording…</p>
                <button
                  onClick={stopRecording}
                  className="px-8 py-3 rounded-2xl bg-gray-800 text-white font-bold hover:bg-gray-900 transition-colors"
                >
                  ■ Stop Recording
                </button>
              </>
            )}
            {audioUrl && !isRecording && (
              <>
                <div className="text-4xl">✅</div>
                <audio src={audioUrl} controls className="w-full max-w-xs rounded-xl" />
                <button
                  onClick={() => { setAudioBlob(null); setAudioUrl(null) }}
                  className="text-xs text-gray-400 hover:text-gray-600 underline"
                >
                  Record again
                </button>
              </>
            )}
          </div>
          {audioBlob && !isRecording && (
            <button
              onClick={handleExtractVoice}
              disabled={aiLoading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white font-bold text-sm shadow-lg shadow-blue-500/20 hover:scale-[1.01] transition-all disabled:opacity-50"
            >
              {aiLoading ? '✨ Transcribing voice note…' : '✨ Extract with AI'}
            </button>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* AI Result Banner                                                   */}
      {/* ------------------------------------------------------------------ */}
      {extracted && (
        <div className="mb-6 bg-violet-50 border border-violet-200 rounded-2xl px-4 py-3 flex items-start gap-3">
          <span className="text-violet-500 text-lg mt-0.5">✨</span>
          <div>
            <p className="text-sm font-bold text-violet-700 mb-0.5">AI extracted the details below</p>
            <p className="text-xs text-violet-500">Review and edit before saving.</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 font-medium">
          {error}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Reminder Form                                                      */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-white border border-gray-200 rounded-3xl p-6 space-y-5 shadow-sm">
        <h2 className="font-bold text-gray-800 text-base">Reminder Details</h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Customer Name *</label>
            <input
              type="text"
              value={form.customer_name}
              onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
              placeholder="e.g. John Adeyemi"
              className={inputCls}
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Phone (WhatsApp)</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+234 800 000 0000"
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Topic / Interest *</label>
          <input
            type="text"
            value={form.topic}
            onChange={(e) => setForm({ ...form, topic: e.target.value })}
            placeholder="e.g. Solar Package, Website Design"
            className={inputCls}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">AI Summary</label>
          <textarea
            value={form.summary}
            onChange={(e) => setForm({ ...form, summary: e.target.value })}
            placeholder="What is the customer's situation and interest?"
            className={`${inputCls} h-20 resize-none`}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Follow-up Date *</label>
          <input
            type="date"
            value={form.due_date}
            onChange={(e) => setForm({ ...form, due_date: e.target.value })}
            min={new Date().toISOString().slice(0, 10)}
            className={inputCls}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Any extra context or reminders for yourself..."
            className={`${inputCls} h-20 resize-none`}
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-base shadow-lg shadow-blue-500/30 hover:scale-[1.01] hover:shadow-blue-500/50 transition-all disabled:opacity-50 disabled:hover:scale-100"
        >
          {saving ? 'Saving…' : '💾 Save Reminder'}
        </button>
      </div>
    </div>
  )
}
