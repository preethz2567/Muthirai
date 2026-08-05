/**
 * Screen 02 — Brand Setup + Ingesting state (APP_FLOW.md §4)
 *
 * States:
 *   'idle'      — form shown, validation active
 *   'loading'   — mock API call in progress, animated pipeline stages
 *
 * On success: navigate to /brands/:id/dashboard with identity card in router state.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createBrand } from '../lib/api'
import VerificationSeal from '../components/VerificationSeal'

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

    const t1 = setTimeout(() => setActiveStage(1), 800)
    const t2 = setTimeout(() => setActiveStage(2), 1600)

    try {
      const card = await createBrand(brandName.trim(), inputVal.trim())
      clearTimeout(t1)
      clearTimeout(t2)
      localStorage.setItem('muthirai_brand_id', card.brand_id)
      navigate(`/brands/${card.brand_id}/review`, { state: { card } })
    } catch (err: any) {
      clearTimeout(t1)
      clearTimeout(t2)
      setError(err.message || 'Something went wrong. Please try again.')
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
          <div className="flex justify-center mb-8">
            <div
              className="spin-slow"
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                border: '2px solid var(--color-border)',
                borderTopColor: 'var(--color-oxblood)',
              }}
            />
          </div>

          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.35rem',
              fontWeight: 400,
              color: 'var(--color-text-primary)',
              letterSpacing: '-0.02em',
              marginBottom: '0.5rem',
            }}
          >
            Reading your brand's voice…
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '2.5rem', fontFamily: 'var(--font-sans)' }}>
            The Ingestion Agent is analysing your content. This takes up to 60 seconds.
          </p>

          <div className="flex flex-col gap-3">
            {STAGES.map((stage, i) => {
              const done    = i < activeStage
              const active  = i === activeStage
              const pending = i > activeStage
              return (
                <div
                  key={stage.key}
                  className="flex items-center gap-3 rounded-md px-4 py-3 transition-all duration-500"
                  style={{
                    background: active
                      ? 'rgba(110,31,43,0.15)'
                      : done
                      ? 'rgba(110,31,43,0.07)'
                      : 'var(--color-surface)',
                    border: `1px solid ${
                      active ? 'rgba(110,31,43,0.5)'
                      : done  ? 'rgba(110,31,43,0.2)'
                      :         'var(--color-border)'
                    }`,
                    opacity: pending ? 0.45 : 1,
                  }}
                >
                  <span style={{
                    fontSize: '1rem', width: 20, textAlign: 'center',
                    color: done ? 'var(--color-oxblood)' : active ? 'var(--color-text-primary)' : 'var(--color-text-muted)'
                  }}>
                    {done ? '✓' : stage.icon}
                  </span>
                  <span
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: active ? 600 : 400,
                      fontFamily: 'var(--font-sans)',
                      color: active ? 'var(--color-text-primary)' : done ? 'var(--color-oxblood)' : 'var(--color-text-muted)',
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
                            width: 5, height: 5,
                            borderRadius: '50%',
                            background: 'var(--color-oxblood)',
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
            style={{ color: 'var(--color-brass)', fontFamily: 'var(--font-mono)' }}
          >
            Step 1 of 3
          </p>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '2rem',
              fontWeight: 400,
              color: 'var(--color-text-primary)',
              letterSpacing: '-0.03em',
              marginBottom: '0.5rem',
            }}
          >
            Set Up Your Brand
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
            Give us your brand's content and we'll extract your voice automatically.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6 animate-fade-up animate-delay-1">

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

          <div>
            <span className="field-label">Source</span>
            <div
              className="flex rounded-md overflow-hidden"
              style={{ border: '1px solid var(--color-border)', width: 'fit-content' }}
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
                    background: mode === m ? 'var(--color-surface-hover)' : 'transparent',
                    color: mode === m ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background 0.15s, color 0.15s',
                  }}
                >
                  {m === 'url' ? '🔗  Paste a URL' : '📋  Paste content'}
                </button>
              ))}
            </div>
          </div>

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
              <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.4rem' }}>
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
              <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.4rem' }}>
                More text = richer identity card.
              </p>
            </div>
          )}

          {error && (
            <p
              className="text-sm rounded-md px-4 py-3"
              style={{ background: 'rgba(248,81,73,0.1)', border: '1px solid rgba(248,81,73,0.4)', color: '#F85149' }}
            >
              {error}
            </p>
          )}

          <button
            id="build-profile-btn"
            type="submit"
            className="btn-primary"
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
      style={{ background: 'var(--color-ink)' }}
    >
      <nav
        className="flex items-center px-8 py-4"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center gap-2">
          <VerificationSeal variant="nav" tone="brass" />
          <span
            className="text-base font-semibold"
            style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.01em', color: 'var(--color-text-primary)' }}
          >
            Muthirai
          </span>
        </div>
      </nav>
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        {children}
      </main>
    </div>
  )
}
