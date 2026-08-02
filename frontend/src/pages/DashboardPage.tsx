import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getBrandHistory, getAgentTrace, uploadReferenceImages, type DriftHistoryItem, type AgentTraceStep } from '../lib/api'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export default function DashboardPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [history, setHistory] = useState<DriftHistoryItem[]>([])
  const [trace, setTrace] = useState<AgentTraceStep[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [refImages, setRefImages] = useState<File[]>([])
  const [uploadingRef, setUploadingRef] = useState(false)

  const handleRefImageUpload = async () => {
    if (!id || refImages.length === 0) return
    setUploadingRef(true)
    try {
      await uploadReferenceImages(id, refImages)
      alert("Reference images saved successfully!")
      setRefImages([])
    } catch (e: any) {
      alert("Failed to save reference images: " + e.message)
    } finally {
      setUploadingRef(false)
    }
  }

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
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 400, color: 'var(--color-text-primary)', letterSpacing: '-0.03em', marginBottom: '0.25rem' }}>Overview</h1>
          <p style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)' }}>Brand consistency is currently {healthLabel}</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn-outline" onClick={() => navigate(`/brands/${id}/drift`)}>View History</button>
          <button className="btn-primary" onClick={() => navigate(`/brands/${id}/score`)}>Quick Validate</button>
        </div>
      </div>

      {/* Grid Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        
        {/* Card 1: Brand Health */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {/* Header with guilloché texture */}
          <div
            className="guilloche-texture"
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              marginBottom: '1rem',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--color-surface)',
            }}
          >
            <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-text-muted)', margin: 0 }}>Brand Health</h3>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--color-brass)', letterSpacing: '0.05em' }}>REGISTRY</span>
          </div>
          <div style={{ position: 'relative', width: ringSize, height: ringSize }}>
            <svg width={ringSize} height={ringSize} style={{ transform: 'rotate(-90deg)' }}>
              <circle
                cx={ringSize/2} cy={ringSize/2} r={ringRadius}
                fill="none" stroke="var(--color-border)" strokeWidth={ringStroke}
              />
              <circle
                cx={ringSize/2} cy={ringSize/2} r={ringRadius}
                fill="none" stroke="var(--color-verified)" strokeWidth={ringStroke - 2}
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringOffset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 1.2s ease-in-out' }}
              />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                {Math.round(avgConsistency * 100)}%
              </span>
            </div>
          </div>
          <div style={{ marginTop: '1rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-verified)' }}>{healthLabel}</div>
          <div style={{ width: '100%', marginTop: '1.5rem' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: '0.35rem' }}>
               <span>DISTINCTIVENESS</span>
               <span>{Math.round((history.reduce((acc, curr) => acc + curr.distinctiveness_score, 0) / history.length) * 100)}%</span>
             </div>
             <div style={{ width: '100%', height: 3, background: 'var(--color-border)', borderRadius: 1, overflow: 'hidden' }}>
               <div style={{ height: '100%', background: 'var(--color-brass)', width: `${(history.reduce((acc, curr) => acc + curr.distinctiveness_score, 0) / history.length) * 100}%`, transition: 'width 1.2s ease' }} />
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
             <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                Content <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{latestScore.content_id.slice(0, 8)}</span>
             </div>
             <div style={{ fontFamily: 'var(--font-mono)', fontSize: '2rem', fontWeight: 600, color: 'var(--color-oxblood)', letterSpacing: '-0.02em', marginTop: '0.25rem' }}>
                {Math.round(latestScore.consistency_score * 100)}
             </div>
          </div>
          <div style={{ background: 'var(--color-ink)', padding: '0.875rem', borderRadius: 2, border: '1px solid var(--color-border)', flex: 1, marginBottom: '1rem' }}>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.85rem', color: 'var(--color-text-muted)', fontStyle: 'italic', lineHeight: 1.6 }}>
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
                 <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                 <YAxis stroke="var(--color-text-muted)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(tick) => `${tick}%`} />
                 <Tooltip contentStyle={{ borderRadius: 2, border: '1px solid var(--color-border)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', background: 'var(--color-surface-raised)', color: 'var(--color-text-primary)' }} cursor={{ fill: 'rgba(184,137,74,0.05)' }} />
                 <Bar dataKey="score" fill="var(--color-oxblood)" radius={[1, 1, 0, 0]} />
               </BarChart>
             </ResponsiveContainer>
          </div>
        </div>

        {/* Card 4: Latest Rewrite */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', background: 'var(--color-ink)', border: '1px solid var(--color-border)' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
             <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 400, letterSpacing: '-0.01em' }}>Latest Rewrite</h3>
             <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 500, color: 'var(--color-brass)', background: 'rgba(184,137,74,0.08)', padding: '0.2rem 0.5rem', borderRadius: 2, letterSpacing: '0.08em' }}>
               REWRITTEN
             </span>
           </div>
           <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: 'var(--color-text-primary)', lineHeight: 1.6, flex: 1 }}>
             {suggestedRewrite}
           </p>
           <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
             <a href="#" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--color-brass)', fontWeight: 500, textDecoration: 'none', letterSpacing: '0.03em' }}>APPLY SUGGESTION</a>
             <a href="#" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 500, textDecoration: 'none', letterSpacing: '0.03em' }}>COMPARE ORIGINAL</a>
           </div>
        </div>

      </div>

      {/* Reference Images Upload */}
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Reference Images</h3>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Upload 3-5 images (e.g., logo usage, marketing visuals) to establish your brand's visual centroid.
          </p>
          <input 
            type="file" 
            multiple 
            accept="image/*"
            onChange={(e) => {
              if (e.target.files) {
                setRefImages(prev => [...prev, ...Array.from(e.target.files!)])
              }
            }}
            disabled={uploadingRef}
            style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}
          />
          {refImages.length > 0 && (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
               {refImages.map((f, i) => (
                 <div key={i} style={{ fontSize: '0.75rem', background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', padding: '0.25rem 0.5rem', borderRadius: 4, color: 'var(--color-text-primary)' }}>
                   {f.name}
                 </div>
               ))}
            </div>
          )}
          <button 
            className="btn-primary" 
            onClick={handleRefImageUpload} 
            disabled={refImages.length === 0 || uploadingRef}
            style={{ alignSelf: 'flex-start', opacity: (refImages.length === 0 || uploadingRef) ? 0.5 : 1 }}
          >
            {uploadingRef ? 'Saving...' : 'Save Reference Images'}
          </button>
        </div>
      </div>

      {/* Activity Log */}
      <div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Activity Log</h3>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Content Name</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Type</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Date</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {[...history].reverse().map((item, idx) => {
                const isWarning = item.quadrant === 'off_brand' || item.quadrant === 'bold_off_brand';
                const statusColor = isWarning ? 'var(--danger)' : 'var(--success)';
                const statusBg = isWarning ? 'rgba(192, 57, 43, 0.1)' : 'rgba(45, 106, 79, 0.1)';
                const statusLabel = isWarning ? 'Drift Detected' : 'Verified';

                return (
                  <tr key={item.content_id} style={{ borderBottom: idx === history.length - 1 ? 'none' : '1px solid var(--color-border)' }}>
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
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
                      >
                        •••
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