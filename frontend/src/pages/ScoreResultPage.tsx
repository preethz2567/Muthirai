import { useLocation, useNavigate, useParams } from 'react-router-dom'
import QuadrantChart from '../components/QuadrantChart.tsx'
import AgentTracePanel from '../components/AgentTracePanel.tsx'
import { useState } from 'react'
import type { ContentScoreResult } from '../lib/api.ts'

export default function ScoreResultPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const result: ContentScoreResult | undefined = location.state?.result
  const [showTrace, setShowTrace] = useState(false)

  if (!result) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#F7F1E8' }}>
        <h2>No Result Found</h2>
        <button onClick={() => navigate(`/brands/${id}/dashboard`)}>Go to Dashboard</button>
      </div>
    )
  }

  const handleCopy = () => {
    if (result.suggested_rewrite) {
      navigator.clipboard.writeText(result.suggested_rewrite)
      alert('Copied to clipboard!')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #2A0810 0%, #4E141C 60%, #3A1000 100%)',
      fontFamily: 'Inter, sans-serif',
      padding: '3rem 2rem',
      color: '#F7F1E8',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      <div style={{ maxWidth: 1000, width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            {result.is_cached && (
              <div style={{
                background: 'rgba(184, 134, 46, 0.1)',
                border: '1px solid #B8862E',
                color: '#E8C87A',
                padding: '0.75rem 1rem',
                borderRadius: 4,
                marginBottom: '1rem',
                fontSize: '0.875rem'
              }}>
                <strong>Notice:</strong> The scoring service is currently unavailable or timed out. Showing a cached demo result.
              </div>
            )}
            <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: '2.5rem', margin: 0, color: '#E8C87A' }}>
              Score Results
            </h1>
            <p style={{ margin: '0.5rem 0 0 0', opacity: 0.8 }}>
              Quadrant: <strong>{result.quadrant.replace(/_/g, ' ')}</strong>
            </p>
          </div>
          <button
            onClick={() => navigate(`/brands/${id}/score`)}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#B8862E',
              border: 'none',
              borderRadius: 4,
              color: '#1A050A',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Score Another
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          {/* Left Column: Chart */}
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '2rem', borderRadius: 12, border: '1px solid rgba(184,134,46,0.2)' }}>
            <h3 style={{ fontFamily: 'Cinzel, serif', marginTop: 0, marginBottom: '1.5rem', textAlign: 'center' }}>Placement</h3>
            <QuadrantChart
              contentScore={{ x: result.distinctiveness_score, y: result.consistency_score }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem', fontSize: '0.875rem', opacity: 0.8 }}>
              <span>Consistency: {(result.consistency_score * 100).toFixed(0)}%</span>
              <span>Distinctiveness: {(result.distinctiveness_score * 100).toFixed(0)}%</span>
            </div>
          </div>

          {/* Right Column: Feedback */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Flagged Phrases */}
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '2rem', borderRadius: 12, border: '1px solid rgba(184,134,46,0.2)' }}>
              <h3 style={{ fontFamily: 'Cinzel, serif', marginTop: 0, marginBottom: '1rem', color: '#E8C87A' }}>
                Critic Agent Feedback
              </h3>
              {(result.flagged_phrases || []).length === 0 ? (
                <p style={{ opacity: 0.7 }}>No issues found! Your content is perfectly aligned.</p>
              ) : (
                <ul style={{ paddingLeft: '1.25rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {(result.flagged_phrases || []).map((fp, i) => (
                    <li key={i}>
                      <strong style={{ color: '#ff6b6b' }}>"{fp.phrase}"</strong>
                      <p style={{ margin: '0.25rem 0 0 0', opacity: 0.8, fontSize: '0.9rem' }}>{fp.reason}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Suggested Rewrite */}
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '2rem', borderRadius: 12, border: '1px solid rgba(184,134,46,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <h3 style={{ fontFamily: 'Cinzel, serif', margin: 0, color: '#E8C87A' }}>
                  Suggestion Agent Rewrite
                </h3>
                {result.suggested_rewrite && (
                  <button onClick={handleCopy} style={{ background: 'transparent', border: '1px solid #B8862E', color: '#E8C87A', borderRadius: 4, padding: '0.25rem 0.75rem', cursor: 'pointer', fontSize: '0.8rem' }}>
                    Copy
                  </button>
                )}
              </div>
              {result.suggested_rewrite ? (
                <p style={{ margin: 0, lineHeight: 1.6, fontSize: '1.05rem' }}>
                  {result.suggested_rewrite}
                </p>
              ) : (
                <p style={{ opacity: 0.7, margin: 0 }}>No rewrite needed.</p>
              )}
            </div>

            {/* Agent Trace Toggle */}
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '2rem', borderRadius: 12, border: '1px solid rgba(184,134,46,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontFamily: 'Cinzel, serif', margin: 0, color: '#E8C87A' }}>
                  Agent Trace
                </h3>
                <button 
                  onClick={() => setShowTrace(!showTrace)}
                  style={{ background: 'transparent', border: '1px solid #B8862E', color: '#E8C87A', borderRadius: 4, padding: '0.25rem 0.75rem', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  {showTrace ? 'Hide Reasoning' : 'View Agent Reasoning'}
                </button>
              </div>
              
              {showTrace && (
                <div style={{ marginTop: '1.5rem' }}>
                  <AgentTracePanel brandId={id || result.brand_id} contentId={result.content_id} />
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
