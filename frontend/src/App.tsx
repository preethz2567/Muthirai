/**
 * App.tsx â€” root router
 *
 * Routes:
 *   /                        â†’ Screen 01: LandingPage
 *   /setup                   â†’ Screen 02: BrandSetupPage
 *   /brands/:id/review       â†’ Screen 03: IdentityCardPage
 *   /brands/:id/dashboard    â†’ Stub (Screen 04 â€” coming in prompt 6)
 *   *                        â†’ Redirect to /
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LandingPage       from './pages/LandingPage.tsx'
import BrandSetupPage    from './pages/BrandSetupPage.tsx'
import IdentityCardPage  from './pages/IdentityCardPage.tsx'
import CompassModePage   from './pages/CompassModePage.tsx'
import ScoreContentPage  from './pages/ScoreContentPage.tsx'
import ScoreResultPage   from './pages/ScoreResultPage.tsx'
import DashboardPage       from './pages/DashboardPage.tsx'
import DriftDashboardPage  from './pages/DriftDashboardPage.tsx'
import AppShell            from './components/AppShell.tsx'
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"                          element={<LandingPage />} />
        <Route path="/setup"                     element={<BrandSetupPage />} />
        
        {/* Protected layout for brand routes */}
        <Route element={<AppShell />}>
          <Route path="/brands/:id/dashboard"      element={<DashboardPage />} />
          <Route path="/brands/:id/review"         element={<IdentityCardPage />} />
          <Route path="/brands/:id/score"          element={<ScoreContentPage />} />
          <Route path="/brands/:id/results"        element={<ScoreResultPage />} />
          <Route path="/brands/:id/compass"        element={<CompassModePage />} />
          <Route path="/brands/:id/drift"          element={<DriftDashboardPage />} />
          {/* Settings stub to avoid 404 */}
          <Route path="/brands/:id/settings"       element={<div className="card"><h2>Settings (Coming Soon)</h2></div>} />
        </Route>

        {/* Catch-all â†’ redirect to landing */}
        <Route path="*"                          element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}