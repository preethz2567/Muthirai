import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getBrandHistory, getAgentTrace, type DriftHistoryItem, type AgentTraceStep } from '../lib/api'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export default function DashboardPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [history, setHistory] = useState<DriftHistoryItem[]>([])
  const [trace, setTrace] = useState<AgentTraceStep[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const fetchData = async () => {
      if (!id) return
      try {
        setLoading(true)
        const historyData = await getBrandHistory(id)
        if (!mounted) return
        setHistory(historyData)
        
        if (historyData.length > 0) {
          // get the most recent score trace
          const latestItem = historyData[historyData.length - 1]
          try {
             const traceData = await getAgentTrace(id, latestItem.content_id)
             if (mounted) setTrace(traceData)
          } catch(e) {
             console.warn("Failed to get trace for dashboard", e)
          }
        }
      } catch (err: any) {
        if (mounted) setError(err.message || 'Failed to fetch dashboard data')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchData()
    return () => { mounted = false }
  }, [id])

  if (loading) {
    return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading overview...</div>
  }

  if (error) {
    return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--danger)' }}>{error}</div>
  }

  if (history.length === 0) {
    return (
      <div className="max-w-5xl mx-auto pb-20">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Overview</h1>
            <p style={{ color: 'var(--text-muted)' }}>Brand consistency is currently Unknown</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn-outline" onClick={() => navigate(`/brands/${id}/drift`)}>View History</button>
            <button className="btn-primary" onClick={() => navigate(`/brands/${id}/score`)}>Quick Validate</button>
          </div>
        </div>
        <div className="card" style={{ padding: '4rem', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>No validations yet</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Run your first piece of content through the scoring engine to generate brand insights.</p>
          <button className="btn-primary" onClick={() => navigate(`/brands/${id}/score`)}>Score New Content</button>
        </div>
      </div>
    )
  }

  // Calculate stats
  const avgConsistency = history.reduce((acc, curr) => acc + curr.consistency_score, 0) / history.length
  let healthLabel = "Needs Work"
  if (avgConsistency >= 0.8) healthLabel = "Excellent"
  else if (avgConsistency >= 0.5) healthLabel = "Good"

  // Ring SVG logic
  const ringSize = 120
  const ringStroke = 12
  const ringRadius = (ringSize - ringStroke) / 2
  const ringCircumference = 2 * Math.PI * ringRadius
  const ringOffset = ringCircumference - (avgConsistency * ringCircumference)

  // Chart data
  const chartData = history.slice(-7).map(item => ({
    name: new Date(item.scored_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    score: Math.round(item.consistency_score * 100)
  }))

  const latestScore = history[history.length - 1]
  const previousScore = history.length > 1 ? history[history.length - 2] : null
  const percentChange = previousScore 
    ? Math.round((latestScore.consistency_score - previousScore.consistency_score) * 100)
    : 0

  // Critic reasoning
  const criticStep = trace?.find(t => t.agent_name === 'critic')
  const suggestionStep = trace?.find(t => t.agent_name === 'suggestion')
  const criticReasoning = criticStep?.output_snippet || "No specific flags found."
  const suggestedRewrite = suggestionStep?.output_snippet || "No rewrite generated."

  return (
    <div className="max-w-5xl mx-auto pb-20">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Overview</h1>
          <p style={{ color: 'var(--text-muted)' }}>Brand consistency is currently {healthLabel}</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn-outline" onClick={() => navigate(`/brands/${id}/drift`)}>View History</button>
          <button className="btn-primary" onClick={() => navigate(`/brands/${id}/score`)}>Quick Validate</button>
        </div>
      </div>

      {/* Grid Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        
        {/* Card 1: Brand Health */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, alignSelf: 'flex-start', marginBottom: '1.5rem' }}>Brand Health</h3>
          <div style={{ position: 'relative', width: ringSize, height: ringSize }}>
            <svg width={ringSize} height={ringSize} style={{ transform: 'rotate(-90deg)' }}>
              <circle
                cx={ringSize/2} cy={ringSize/2} r={ringRadius}
                fill="none" stroke="var(--border)" strokeWidth={ringStroke}
              />
              <circle
                cx={ringSize/2} cy={ringSize/2} r={ringRadius}
                fill="none" stroke="var(--maroon)" strokeWidth={ringStroke}
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringOffset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
              />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {Math.round(avgConsistency * 100)}%
              </span>
            </div>
          </div>
          <div style={{ marginTop: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{healthLabel}</div>
          <div style={{ width: '100%', marginTop: '1.5rem' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
               <span>Distinctiveness</span>
               <span>{Math.round((history.reduce((acc, curr) => acc + curr.distinctiveness_score, 0) / history.length) * 100)}%</span>
             </div>
             <div style={{ width: '100%', height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
               <div style={{ height: '100%', background: '#B8862E', width: `${(history.reduce((acc, curr) => acc + curr.distinctiveness_score, 0) / history.length) * 100}%` }} />
             </div>
          </div>
        </div>

        {/* Card 2: Recent Validation */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
             <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Recent Validation</h3>
             <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {new Date(latestScore.scored_at).toLocaleDateString()}
             </span>
          </div>
          <div style={{ marginBottom: '1rem' }}>
             <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>
               Content {latestScore.content_id.slice(0, 8)}
             </div>
             <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--maroon)' }}>
               {Math.round(latestScore.consistency_score * 100)}
             </div>
          </div>
          <div style={{ background: 'var(--bg)', padding: '1rem', borderRadius: 6, flex: 1, marginBottom: '1rem' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontStyle: 'italic', lineHeight: 1.5 }}>
              "{criticReasoning}"
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
             <button className="btn-outline" style={{ flex: 1, padding: '0.5rem', fontSize: '0.75rem' }}>Download Detailed Audit</button>
             <button className="btn-outline" style={{ flex: 1, padding: '0.5rem', fontSize: '0.75rem' }}>Share Analytics</button>
          </div>
        </div>

        {/* Card 3: Brand Drift */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
             <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Brand Drift</h3>
             <div style={{ 
               fontSize: '0.75rem', 
               fontWeight: 600, 
               color: percentChange >= 0 ? 'var(--success)' : 'var(--danger)',
               background: percentChange >= 0 ? 'rgba(45, 106, 79, 0.1)' : 'rgba(192, 57, 43, 0.1)',
               padding: '0.25rem 0.5rem',
               borderRadius: 4
             }}>
               {percentChange >= 0 ? '+' : ''}{percentChange}%
             </div>
          </div>
          <div style={{ height: 200 }}>
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                 <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                 <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(tick) => `${tick}%`} />
                 <Tooltip contentStyle={{ borderRadius: 6, border: '1px solid var(--border)', fontSize: '0.75rem' }} cursor={{ fill: 'var(--bg)' }} />
                 <Bar dataKey="score" fill="var(--maroon)" radius={[4, 4, 0, 0]} />
               </BarChart>
             </ResponsiveContainer>
          </div>
        </div>

        {/* Card 4: Latest Rewrite */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg)', border: 'none' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
             <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Latest Rewrite</h3>
             <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', background: 'var(--border)', padding: '0.25rem 0.5rem', borderRadius: 4, letterSpacing: '0.05em' }}>
               REWRITTEN VERSION
             </span>
           </div>
           <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.6, flex: 1 }}>
             {suggestedRewrite}
           </p>
           <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
             <a href="#" style={{ fontSize: '0.875rem', color: 'var(--maroon)', fontWeight: 600, textDecoration: 'none' }}>Apply Suggestion</a>
             <a href="#" style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 600, textDecoration: 'none' }}>Compare Original</a>
           </div>
        </div>

      </div>

      {/* Activity Log */}
      <div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Activity Log</h3>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Content Name</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Type</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Date</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {[...history].reverse().map((item, idx) => {
                const isWarning = item.quadrant === 'off_brand' || item.quadrant === 'bold_off_brand';
                const statusColor = isWarning ? 'var(--danger)' : 'var(--success)';
                const statusBg = isWarning ? 'rgba(192, 57, 43, 0.1)' : 'rgba(45, 106, 79, 0.1)';
                const statusLabel = isWarning ? 'Drift Detected' : 'Verified';

                return (
                  <tr key={item.content_id} style={{ borderBottom: idx === history.length - 1 ? 'none' : '1px solid var(--border)' }}>
                    <td style={{ padding: '1rem', color: 'var(--text-primary)', fontSize: '0.875rem', fontWeight: 500 }}>
                      Content {item.content_id.slice(0, 8)}
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      Text
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      {new Date(item.scored_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ 
                        background: statusBg,
                        color: statusColor,
                        padding: '0.25rem 0.5rem',
                        borderRadius: 4,
                        fontSize: '0.75rem',
                        fontWeight: 600
                      }}>
                        {statusLabel}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <button 
                        onClick={() => navigate(`/brands/${id}/results`, { state: { result: item } })}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                      >
                        â€¢â€¢â€¢
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}