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
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LandingPage       from './pages/LandingPage'
import BrandSetupPage    from './pages/BrandSetupPage'
import IdentityCardPage  from './pages/IdentityCardPage'
import CompassModePage   from './pages/CompassModePage'
import QuadrantChart     from './components/QuadrantChart'
import { useParams, useLocation, useNavigate } from 'react-router-dom'

// ── Dashboard & Results stubs ────────────────────────────────────────────────

function DashboardStub() {
  const navigate = useNavigate()
  const { id } = useParams()
  const location = useLocation()
  
  // Simulated state for demonstration of Prompt 9 requirement
  const hasTrajectory = location.state?.hasTrajectory

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
        <p style={{ color: '#E8C87A', fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.75rem', fontFamily: 'Cinzel, serif' }}>
          Coming in Prompt 6
        </p>
        <h2 style={{ color: '#F7F1E8', fontSize: '1.6rem', fontFamily: 'Cinzel, serif', fontWeight: 700, marginBottom: '0.75rem' }}>
          Brand Dashboard
        </h2>
        <p style={{ color: 'rgba(247,241,232,0.55)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '2rem' }}>
          Your brand profile has been saved. The full dashboard with recent scores,
          drift sparkline, and scoring entry will be built in the next prompt.
        </p>
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
        <Route path="/brands/:id/compass"        element={<CompassModePage />} />
        {/* Catch-all → redirect to landing */}
        <Route path="*"                          element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
