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
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        Retrieving history...
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--danger)' }}>
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
    <div style={{ fontFamily: 'var(--font-sans)', color: 'var(--color-text-primary)' }}>
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '0.25rem' }}>
              Drift Analytics
            </h1>
            <p style={{ color: 'var(--color-text-muted)' }}>
              Track your brand's consistency and distinctiveness over time.
            </p>
          </div>
          <button onClick={() => navigate(`/brands/${id}/score`)} className="btn-primary">
            Score New Content
          </button>
        </div>

        {history.length < 2 ? (
          <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '1rem', marginBottom: '1.5rem' }}>
              Score a few more pieces of content to start seeing your brand's trend.
            </p>
            <button
              onClick={() => navigate(`/brands/${id}/score`)}
              className="btn-primary"
            >
              Score New Content
            </button>
          </div>
        ) : (
          <>
            <div className="card" style={{ marginBottom: '2rem', height: 400, padding: '1.5rem' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="date" stroke="var(--color-text-muted)" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} />
                  <YAxis domain={[0, 100]} stroke="var(--color-text-muted)" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} tickFormatter={(tick) => `${tick}%`} />
                  <Tooltip
                    contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 6, color: 'var(--color-text-primary)', fontSize: '0.875rem' }}
                    itemStyle={{ fontWeight: 600 }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '0.875rem', color: 'var(--color-text-muted)' }} />
                  <Line type="monotone" name="Consistency" dataKey="consistency" stroke="var(--color-maroon)" strokeWidth={2} dot={{ fill: 'var(--color-maroon)', r: 3 }} activeDot={{ r: 5 }} />
                  <Line type="monotone" name="Distinctiveness" dataKey="distinctiveness" stroke="var(--color-gold)" strokeWidth={2} dot={{ fill: 'var(--color-gold)', r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>
                Content History
              </h2>
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>
                      <th style={{ padding: '0.875rem 1rem', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</th>
                      <th style={{ padding: '0.875rem 1rem', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quadrant</th>
                      <th style={{ padding: '0.875rem 1rem', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Consistency</th>
                      <th style={{ padding: '0.875rem 1rem', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Distinctiveness</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((item, idx) => (
                      <tr
                        key={idx}
                        onClick={() => navigate(`/brands/${id}/results`, { state: { result: item } })}
                        style={{
                          borderBottom: idx === history.length - 1 ? 'none' : '1px solid var(--color-border)',
                          cursor: 'pointer',
                          transition: 'background 0.15s'
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-hover)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '0.875rem 1rem', color: 'var(--color-text-primary)', fontSize: '0.875rem' }}>
                          {new Date(item.scored_at).toLocaleString()}
                        </td>
                        <td style={{ padding: '0.875rem 1rem' }}>
                          <span style={{
                            background: item.quadrant === 'on_brand' ? 'rgba(63,185,80,0.1)' : 'rgba(248,81,73,0.1)',
                            color: item.quadrant === 'on_brand' ? 'var(--success)' : 'var(--danger)',
                            padding: '0.2rem 0.5rem',
                            borderRadius: 4,
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            textTransform: 'capitalize',
                            letterSpacing: '0.02em'
                          }}>
                            {item.quadrant.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td style={{ padding: '0.875rem 1rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>
                          {(item.consistency_score * 100).toFixed(0)}%
                        </td>
                        <td style={{ padding: '0.875rem 1rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
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
      </div>
    </div>
  )
}
