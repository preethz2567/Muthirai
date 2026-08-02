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
      background: 'var(--color-bg)',
      fontFamily: 'var(--font-sans)',
      padding: '3rem 2rem',
      color: 'var(--color-text-primary)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      <div style={{ maxWidth: 1000, width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            {result.is_cached && (
              <div style={{
                background: 'rgba(227,179,65,0.08)',
                border: '1px solid rgba(227,179,65,0.3)',
                color: 'var(--color-gold)',
                padding: '0.75rem 1rem',
                borderRadius: 6,
                marginBottom: '1rem',
                fontSize: '0.875rem'
              }}>
                <strong>Notice:</strong> The scoring service is currently unavailable or timed out. Showing a cached demo result.
              </div>
            )}
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', margin: 0, color: 'var(--color-text-primary)' }}>
              Score Results
            </h1>
            <p style={{ margin: '0.5rem 0 0 0', opacity: 0.8 }}>
              Quadrant: <strong>{result.quadrant.replace(/_/g, ' ')}</strong>
            </p>
          </div>
          <button
            onClick={() => navigate(`/brands/${id}/score`)}
            className="btn-outline"
          >
            Score Another
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          {/* Left Column: Chart */}
          <div style={{ background: 'var(--color-surface)', padding: '2rem', borderRadius: 6, border: '1px solid var(--color-border)' }}>
            {result.modality === 'image' && result.preview_url && (
              <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                <img src={result.preview_url} alt="Uploaded preview" style={{ maxHeight: 200, maxWidth: '100%', borderRadius: 8, objectFit: 'contain' }} />
              </div>
            )}
            <h3 style={{ fontFamily: 'var(--font-heading)', marginTop: 0, marginBottom: '1.5rem', textAlign: 'center' }}>Placement</h3>
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
            <div style={{ background: 'var(--color-surface)', padding: '2rem', borderRadius: 6, border: '1px solid var(--color-border)' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', marginTop: 0, marginBottom: '1rem', color: 'var(--color-text-primary)' }}>
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
            <div style={{ background: 'var(--color-surface)', padding: '2rem', borderRadius: 6, border: '1px solid var(--color-border)' }}>
              {result.modality === 'pdf' && (
                <div style={{ padding: '0.5rem 1rem', background: 'rgba(196,72,92,0.08)', border: '1px solid rgba(196,72,92,0.25)', borderRadius: 6, marginBottom: '1rem', color: 'var(--color-text-muted)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>📄</span> Text extracted from PDF
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <h3 style={{ fontFamily: 'var(--font-heading)', margin: 0, color: 'var(--color-text-primary)' }}>
                  {result.modality === 'image' ? 'Suggestion Agent Tip' : 'Suggestion Agent Rewrite'}
                </h3>
                {result.suggested_rewrite && result.modality !== 'image' && (
                  <button onClick={handleCopy} className="btn-outline" style={{ fontSize: '0.8rem', padding: '0.25rem 0.75rem' }}>
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
            <div style={{ background: 'var(--color-surface)', padding: '2rem', borderRadius: 6, border: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontFamily: 'var(--font-heading)', margin: 0, color: 'var(--color-text-primary)' }}>
                  Agent Trace
                </h3>
                <button 
                  onClick={() => setShowTrace(!showTrace)}
                  className="btn-outline"
                  style={{ fontSize: '0.8rem', padding: '0.25rem 0.75rem' }}
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
