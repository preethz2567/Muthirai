/**
 * Screen 02 — Brand Setup + Ingesting state (APP_FLOW.md §4)
 *
 * States:
 *   'idle'      — form shown, validation active
 *   'loading'   — mock API call in progress, animated pipeline stages
 *
 * On success: navigate to /brands/:id/review with identity card in router state.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createBrand } from '../lib/api'

// ── Ingestion pipeline stages ─────────────────────────────────────────────────

const STAGES = [
  { key: 'fetch',   label: 'Fetching content',        icon: '⬇' },
  { key: 'parse',   label: 'Parsing brand signals',    icon: '◈' },
  { key: 'extract', label: 'Extracting identity card', icon: '✦' },
]

// ── Component ─────────────────────────────────────────────────────────────────

type InputMode = 'url' | 'paste'
type PageState = 'idle' | 'loading'

export default function BrandSetupPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<InputMode>('url')
  const [brandName, setBrandName] = useState('')
  const [inputVal, setInputVal] = useState('')
  const [pageState, setPageState] = useState<PageState>('idle')
  const [activeStage, setActiveStage] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const isValid = brandName.trim().length > 0 && inputVal.trim().length > 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid) return

    setError(null)
    setPageState('loading')
    setActiveStage(0)

    // Advance stage indicators during the 2.5 s delay
    const t1 = setTimeout(() => setActiveStage(1), 800)
    const t2 = setTimeout(() => setActiveStage(2), 1600)

    try {
      const card = await createBrand(brandName.trim(), inputVal.trim())
      clearTimeout(t1)
      clearTimeout(t2)
      navigate(`/brands/${card.brand_id}/review`, { state: { card } })
    } catch {
      clearTimeout(t1)
      clearTimeout(t2)
      setError('Something went wrong. Please try again.')
      setPageState('idle')
    }
  }

  /* ── Loading state ── */
  if (pageState === 'loading') {
    return (
      <PageShell>
        <div
          className="w-full max-w-md mx-auto animate-fade-up"
          style={{ textAlign: 'center' }}
        >
          {/* Spinner ring */}
          <div className="flex justify-center mb-8">
            <div
              className="spin-slow"
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                border: '3px solid rgba(184,134,46,0.15)',
                borderTopColor: '#B8862E',
              }}
            />
          </div>

          <h2
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1.4rem',
              fontWeight: 600,
              color: '#F7F1E8',
              marginBottom: '0.5rem',
            }}
          >
            Reading your brand's voice…
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'rgba(247,241,232,0.5)', marginBottom: '2.5rem' }}>
            The Ingestion Agent is analysing your content. This takes up to 60 seconds.
          </p>

          {/* Stage pills */}
          <div className="flex flex-col gap-3">
            {STAGES.map((stage, i) => {
              const done    = i < activeStage
              const active  = i === activeStage
              const pending = i > activeStage
              return (
                <div
                  key={stage.key}
                  className="flex items-center gap-3 rounded-lg px-4 py-3 transition-all duration-500"
                  style={{
                    background: active
                      ? 'rgba(184,134,46,0.18)'
                      : done
                      ? 'rgba(184,134,46,0.08)'
                      : 'rgba(0,0,0,0.2)',
                    border: `1px solid ${
                      active ? 'rgba(184,134,46,0.6)'
                      : done  ? 'rgba(184,134,46,0.3)'
                      :         'rgba(247,241,232,0.08)'
                    }`,
                    opacity: pending ? 0.4 : 1,
                  }}
                >
                  {/* Status icon */}
                  <span style={{ fontSize: '1rem', width: 20, textAlign: 'center', color: done ? '#B8862E' : active ? '#E8C87A' : 'rgba(247,241,232,0.3)' }}>
                    {done ? '✓' : stage.icon}
                  </span>
                  <span
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: active ? 600 : 400,
                      color: active ? '#F7F1E8' : done ? '#B8862E' : 'rgba(247,241,232,0.4)',
                    }}
                  >
                    {stage.label}
                  </span>
                  {active && (
                    <span style={{ marginLeft: 'auto', display: 'flex', gap: 3 }}>
                      {[0, 1, 2].map(d => (
                        <span
                          key={d}
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: '50%',
                            background: '#B8862E',
                            animation: `pulse-dot 1.2s ease-in-out ${d * 0.2}s infinite`,
                          }}
                        />
                      ))}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </PageShell>
    )
  }

  /* ── Form state ── */
  return (
    <PageShell>
      <div className="w-full max-w-xl mx-auto">
        {/* Back link */}
        <button
          onClick={() => navigate('/')}
          className="btn-outline mb-8"
          style={{ fontSize: '0.8rem', padding: '0.4rem 1rem' }}
        >
          ← Back
        </button>

        <div className="animate-fade-up">
          <p
            className="text-xs tracking-widest uppercase mb-3"
            style={{ color: '#B8862E', fontFamily: 'var(--font-heading)' }}
          >
            Step 1 of 3
          </p>
          <h1
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '2rem',
              fontWeight: 700,
              color: '#F7F1E8',
              marginBottom: '0.5rem',
            }}
          >
            Set Up Your Brand
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'rgba(247,241,232,0.55)', marginBottom: '2rem' }}>
            Give us your brand's content and we'll extract your voice automatically.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6 animate-fade-up animate-delay-1">

          {/* Brand name */}
          <div>
            <label htmlFor="brand-name" className="field-label">Brand Name</label>
            <input
              id="brand-name"
              type="text"
              className="field-input"
              placeholder="e.g. Acme Coffee Co."
              value={brandName}
              onChange={e => setBrandName(e.target.value)}
              autoComplete="off"
            />
          </div>

          {/* Mode toggle */}
          <div>
            <span className="field-label">Source</span>
            <div
              className="flex rounded-lg overflow-hidden"
              style={{ border: '1px solid rgba(184,134,46,0.3)', width: 'fit-content' }}
            >
              {(['url', 'paste'] as InputMode[]).map(m => (
                <button
                  key={m}
                  type="button"
                  id={`mode-${m}`}
                  onClick={() => { setMode(m); setInputVal('') }}
                  style={{
                    padding: '0.5rem 1.25rem',
                    fontSize: '0.82rem',
                    fontWeight: 500,
                    background: mode === m ? 'rgba(184,134,46,0.25)' : 'transparent',
                    color: mode === m ? '#E8C87A' : 'rgba(247,241,232,0.45)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background 0.2s, color 0.2s',
                  }}
                >
                  {m === 'url' ? '🔗  Paste a URL' : '📋  Paste content'}
                </button>
              ))}
            </div>
          </div>

          {/* Input field */}
          {mode === 'url' ? (
            <div>
              <label htmlFor="source-url" className="field-label">Brand Website URL</label>
              <input
                id="source-url"
                type="url"
                className="field-input"
                placeholder="https://your-brand.com/about"
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
              />
              <p style={{ fontSize: '0.72rem', color: 'rgba(247,241,232,0.35)', marginTop: '0.4rem' }}>
                We'll extract brand voice signals from this page.
              </p>
            </div>
          ) : (
            <div>
              <label htmlFor="source-paste" className="field-label">Paste Brand Content</label>
              <textarea
                id="source-paste"
                className="field-input"
                rows={6}
                placeholder="Paste website copy, brand guidelines, campaign text…"
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                style={{ resize: 'vertical' }}
              />
              <p style={{ fontSize: '0.72rem', color: 'rgba(247,241,232,0.35)', marginTop: '0.4rem' }}>
                More text = richer identity card.
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <p
              className="text-sm rounded-lg px-4 py-3"
              style={{ background: 'rgba(200,60,60,0.15)', border: '1px solid rgba(200,60,60,0.4)', color: '#F4A0A0' }}
            >
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            id="build-profile-btn"
            type="submit"
            className="btn-gold"
            disabled={!isValid}
            style={{ alignSelf: 'flex-start', marginTop: '0.5rem' }}
          >
            Build My Brand Profile →
          </button>
        </form>
      </div>
    </PageShell>
  )
}

// ── Shared page shell ─────────────────────────────────────────────────────────

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: 'linear-gradient(160deg, #2A0810 0%, #4E141C 60%, #3A1000 100%)',
      }}
    >
      {/* Nav */}
      <nav className="flex items-center px-8 py-5">
        <div className="flex items-center gap-2">
          <span
            className="w-7 h-7 rounded flex items-center justify-center text-sm font-bold"
            style={{ background: 'linear-gradient(135deg, #B8862E, #D4A44A)', color: '#1C1008' }}
          >
            M
          </span>
          <span
            className="text-base font-semibold tracking-widest uppercase"
            style={{ fontFamily: 'var(--font-heading)', color: '#E8C87A' }}
          >
            Muthirai
          </span>
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        {children}
      </main>
    </div>
  )
}
