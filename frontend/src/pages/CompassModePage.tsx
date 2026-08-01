import { useState, useRef, useEffect } from 'react'
import type { KeyboardEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { chatTrajectory, confirmTrajectory } from '../lib/api'
import type { ChatMessage, TargetCard } from '../lib/api'

export default function CompassModePage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [history, setHistory] = useState<ChatMessage[]>([{
    role: 'assistant',
    content: "I'm the Trajectory Agent. How would you like to evolve your brand's identity? (e.g., 'Make us sound more rebellious and modern.')"
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)
  
  const [targetCard, setTargetCard] = useState<TargetCard | null>(null)
  
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [history])

  async function handleSend() {
    if (!input.trim() || loading || !id) return
    const msg = input.trim()
    setInput('')
    
    const newHistory: ChatMessage[] = [...history, { role: 'user', content: msg }]
    setHistory(newHistory)
    setLoading(true)

    try {
      const res = await chatTrajectory(id, newHistory)
      setHistory(prev => [...prev, { role: 'assistant', content: res.response_message }])
      setTargetCard(res.target_card)
    } catch (err) {
      console.error(err)
      setHistory(prev => [...prev, { role: 'assistant', content: 'Network error. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleSend()
  }

  async function handleConfirm() {
    if (!id || !targetCard || confirming) return
    setConfirming(true)
    try {
      await confirmTrajectory(id, targetCard, history)
      // Navigate back to the dashboard, indicating active trajectory via state
      navigate(`/brands/${id}/dashboard`, { state: { hasTrajectory: true } })
    } catch (err) {
      console.error(err)
    } finally {
      setConfirming(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        background: 'linear-gradient(160deg, #2A0810 0%, #4E141C 60%, #3A1000 100%)',
        fontFamily: 'Inter, sans-serif',
        color: '#F7F1E8',
      }}
    >
      {/* ── Left Pane: Chat ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '2rem', borderRight: '1px solid rgba(184,134,46,0.2)' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <button
            onClick={() => navigate(`/brands/${id}/dashboard`)}
            style={{ background: 'transparent', border: 'none', color: '#E8C87A', cursor: 'pointer', fontFamily: 'Cinzel, serif', fontSize: '0.875rem' }}
          >
            ← Back to Dashboard
          </button>
          <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: '2rem', marginTop: '1rem', marginBottom: '0.5rem' }}>
            Compass Mode
          </h1>
          <p style={{ color: 'rgba(247,241,232,0.6)', fontSize: '0.875rem' }}>
            Chat with the strategist to define your target identity.
          </p>
        </div>

        <div
          ref={scrollRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            paddingRight: '1rem',
            marginBottom: '1rem'
          }}
        >
          {history.map((msg, i) => (
            <div
              key={i}
              style={{
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                background: msg.role === 'user' ? 'rgba(184,134,46,0.15)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${msg.role === 'user' ? 'rgba(184,134,46,0.3)' : 'rgba(255,255,255,0.1)'}`,
                padding: '1rem 1.25rem',
                borderRadius: msg.role === 'user' ? '12px 12px 0 12px' : '12px 12px 12px 0',
                maxWidth: '75%',
                lineHeight: 1.5,
              }}
            >
              {msg.content}
            </div>
          ))}
          {loading && (
            <div style={{ alignSelf: 'flex-start', color: '#E8C87A', fontStyle: 'italic', fontSize: '0.875rem' }}>
              Strategist is thinking...
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="E.g., We want to sound less corporate..."
            style={{
              flex: 1,
              background: 'rgba(0,0,0,0.2)',
              border: '1px solid rgba(184,134,46,0.4)',
              color: '#FFF',
              padding: '1rem',
              borderRadius: 4,
              fontFamily: 'Inter, sans-serif'
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            style={{
              background: '#B8862E',
              color: '#2A0810',
              border: 'none',
              borderRadius: 4,
              padding: '0 2rem',
              fontWeight: 600,
              cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
              opacity: input.trim() && !loading ? 1 : 0.5,
            }}
          >
            Send
          </button>
        </div>
      </div>

      {/* ── Right Pane: Live Target Card ────────────────────────────────────── */}
      <div style={{ width: '400px', background: 'rgba(0,0,0,0.2)', padding: '2.5rem', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.25rem', color: '#E8C87A', marginBottom: '1.5rem', letterSpacing: '0.05em' }}>
          Target Identity
        </h2>
        
        {targetCard ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div>
              <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(247,241,232,0.5)', marginBottom: '0.75rem' }}>Tone Words</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {targetCard.tone_words.map(w => (
                  <span key={w} style={{ background: '#7A1F2B', padding: '4px 10px', borderRadius: 4, fontSize: '0.85rem' }}>{w}</span>
                ))}
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(247,241,232,0.5)', marginBottom: '0.75rem' }}>Core Values</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {targetCard.core_values.map(v => (
                  <span key={v} style={{ border: '1px solid #B8862E', color: '#E8C87A', padding: '4px 10px', borderRadius: 4, fontSize: '0.85rem' }}>{v}</span>
                ))}
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(247,241,232,0.5)', marginBottom: '0.75rem' }}>Vocabulary</h3>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#F7F1E8', fontSize: '0.9rem', lineHeight: 1.6 }}>
                {targetCard.vocabulary.map(v => (
                  <li key={v}>{v}</li>
                ))}
              </ul>
            </div>
            
            <div style={{ marginTop: 'auto' }}>
              <button
                onClick={handleConfirm}
                disabled={confirming}
                style={{
                  width: '100%',
                  background: '#F7F1E8',
                  color: '#2A0810',
                  padding: '1rem',
                  borderRadius: 4,
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '1rem',
                  cursor: confirming ? 'not-allowed' : 'pointer',
                  opacity: confirming ? 0.7 : 1,
                  fontFamily: 'Inter, sans-serif'
                }}
              >
                {confirming ? 'Confirming...' : 'Confirm This Direction'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'rgba(247,241,232,0.3)', fontSize: '0.875rem', lineHeight: 1.6 }}>
            Chat with the strategist to generate<br/>a target identity profile.
          </div>
        )}
      </div>
    </div>
  )
}
