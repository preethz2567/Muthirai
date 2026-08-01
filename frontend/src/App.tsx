/**
 * App.tsx — root router
 *
 * Routes:
 *   /                        → Screen 01: LandingPage
 *   /setup                   → Screen 02: BrandSetupPage
 *   /brands/:id/review       → Screen 03: IdentityCardPage
 *   /brands/:id/dashboard    → Stub (Screen 04 — coming in prompt 6)
 *   *                        → Redirect to /
 */
import { BrowserRouter, Routes, Route, Navigate, useParams, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import LandingPage       from './pages/LandingPage.tsx'
import BrandSetupPage    from './pages/BrandSetupPage.tsx'
import IdentityCardPage  from './pages/IdentityCardPage.tsx'
import CompassModePage   from './pages/CompassModePage.tsx'
import ScoreContentPage  from './pages/ScoreContentPage.tsx'
import ScoreResultPage   from './pages/ScoreResultPage.tsx'
import QuadrantChart     from './components/QuadrantChart.tsx'
import DriftDashboardPage  from './pages/DriftDashboardPage.tsx'
import { getBrandHistory, type DriftHistoryItem } from './lib/api.ts'


// ── Dashboard & Results stubs ────────────────────────────────────────────────

function DashboardStub() {
  const navigate = useNavigate()
  const { id } = useParams()
  const location = useLocation()
  
  const [history, setHistory] = useState<DriftHistoryItem[]>([])

  useEffect(() => {
    if (id && id !== 'draft') {
      getBrandHistory(id).then(setHistory).catch(console.error)
    }
  }, [id])

  // Simulated state for demonstration of Prompt 9 requirement
  const hasTrajectory = (location.state as any)?.hasTrajectory

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(160deg, #2A0810 0%, #4E141C 60%, #3A1000 100%)',
        gap: '2rem',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <div
        style={{
          background: 'rgba(184,134,46,0.12)',
          border: '1px solid rgba(184,134,46,0.3)',
          borderRadius: 10,
          padding: '2.5rem 3rem',
          textAlign: 'center',
          maxWidth: 420,
        }}
      >
        <h2 style={{ color: '#F7F1E8', fontSize: '1.6rem', fontFamily: 'Cinzel, serif', fontWeight: 700, marginBottom: '0.75rem' }}>
          Brand Dashboard
        </h2>
        <p style={{ color: 'rgba(247,241,232,0.55)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '2rem' }}>
          Your brand profile has been saved.
        </p>
        <button
          onClick={() => navigate(`/brands/${id || 'draft'}/score`)}
          style={{
            background: '#B8862E',
            border: 'none',
            color: '#1A050A',
            padding: '0.75rem 1.5rem',
            borderRadius: 4,
            fontWeight: 700,
            cursor: 'pointer',
            width: '100%',
            marginBottom: '1rem',
          }}
        >
          Score New Content
        </button>
        <button
          onClick={() => navigate(`/brands/${id || 'draft'}/compass`)}
          style={{
            background: 'transparent',
            border: '1px solid #B8862E',
            color: '#E8C87A',
            padding: '0.75rem 1.5rem',
            borderRadius: 4,
            fontWeight: 600,
            cursor: 'pointer',
            width: '100%',
          }}
        >
          Shift Brand Direction (Compass Mode)
        </button>
        <button
          onClick={() => navigate(`/brands/${id || 'draft'}/drift`)}
          style={{
            background: 'transparent',
            border: '1px solid #7A1F2B',
            color: '#7A1F2B',
            padding: '0.75rem 1.5rem',
            borderRadius: 4,
            fontWeight: 600,
            cursor: 'pointer',
            width: '100%',
            marginTop: '1rem',
          }}
        >
          View Drift Dashboard
        </button>
      </div>

      <div style={{ width: '100%', maxWidth: 600 }}>
        <h3 style={{ color: '#F7F1E8', fontFamily: 'Cinzel, serif', marginBottom: '1rem', textAlign: 'center' }}>
          Drift Dashboard (History)
        </h3>
        {history.length === 0 ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: 'rgba(247,241,232,0.5)', marginBottom: '1rem' }}>Score your first piece of content to see it placed on the quadrant.</p>
            <button
              onClick={() => navigate(`/brands/${id || 'draft'}/score`)}
              style={{
                background: 'transparent',
                border: '1px solid #B8862E',
                color: '#E8C87A',
                padding: '0.5rem 1rem',
                borderRadius: 4,
                cursor: 'pointer',
              }}
            >
              Score New Content
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {history.length === 1 && (
              <p style={{ color: 'rgba(247,241,232,0.5)', textAlign: 'center', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                Score a few more pieces of content to start seeing your brand's trend.
              </p>
            )}
            {history.map((h, i) => (
              <div key={i} style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: 8, display: 'flex', justifyContent: 'space-between', border: '1px solid rgba(184,134,46,0.3)' }}>
                <div>
                  <div style={{ color: '#E8C87A', fontWeight: 'bold' }}>{h.quadrant.replace(/_/g, ' ')}</div>
                  <div style={{ color: 'rgba(247,241,232,0.5)', fontSize: '0.8rem' }}>{new Date(h.scored_at).toLocaleString()}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#F7F1E8' }}>Consistency: {(h.consistency_score * 100).toFixed(0)}%</div>
                  <div style={{ color: '#F7F1E8' }}>Distinctiveness: {(h.distinctiveness_score * 100).toFixed(0)}%</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {hasTrajectory && (
        <div style={{ textAlign: 'center' }}>
          <h3 style={{ color: '#F7F1E8', fontFamily: 'Cinzel, serif', marginBottom: '1rem' }}>
            Results Stub (Showing Target Marker)
          </h3>
          <QuadrantChart 
            contentScore={{ x: 0.2, y: 0.1 }} 
            targetScore={{ x: 0.8, y: 0.7 }} 
          />
        </div>
      )}
    </div>
  )
}

// ── Router ────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"                          element={<LandingPage />} />
        <Route path="/setup"                     element={<BrandSetupPage />} />
        <Route path="/brands/:id/review"         element={<IdentityCardPage />} />
        <Route path="/brands/:id/dashboard"      element={<DashboardStub />} />
        <Route path="/brands/:id/score"          element={<ScoreContentPage />} />
        <Route path="/brands/:id/results"        element={<ScoreResultPage />} />
        <Route path="/brands/:id/compass"        element={<CompassModePage />} />
        <Route path="/brands/:id/drift"          element={<DriftDashboardPage />} />
        {/* Catch-all → redirect to landing */}
        <Route path="*"                          element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
