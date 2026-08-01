/**
 * Screen 01 — Landing (APP_FLOW.md §4)
 *
 * Full-viewport hero explaining the product thesis with:
 * - Animated Muthirai wordmark in Cinzel
 * - One-line product thesis
 * - 2×2 quadrant teaser grid with color-coded labels
 * - Gold "Get Started →" CTA → /setup
 */
import { useNavigate } from 'react-router-dom'

// ── Quadrant teaser data ──────────────────────────────────────────────────────

const QUADRANTS = [
  {
    label: 'On Brand',
    description: 'Consistent + distinctive — where you want to be',
    bg: 'rgba(184,134,46,0.18)',
    border: 'rgba(184,134,46,0.5)',
    dot: '#B8862E',
    corner: 'top-right',
  },
  {
    label: 'Bold Off-Brand',
    description: 'Distinctive but inconsistent — brave, risky',
    bg: 'rgba(200,80,60,0.18)',
    border: 'rgba(200,80,60,0.4)',
    dot: '#C8503C',
    corner: 'top-left',
  },
  {
    label: 'Safe Generic',
    description: 'Consistent but forgettable — blends in',
    bg: 'rgba(120,160,100,0.15)',
    border: 'rgba(120,160,100,0.35)',
    dot: '#78A064',
    corner: 'bottom-right',
  },
  {
    label: 'Off Brand',
    description: 'Neither consistent nor distinctive — drift',
    bg: 'rgba(130,100,80,0.15)',
    border: 'rgba(130,100,80,0.35)',
    dot: '#826450',
    corner: 'bottom-left',
  },
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: 'linear-gradient(160deg, #2A0810 0%, #4E141C 40%, #3A1000 100%)',
      }}
    >
      {/* ── Nav bar ── */}
      <nav className="flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-2">
          <span
            className="w-7 h-7 rounded flex items-center justify-center text-sm font-bold"
            style={{ background: 'linear-gradient(135deg, #B8862E, #D4A44A)', color: '#1C1008' }}
          >
            M
          </span>
          <span
            className="text-base font-semibold tracking-widest uppercase"
            style={{ fontFamily: 'Cinzel, serif', color: '#E8C87A' }}
          >
            Muthirai
          </span>
        </div>
        <a
          href="http://localhost:8000/docs"
          target="_blank"
          rel="noreferrer"
          className="text-xs font-medium"
          style={{ color: 'rgba(247,241,232,0.45)', textDecoration: 'none' }}
        >
          API Docs ↗
        </a>
      </nav>

      {/* ── Hero ── */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 gap-14">

        {/* Wordmark + tagline */}
        <div className="text-center space-y-5 animate-fade-up">
          {/* Decorative rule above */}
          <div className="flex items-center justify-center gap-3 mb-2">
            <div style={{ height: 1, width: 40, background: 'rgba(184,134,46,0.4)' }} />
            <span
              className="text-xs tracking-widest uppercase"
              style={{ color: '#B8862E', fontFamily: 'Cinzel, serif' }}
            >
              Brand Intelligence
            </span>
            <div style={{ height: 1, width: 40, background: 'rgba(184,134,46,0.4)' }} />
          </div>

          <h1
            className="shimmer-text"
            style={{
              fontFamily: 'Cinzel, serif',
              fontSize: 'clamp(2.8rem, 8vw, 5.5rem)',
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: '0.04em',
            }}
          >
            Muthirai
          </h1>

          <p
            className="max-w-xl mx-auto animate-fade-up animate-delay-1"
            style={{
              fontSize: 'clamp(1rem, 2.5vw, 1.25rem)',
              color: 'rgba(247,241,232,0.75)',
              lineHeight: 1.6,
              fontWeight: 300,
            }}
          >
            Know when your content sounds like{' '}
            <em style={{ color: '#E8C87A', fontStyle: 'normal', fontWeight: 500 }}>you</em>
            {' '}— and when it doesn't.
          </p>

          <p
            className="max-w-md mx-auto text-sm animate-fade-up animate-delay-2"
            style={{ color: 'rgba(247,241,232,0.45)', lineHeight: 1.7 }}
          >
            Two-axis AI scoring: Consistency against your brand voice, Distinctiveness
            against the category noise. Every piece of content, placed instantly.
          </p>
        </div>

        {/* Quadrant teaser */}
        <div className="w-full max-w-lg animate-fade-up animate-delay-2">
          {/* Axis labels */}
          <div className="relative">
            {/* Y-axis label */}
            <div
              className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 -rotate-90"
              style={{
                fontSize: '0.65rem',
                color: 'rgba(247,241,232,0.35)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
                paddingRight: '0.5rem',
              }}
            >
              Distinctiveness →
            </div>

            {/* Grid */}
            <div className="grid grid-cols-2 gap-2">
              {/* top-right: On Brand */}
              <QuadrantCell q={QUADRANTS[0]} order={1} />
              {/* top-left: Bold Off-Brand — show top-right visually, order matters for CSS grid */}
              <QuadrantCell q={QUADRANTS[1]} order={0} />
              {/* bottom-right: Safe Generic */}
              <QuadrantCell q={QUADRANTS[2]} order={2} />
              {/* bottom-left: Off Brand */}
              <QuadrantCell q={QUADRANTS[3]} order={3} />
            </div>

            {/* X-axis label */}
            <div
              className="text-center mt-2"
              style={{
                fontSize: '0.65rem',
                color: 'rgba(247,241,232,0.35)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              ← Consistency →
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col items-center gap-3 animate-fade-up animate-delay-3">
          <button
            id="get-started-btn"
            className="btn-gold"
            style={{ fontSize: '1rem', padding: '0.9rem 2.5rem', borderRadius: '8px' }}
            onClick={() => navigate('/setup')}
          >
            Get Started →
          </button>
          <span style={{ fontSize: '0.75rem', color: 'rgba(247,241,232,0.35)' }}>
            Takes about 60 seconds to set up your brand
          </span>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer
        className="text-center py-4 text-xs"
        style={{ color: 'rgba(247,241,232,0.2)' }}
      >
        Muthirai · Hackathon Build v0.1
      </footer>
    </div>
  )
}

// ── Quadrant cell sub-component ───────────────────────────────────────────────

function QuadrantCell({ q, order }: { q: typeof QUADRANTS[0]; order: number }) {
  return (
    <div
      className="rounded-lg p-4 flex flex-col gap-2 transition-all duration-200 hover:scale-[1.02]"
      style={{
        background: q.bg,
        border: `1px solid ${q.border}`,
        animationDelay: `${0.3 + order * 0.08}s`,
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: q.dot }}
        />
        <span
          style={{
            fontFamily: 'Cinzel, serif',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: '#F7F1E8',
            letterSpacing: '0.04em',
          }}
        >
          {q.label}
        </span>
      </div>
      <p style={{ fontSize: '0.7rem', color: 'rgba(247,241,232,0.5)', lineHeight: 1.4 }}>
        {q.description}
      </p>
    </div>
  )
}
