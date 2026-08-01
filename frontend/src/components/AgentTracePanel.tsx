import { useEffect, useState } from 'react'
import { getAgentTrace } from '../lib/api.ts'
import type { AgentTraceStep } from '../lib/api.ts'

interface AgentTracePanelProps {
  brandId: string
  contentId: string
}

export default function AgentTracePanel({ brandId, contentId }: AgentTracePanelProps) {
  const [steps, setSteps] = useState<AgentTraceStep[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const fetchTrace = async () => {
      try {
        setLoading(true)
        const data = await getAgentTrace(brandId, contentId)
        if (mounted) {
          setSteps(data)
          setError(null)
        }
      } catch (err: any) {
        if (mounted) setError(err.message || 'Failed to fetch agent trace')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchTrace()
    return () => { mounted = false }
  }, [brandId, contentId])

  if (loading) {
    return <div style={{ color: 'rgba(247,241,232,0.7)', fontSize: '0.9rem', fontStyle: 'italic' }}>Retrieving agent traces...</div>
  }

  if (error) {
    return <div style={{ color: '#ff6b6b', fontSize: '0.9rem' }}>Error: {error}</div>
  }

  if (steps.length === 0) {
    return <div style={{ color: 'rgba(247,241,232,0.7)', fontSize: '0.9rem' }}>No trace steps found.</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {steps.map((step, index) => {
        const isExpanded = expandedStepId === step.id
        return (
          <div key={step.id} style={{
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(184,134,46,0.3)',
            borderRadius: 6,
            overflow: 'hidden',
          }}>
            <button
              onClick={() => setExpandedStepId(isExpanded ? null : step.id)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                background: isExpanded ? 'rgba(184,134,46,0.1)' : 'transparent',
                border: 'none',
                color: '#F7F1E8',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ 
                  background: '#B8862E', 
                  color: '#1A050A', 
                  fontWeight: 700, 
                  fontSize: '0.75rem',
                  padding: '0.1rem 0.4rem', 
                  borderRadius: 4 
                }}>
                  {index + 1}
                </span>
                <span style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.85rem' }}>
                  {step.agent_name}
                </span>
              </div>
              <span style={{ 
                fontSize: '0.75rem', 
                color: step.status === 'done' ? '#4ade80' : 'rgba(247,241,232,0.5)' 
              }}>
                {step.status}
              </span>
            </button>
            
            {isExpanded && (
              <div style={{ padding: '1rem', borderTop: '1px solid rgba(184,134,46,0.2)', fontSize: '0.875rem' }}>
                <div style={{ marginBottom: '1rem' }}>
                  <strong style={{ color: '#E8C87A', display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', textTransform: 'uppercase' }}>Input Snippet</strong>
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: 4, fontFamily: 'var(--font-mono)', opacity: 0.9 }}>
                    {step.input_snippet || 'No input'}
                  </div>
                </div>
                <div>
                  <strong style={{ color: '#E8C87A', display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', textTransform: 'uppercase' }}>Output Snippet</strong>
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: 4, fontFamily: 'var(--font-mono)', opacity: 0.9 }}>
                    {step.output_snippet || 'No output'}
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
