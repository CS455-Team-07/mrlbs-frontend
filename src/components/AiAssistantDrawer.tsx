import { useState } from 'react'
import {
  askAiAssistant,
  type AiRecommendationResponse,
  type ResourceRecommendation,
} from '../services/aiService'

interface AiAssistantDrawerProps {
  isOpen: boolean
  onClose: () => void
  currentDate?: string
  onSelectRecommendation: (recommendation: ResourceRecommendation) => void
}

export function AiAssistantDrawer({
  isOpen,
  onClose,
  currentDate,
  onSelectRecommendation,
}: AiAssistantDrawerProps) {
  const [prompt, setPrompt] = useState('')
  const [activeQuery, setActiveQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState('Analyzing request...')
  const [error, setError] = useState('')
  const [result, setResult] = useState<AiRecommendationResponse | null>(null)

  if (!isOpen) return null

  const handleSend = async (customPrompt?: string) => {
    const query = (customPrompt ?? prompt).trim()
    if (!query) return

    // Immediately clear input for clean conversational experience
    setPrompt('')
    setActiveQuery(query)
    setLoading(true)
    setError('')
    setLoadingStep('Analyzing criteria with Gemini Flash...')

    const timer1 = setTimeout(() => {
      setLoadingStep('Searching MRLBS database & conflict rules...')
    }, 900)
    const timer2 = setTimeout(() => {
      setLoadingStep('Ranking top match and closest alternatives...')
    }, 1800)

    try {
      const response = await askAiAssistant(query, currentDate, result?.extractedIntent)
      setResult(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get recommendations from AI.')
    } finally {
      clearTimeout(timer1)
      clearTimeout(timer2)
      setLoading(false)
    }
  }

  const samplePrompts = [
    'I need a lecture hall for 80 people tomorrow from 10 AM to noon',
    'GPU cluster on 2026-10-15 for 2 hours',
    'Lecture hall for 50 people on 2026-10-14',
  ]

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Drawer Panel - Horizontally widened by ~2cm (~100-140px) */}
      <aside
        className="fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-white shadow-2xl transition-all sm:w-[580px] md:w-[640px] lg:w-[680px] max-w-[95vw]"
        role="dialog"
        aria-label="AI Lab Assistant"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-sm ring-4 ring-blue-50">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                AI Lab Assistant
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-800">
                  Gemini Flash
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Natural-language discovery & smart booking
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
            aria-label="Close assistant"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Quick Prompts */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Example Queries
            </p>
            <div className="flex flex-wrap gap-2">
              {samplePrompts.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => {
                    void handleSend(example)
                  }}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 hover:border-blue-400 hover:bg-blue-50/50 hover:text-blue-800 transition text-left"
                >
                  "{example}"
                </button>
              ))}
            </div>
          </div>

          {/* Active Query Display if sent */}
          {activeQuery && (
            <div className="flex items-start gap-2.5 rounded-xl bg-blue-50/60 p-3.5 border border-blue-100">
              <span className="text-base">💬</span>
              <div className="text-xs">
                <p className="font-semibold text-blue-900">Your Request</p>
                <p className="text-slate-700 mt-0.5">"{activeQuery}"</p>
              </div>
            </div>
          )}

          {/* Live Asynchronous Loading Step Indicator */}
          {loading && (
            <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 shadow-sm animate-pulse">
              <div className="flex items-center gap-3">
                <svg className="h-5 w-5 animate-spin text-blue-600" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <div>
                  <p className="text-xs font-bold text-blue-950 uppercase tracking-wide">AI Assistant Working</p>
                  <p className="text-xs font-medium text-blue-800 mt-0.5">{loadingStep}</p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <p className="font-semibold">Unable to fetch AI recommendations</p>
              <p className="mt-1 text-xs">{error}</p>
            </div>
          )}

          {/* Follow-up / Mandatory Clarification Alert (e.g. Missing Date) */}
          {result?.followUpQuestion && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 shadow-sm">
              <div className="flex items-center gap-2 font-semibold">
                <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>Information Needed</span>
              </div>
              <p className="mt-2 text-sm">{result.followUpQuestion}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {['Today', 'Tomorrow', 'Next Monday'].map((dt) => (
                  <button
                    key={dt}
                    type="button"
                    onClick={() => void handleSend(dt)}
                    className="rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 px-3 py-1 text-xs font-semibold transition"
                  >
                    📅 {dt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Engaging Conversational Follow-up for Optional Criteria (Slots & Capacity) */}
          {result?.engagementPrompt && (
            <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50/70 to-blue-50/50 p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-base">💡</span>
                <p className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                  Refine Your Request
                </p>
              </div>
              <p className="mt-2 text-xs text-indigo-950 leading-relaxed font-medium">
                {result.engagementPrompt}
              </p>

              {result.suggestedRefinements && result.suggestedRefinements.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {result.suggestedRefinements.map((refinement) => (
                    <button
                      key={refinement}
                      type="button"
                      onClick={() => void handleSend(refinement)}
                      className="rounded-lg border border-indigo-300 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-600 hover:text-white shadow-xs transition"
                    >
                      {refinement.includes(':') ? '⏰ ' : '👥 '}
                      {refinement}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Extracted Intent Tags */}
          {result?.extractedIntent && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Parsed Search Criteria
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                {result.extractedIntent.date && (
                  <span className="rounded-md bg-blue-100 px-2.5 py-1 font-medium text-blue-800">
                    📅 Date: {result.extractedIntent.date}
                  </span>
                )}
                {result.extractedIntent.resourceType && (
                  <span className="rounded-md bg-purple-100 px-2.5 py-1 font-medium text-purple-800">
                    🏛️ Type: {result.extractedIntent.resourceType}
                  </span>
                )}
                {result.extractedIntent.minCapacity && (
                  <span className="rounded-md bg-emerald-100 px-2.5 py-1 font-medium text-emerald-800">
                    👥 Capacity: {result.extractedIntent.minCapacity}+
                  </span>
                )}
                {result.extractedIntent.startTime && (
                  <span className="rounded-md bg-amber-100 px-2.5 py-1 font-medium text-amber-800">
                    ⏰ Time: {result.extractedIntent.startTime} - {result.extractedIntent.endTime || ''}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Recommendations List */}
          {result && (result.topRecommendation || (result.alternatives && result.alternatives.length > 0)) && (
            <div className="space-y-4">
              {/* 1. Top Recommended Resource */}
              {result.topRecommendation && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
                      Top Recommended Match
                    </p>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        result.topRecommendation.matchType === 'EXACT'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}
                    >
                      {result.topRecommendation.matchType === 'EXACT' ? '✓ Exact Match' : 'Closest Alternative'}
                    </span>
                  </div>

                  <div className="rounded-2xl border-2 border-blue-500 bg-blue-50/40 p-4 shadow-sm hover:shadow-md transition">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">
                          {result.topRecommendation.name}
                        </h3>
                        <p className="text-xs text-slate-600">
                          {result.topRecommendation.type} • {result.topRecommendation.location}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-semibold text-slate-700">
                          {result.topRecommendation.capacity ? `${result.topRecommendation.capacity} seats` : 'Unlimited'}
                        </span>
                        <p className="text-[11px] text-slate-500">
                          {result.topRecommendation.baseRate > 0
                            ? `${result.topRecommendation.baseRate} cr/hr`
                            : 'Free (0 cr)'}
                        </p>
                      </div>
                    </div>

                    <p className="mt-2.5 text-xs text-slate-700 leading-relaxed bg-white/70 rounded-lg p-2.5 border border-blue-100">
                      {result.topRecommendation.explanation}
                    </p>

                    <div className="mt-3 flex items-center justify-between pt-2 border-t border-blue-100">
                      <span className="text-xs font-medium text-slate-600">
                        Policy: <strong className="text-slate-800">{result.topRecommendation.bookingPolicy}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          onSelectRecommendation(result.topRecommendation!)
                          onClose()
                        }}
                        className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 shadow-sm transition"
                      >
                        Select & Book
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Closest Alternatives */}
              {result.alternatives && result.alternatives.length > 0 && (
                <div className="pt-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Other Alternative Resources ({result.alternatives.length})
                  </p>
                  <div className="space-y-3">
                    {result.alternatives.map((alt) => (
                      <div
                        key={alt.resourceId}
                        className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm hover:border-slate-300 transition"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-slate-900">{alt.name}</h4>
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                {alt.matchType}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500">
                              {alt.type} • {alt.location}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-semibold text-slate-700">
                              {alt.capacity ? `${alt.capacity} seats` : 'Flexible'}
                            </span>
                          </div>
                        </div>

                        <p className="mt-2 text-xs text-slate-600 bg-slate-50 rounded p-2">
                          {alt.explanation}
                        </p>

                        <div className="mt-2.5 flex items-center justify-between">
                          <span className="text-[11px] text-slate-500">
                            Rate: {alt.baseRate > 0 ? `${alt.baseRate} cr/hr` : '0 cr'}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              onSelectRecommendation(alt)
                              onClose()
                            }}
                            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-700 transition"
                          >
                            View Availability
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input Bar Footer */}
        <div className="border-t border-slate-200 bg-slate-50 p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void handleSend()
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Lecture hall for 80 people on 18th October..."
              disabled={loading}
              className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={loading || !prompt.trim()}
              className="flex items-center justify-center rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50 transition shadow-sm"
            >
              {loading ? (
                <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              ) : (
                'Send'
              )}
            </button>
          </form>
        </div>
      </aside>
    </>
  )
}
