import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { scoreContent } from '../lib/api.ts'

export default function ScoreContentPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [content, setContent] = useState('')
  const [modality, setModality] = useState<'text' | 'image'>('text')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isScoring, setIsScoring] = useState(false)
  const [stageIndex, setStageIndex] = useState(0)

  const STAGES = [
    "Embedding content (all-MiniLM-L6-v2)...",
    "Scoring vs brand and generic centroids...",
    "Critic Agent analyzing...",
    "Suggestion Agent rewriting..."
  ]

  const handleScore = async () => {
    if (modality === 'text' && !content.trim()) return
    if (modality === 'image' && !imageFile) return
    setIsScoring(true)
    
    // Simulate pipeline stages visually for the demo
    const interval = setInterval(() => {
      setStageIndex(prev => Math.min(prev + 1, 3))
    }, 1200)

    try {
      const payload = modality === 'image' ? imageFile! : content;
      const result = await scoreContent(id || 'draft', payload, modality)
      if (modality === 'image') {
        result.modality = 'image';
        result.preview_url = previewUrl || undefined;
      }
      clearInterval(interval)
      navigate(`/brands/${id}/results`, { state: { result } })
    } catch (err: any) {
      clearInterval(interval)
      setIsScoring(false)
      setStageIndex(0)
      alert(err.message || 'Failed to score content')
    }
  }

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]
      setImageFile(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      setImageFile(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(160deg, #2A0810 0%, #4E141C 60%, #3A1000 100%)',
      fontFamily: 'var(--font-sans)',
      padding: '2rem'
    }}>
      <div style={{
        background: 'rgba(184,134,46,0.08)',
        border: '1px solid rgba(184,134,46,0.3)',
        borderRadius: 12,
        padding: '3rem',
        maxWidth: 600,
        width: '100%',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        textAlign: 'center'
      }}>
        
        <h2 style={{ color: '#F7F1E8', fontFamily: 'var(--font-heading)', fontSize: '2rem', marginBottom: '0.5rem' }}>
          Score Content
        </h2>
        <p style={{ color: 'rgba(247,241,232,0.7)', marginBottom: '2rem' }}>
          Test your marketing copy or visual assets against your brand's unique fingerprint.
        </p>

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <button 
            type="button"
            onClick={() => setModality('text')}
            style={{
              padding: '0.5rem 1.5rem',
              background: modality === 'text' ? 'rgba(184,134,46,0.25)' : 'transparent',
              color: modality === 'text' ? '#E8C87A' : 'rgba(247,241,232,0.45)',
              border: '1px solid',
              borderColor: modality === 'text' ? '#B8862E' : 'rgba(184,134,46,0.3)',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Text
          </button>
          <button 
            type="button"
            onClick={() => setModality('image')}
            style={{
              padding: '0.5rem 1.5rem',
              background: modality === 'image' ? 'rgba(184,134,46,0.25)' : 'transparent',
              color: modality === 'image' ? '#E8C87A' : 'rgba(247,241,232,0.45)',
              border: '1px solid',
              borderColor: modality === 'image' ? '#B8862E' : 'rgba(184,134,46,0.3)',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Image
          </button>
        </div>

        {modality === 'text' ? (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={isScoring}
            placeholder="e.g. Elevate your workflow with our cutting-edge, seamless solution..."
            style={{
              width: '100%',
              height: 200,
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(184,134,46,0.4)',
              borderRadius: 8,
              color: '#F7F1E8',
              padding: '1rem',
              fontSize: '1rem',
              lineHeight: 1.5,
              fontFamily: 'var(--font-sans)',
              resize: 'vertical',
              marginBottom: '1.5rem',
              outline: 'none',
            }}
          />
        ) : (
          <div 
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            style={{
              width: '100%',
              height: 200,
              background: 'rgba(0,0,0,0.3)',
              border: '1px dashed rgba(184,134,46,0.6)',
              borderRadius: 8,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.5rem',
              position: 'relative',
              cursor: 'pointer'
            }}
          >
            {previewUrl ? (
              <img src={previewUrl} alt="Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 8 }} />
            ) : (
              <>
                <div style={{ color: '#E8C87A', fontSize: '2rem', marginBottom: '0.5rem' }}>â§</div>
                <p style={{ color: 'rgba(247,241,232,0.7)', margin: 0 }}>Drag and drop an image here</p>
                <p style={{ color: 'rgba(247,241,232,0.4)', fontSize: '0.8rem', marginTop: '0.25rem' }}>or click to browse</p>
              </>
            )}
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleFileSelect}
              style={{
                position: 'absolute',
                top: 0, left: 0, width: '100%', height: '100%',
                opacity: 0, cursor: 'pointer'
              }}
            />
          </div>
        )}

        {isScoring ? (
          <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
            <p style={{ color: '#E8C87A', fontWeight: 600, letterSpacing: '0.05em' }}>
              {STAGES[stageIndex]}
            </p>
            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', marginTop: '0.75rem' }}>
              {STAGES.map((_, i) => (
                <div key={i} style={{
                  height: 4,
                  width: 24,
                  background: i <= stageIndex ? '#B8862E' : 'rgba(247,241,232,0.1)',
                  borderRadius: 2,
                  transition: 'background 0.3s ease'
                }} />
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={() => navigate(`/brands/${id}/dashboard`)}
              style={{
                flex: 1,
                padding: '0.875rem',
                background: 'transparent',
                border: '1px solid rgba(247,241,232,0.3)',
                color: '#F7F1E8',
                borderRadius: 6,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleScore}
              disabled={modality === 'text' ? !content.trim() : !imageFile}
              style={{
                flex: 2,
                padding: '0.875rem',
                background: (modality === 'text' ? content.trim() : imageFile) ? '#B8862E' : 'rgba(184,134,46,0.3)',
                border: 'none',
                color: '#1A050A',
                borderRadius: 6,
                fontWeight: 700,
                cursor: (modality === 'text' ? content.trim() : imageFile) ? 'pointer' : 'not-allowed',
                transition: 'background 0.2s'
              }}
            >
              Score This
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
