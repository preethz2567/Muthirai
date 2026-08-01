import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getBrandHistory, type DriftHistoryItem } from '../lib/api.ts'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function DriftDashboardPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [history, setHistory] = useState<DriftHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    if (!id || id === 'draft') {
      if (mounted) setLoading(false)
      return
    }

    getBrandHistory(id)
      .then(data => {
        if (mounted) {
          setHistory(data)
          setLoading(false)
        }
      })
      .catch(err => {
        if (mounted) {
          console.error(err)
          setError(err.message || 'Failed to fetch drift history')
          setLoading(false)
        }
      })
    return () => { mounted = false }
  }, [id])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'linear-gradient(160deg, #2A0810 0%, #4E141C 60%, #3A1000 100%)', color: '#E8C87A' }}>
        Retrieving history...
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'linear-gradient(160deg, #2A0810 0%, #4E141C 60%, #3A1000 100%)', color: '#ff6b6b' }}>
        Error: {error}
      </div>
    )
  }

  const chartData = history.map(h => ({
    date: new Date(h.scored_at).toLocaleDateString(),
    consistency: parseFloat((h.consistency_score * 100).toFixed(1)),
    distinctiveness: parseFloat((h.distinctiveness_score * 100).toFixed(1)),
  }))

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #2A0810 0%, #4E141C 60%, #3A1000 100%)',
        fontFamily: 'var(--font-sans)',
        color: '#F7F1E8',
      }}
    >
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
            style={{ fontFamily: 'var(--font-heading)', color: '#E8C87A' }}
          >
            Muthirai
          </span>
        </div>
        <button onClick={() => navigate(`/brands/${id}/dashboard`)} className="btn-outline" style={{ fontSize: '0.8rem', padding: '0.4rem 1rem', background: 'transparent', border: '1px solid #E8C87A', color: '#E8C87A', borderRadius: 4, cursor: 'pointer' }}>
          ← Back to Dashboard
        </button>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-10 text-center">
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.5rem', fontWeight: 700, color: '#E8C87A', marginBottom: '0.5rem' }}>
            Drift Dashboard
          </h1>
          <p style={{ color: 'rgba(247,241,232,0.6)' }}>
            Track your brand's consistency and distinctiveness over time.
          </p>
        </div>

        {history.length < 2 ? (
          <div style={{ textAlign: 'center', padding: '4rem', background: 'rgba(184,134,46,0.1)', border: '1px solid rgba(184,134,46,0.3)', borderRadius: 12 }}>
            <p style={{ color: 'rgba(247,241,232,0.7)', fontSize: '1.1rem', marginBottom: '1.5rem' }}>
              Score a few more pieces of content to start seeing your brand's trend.
            </p>
            <button
              onClick={() => navigate(`/brands/${id}/score`)}
              style={{
                background: '#B8862E',
                color: '#1A050A',
                border: 'none',
                padding: '0.75rem 2rem',
                borderRadius: 4,
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Score New Content
            </button>
          </div>
        ) : (
          <>
            <div style={{ background: 'rgba(26,26,26,0.5)', padding: '2rem', borderRadius: 12, border: '1px solid rgba(184,134,46,0.2)', marginBottom: '2rem', height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(247,241,232,0.1)" />
                  <XAxis dataKey="date" stroke="rgba(247,241,232,0.5)" tick={{ fill: 'rgba(247,241,232,0.5)' }} />
                  <YAxis domain={[0, 100]} stroke="rgba(247,241,232,0.5)" tick={{ fill: 'rgba(247,241,232,0.5)' }} tickFormatter={(tick) => `${tick}%`} />
                  <Tooltip 
                    contentStyle={{ background: '#1A1A1A', border: '1px solid rgba(184,134,46,0.5)', borderRadius: 8, color: '#F7F1E8' }}
                    itemStyle={{ fontWeight: 'bold' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Line type="monotone" name="Consistency" dataKey="consistency" stroke="#7A1F2B" strokeWidth={3} dot={{ fill: '#7A1F2B', r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" name="Distinctiveness" dataKey="distinctiveness" stroke="#B8862E" strokeWidth={3} dot={{ fill: '#B8862E', r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', color: '#E8C87A', marginBottom: '1rem' }}>
                Content History
              </h2>
              <div style={{ background: 'rgba(26,26,26,0.5)', borderRadius: 12, border: '1px solid rgba(184,134,46,0.2)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'rgba(184,134,46,0.1)', borderBottom: '1px solid rgba(184,134,46,0.2)' }}>
                      <th style={{ padding: '1rem', fontWeight: 600, color: '#E8C87A', fontSize: '0.875rem' }}>Date</th>
                      <th style={{ padding: '1rem', fontWeight: 600, color: '#E8C87A', fontSize: '0.875rem' }}>Quadrant</th>
                      <th style={{ padding: '1rem', fontWeight: 600, color: '#E8C87A', fontSize: '0.875rem', textAlign: 'right' }}>Consistency</th>
                      <th style={{ padding: '1rem', fontWeight: 600, color: '#E8C87A', fontSize: '0.875rem', textAlign: 'right' }}>Distinctiveness</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((item, idx) => (
                      <tr 
                        key={idx} 
                        onClick={() => navigate(`/brands/${id}/results`, { state: { result: item } })}
                        style={{ 
                          borderBottom: idx === history.length - 1 ? 'none' : '1px solid rgba(247,241,232,0.1)',
                          cursor: 'pointer',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(184,134,46,0.05)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '1rem', color: 'rgba(247,241,232,0.8)', fontSize: '0.9rem' }}>
                          {new Date(item.scored_at).toLocaleString()}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{ 
                            background: 'rgba(184,134,46,0.15)', 
                            color: '#E8C87A', 
                            padding: '0.25rem 0.5rem', 
                            borderRadius: 4, 
                            fontSize: '0.75rem', 
                            fontWeight: 'bold', 
                            textTransform: 'uppercase', 
                            letterSpacing: '0.05em' 
                          }}>
                            {item.quadrant.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>
                          {(item.consistency_score * 100).toFixed(0)}%
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: '#B8862E' }}>
                          {(item.distinctiveness_score * 100).toFixed(0)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
