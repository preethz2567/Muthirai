/**
 * Screen 03 — Identity Card Review (APP_FLOW.md §4)
 *
 * Lets the user review and edit the auto-extracted Brand Identity Card before
 * it becomes the scoring baseline.
 *
 * Editable fields:
 *   - tone_words           → removable chips + add-new input
 *   - vocabulary           → removable chips + add-new input
 *   - banned_generic_phrases → removable chips + add-new input
 *   - visual_tokens.style_descriptors → removable chips + add-new input
 *   - visual_tokens.primary_colors → color swatch preview (read-only for now)
 *
 * Empty-state: each empty field shows a prompt, not blocked.
 * On "Confirm & Continue": calls mock updateBrand → navigates to dashboard stub.
 */
import { useState, useRef } from 'react'
import type { KeyboardEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import type { BrandIdentityCard } from '../lib/api'
import { updateBrand } from '../lib/api'

// ── Fallback fixture (if page accessed directly without router state) ─────────

const EMPTY_CARD: BrandIdentityCard = {
  brand_id: 'draft',
  brand_name: 'Your Brand',
  tone_words: [],
  vocabulary: [],
  banned_generic_phrases: [],
  core_values: [],
  visual_tokens: null,
  source_urls: [],
  created_at: new Date().toISOString(),
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function IdentityCardPage() {
  const navigate = useNavigate()
  const location = useLocation()

  // Grab card from router state (passed by BrandSetupPage) or use empty fallback
  const incoming: BrandIdentityCard = location.state?.card ?? EMPTY_CARD
  const [card, setCard] = useState<BrandIdentityCard>(incoming)
  const [saving, setSaving] = useState(false)

  // ── Field updaters ─────────────────────────────────────────────────────────

  function setList(field: keyof Pick<BrandIdentityCard, 'tone_words' | 'vocabulary' | 'banned_generic_phrases' | 'core_values'>, next: string[]) {
    setCard(prev => ({ ...prev, [field]: next }))
  }

  function setStyleDescriptors(next: string[]) {
    setCard(prev => ({
      ...prev,
      visual_tokens: prev.visual_tokens
        ? { ...prev.visual_tokens, style_descriptors: next }
        : { primary_colors: [], style_descriptors: next },
    }))
  }

  // ── Save & continue ────────────────────────────────────────────────────────

  async function handleConfirm() {
    setSaving(true)
    try {
      const updated = await updateBrand(card.brand_id, card)
      navigate(`/brands/${updated.brand_id}/dashboard`, { state: { card: updated } })
    } catch {
      setSaving(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const colors = card.visual_tokens?.primary_colors ?? []
  const styleDescriptors = card.visual_tokens?.style_descriptors ?? []

  return (
    <div
      className="min-h-screen"
      style={{
        background: 'linear-gradient(160deg, #2A0810 0%, #4E141C 60%, #3A1000 100%)',
      }}
    >
      {/* ── Nav ── */}
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
        <button onClick={() => navigate('/setup')} className="btn-outline" style={{ fontSize: '0.8rem', padding: '0.4rem 1rem' }}>
          ← Back
        </button>
      </nav>

      {/* ── Content ── */}
      <main className="max-w-2xl mx-auto px-6 pb-20">

        {/* Header */}
        <div className="animate-fade-up mb-8">
          <p
            className="text-xs tracking-widest uppercase mb-3"
            style={{ color: '#B8862E', fontFamily: 'var(--font-heading)' }}
          >
            Step 2 of 3
          </p>
          <h1
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '2rem',
              fontWeight: 700,
              color: '#F7F1E8',
              marginBottom: '0.4rem',
            }}
          >
            Your Identity Card
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'rgba(247,241,232,0.55)' }}>
            Review what the Ingestion Agent extracted. Edit anything before it becomes your scoring baseline.
          </p>
        </div>

        {/* Brand name badge */}
        <div
          className="animate-fade-up animate-delay-1 mb-6 px-5 py-3 rounded-lg flex items-center gap-3"
          style={{ background: 'rgba(184,134,46,0.12)', border: '1px solid rgba(184,134,46,0.3)' }}
        >
          <span style={{ fontSize: '1.2rem' }}>🏷</span>
          <div>
            <div className="field-label" style={{ marginBottom: 0 }}>Brand</div>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: '#F7F1E8' }}>{card.brand_name}</div>
          </div>
        </div>

        {/* Cards */}
        <div className="flex flex-col gap-5">

          {/* Tone Words */}
          <FieldSection
            delay={1}
            title="Tone Words"
            hint="Adjectives that describe your brand's voice"
            emptyPrompt="Add words like 'confident', 'warm', 'precise'…"
            items={card.tone_words}
            onChange={v => setList('tone_words', v)}
          />

          {/* Vocabulary / Signature Phrases */}
          <FieldSection
            delay={2}
            title="Signature Phrases"
            hint="Phrases your brand actually uses"
            emptyPrompt="Add phrases like 'built for the long game'…"
            items={card.vocabulary}
            onChange={v => setList('vocabulary', v)}
          />

          {/* Banned Generic Phrases */}
          <FieldSection
            delay={3}
            title="Banned Generic Phrases"
            hint="Phrases to avoid — they hurt your distinctiveness score"
            emptyPrompt="Add phrases like 'cutting-edge', 'seamless experience'…"
            items={card.banned_generic_phrases}
            chipStyle="banned"
            onChange={v => setList('banned_generic_phrases', v)}
          />

          {/* Core Values */}
          <FieldSection
            delay={4}
            title="Core Values"
            hint="The brand's stated values"
            emptyPrompt="Add values like 'authenticity', 'craft'…"
            items={card.core_values}
            onChange={v => setList('core_values', v)}
          />

          {/* Visual Tokens */}
          <div
            className="card animate-fade-up animate-delay-4"
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
          >
            <div>
              <div className="section-title">Visual Tokens</div>
              <p style={{ fontSize: '0.78rem', color: 'rgba(247,241,232,0.45)', marginBottom: '0.75rem' }}>
                Colors and style descriptors extracted from your brand
              </p>

              {/* Color swatches */}
              {colors.length > 0 ? (
                <div>
                  <span className="field-label">Primary Colors</span>
                  <div className="flex gap-3 flex-wrap">
                    {colors.map(hex => (
                      <div key={hex} className="flex items-center gap-2">
                        <div
                          className="rounded"
                          style={{
                            width: 32,
                            height: 32,
                            background: hex,
                            border: '2px solid rgba(247,241,232,0.2)',
                          }}
                          title={hex}
                        />
                        <span style={{ fontSize: '0.72rem', color: 'rgba(247,241,232,0.5)', fontFamily: 'var(--font-mono)' }}>
                          {hex}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: '0.8rem', color: 'rgba(247,241,232,0.35)', fontStyle: 'italic' }}>
                  No colors extracted — you can add them later.
                </p>
              )}
            </div>

            {/* Style descriptors */}
            <FieldSection
              title="Style Descriptors"
              hint="Visual style keywords"
              emptyPrompt="Add descriptors like 'minimal', 'editorial'…"
              items={styleDescriptors}
              onChange={setStyleDescriptors}
              inline
            />
          </div>

        </div>{/* end cards */}

        {/* Confirm button */}
        <div className="mt-8 flex items-center gap-4 animate-fade-up animate-delay-4">
          <button
            id="confirm-continue-btn"
            className="btn-gold"
            disabled={saving}
            onClick={handleConfirm}
            style={{ fontSize: '1rem', padding: '0.85rem 2rem' }}
          >
            {saving ? 'Saving Identity Card…' : 'Confirm & Continue →'}
          </button>
          <span style={{ fontSize: '0.75rem', color: 'rgba(247,241,232,0.35)' }}>
            You can always edit this later from the dashboard
          </span>
        </div>

      </main>
    </div>
  )
}

// ── Reusable editable chip field ──────────────────────────────────────────────

interface FieldSectionProps {
  title: string
  hint: string
  emptyPrompt: string
  items: string[]
  onChange: (next: string[]) => void
  chipStyle?: 'default' | 'banned'
  delay?: number
  inline?: boolean
}

function FieldSection({
  title,
  hint,
  emptyPrompt,
  items,
  onChange,
  chipStyle = 'default',
  delay = 0,
  inline = false,
}: FieldSectionProps) {
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function add() {
    const trimmed = draft.trim()
    if (!trimmed || items.includes(trimmed)) return
    onChange([...items, trimmed])
    setDraft('')
  }

  function remove(val: string) {
    onChange(items.filter(i => i !== val))
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { e.preventDefault(); add() }
  }

  const bannedStyle = chipStyle === 'banned'

  const inner = (
    <>
      {!inline && (
        <>
          <div className="section-title">{title}</div>
          <p style={{ fontSize: '0.78rem', color: 'rgba(247,241,232,0.45)', marginBottom: '0.75rem' }}>{hint}</p>
        </>
      )}
      {inline && (
        <span className="field-label">{title}</span>
      )}

      {/* Chips */}
      {items.length === 0 ? (
        <p
          style={{ fontSize: '0.8rem', color: 'rgba(247,241,232,0.3)', fontStyle: 'italic', marginBottom: '0.75rem' }}
          onClick={() => inputRef.current?.focus()}
        >
          {emptyPrompt}
        </p>
      ) : (
        <div className="flex flex-wrap gap-2 mb-3">
          {items.map(item => (
            <span
              key={item}
              className="chip"
              style={bannedStyle ? {
                background: 'rgba(200,60,60,0.12)',
                border: '1px solid rgba(200,80,60,0.35)',
                color: '#F4A0A0',
              } : {}}
            >
              {item}
              <button
                type="button"
                className="chip-remove"
                onClick={() => remove(item)}
                aria-label={`Remove ${item}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Add-new input */}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          className="field-input"
          style={{ flex: 1 }}
          placeholder="Type and press Enter to add…"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={onKey}
        />
        <button
          type="button"
          onClick={add}
          disabled={!draft.trim()}
          style={{
            background: draft.trim() ? 'rgba(184,134,46,0.2)' : 'rgba(0,0,0,0.15)',
            border: `1px solid ${draft.trim() ? 'rgba(184,134,46,0.5)' : 'rgba(247,241,232,0.1)'}`,
            color: draft.trim() ? '#E8C87A' : 'rgba(247,241,232,0.25)',
            borderRadius: 6,
            padding: '0 0.9rem',
            fontSize: '1rem',
            cursor: draft.trim() ? 'pointer' : 'not-allowed',
            transition: 'all 0.15s',
          }}
        >
          +
        </button>
      </div>
    </>
  )

  if (inline) return <div>{inner}</div>

  return (
    <div className={`card animate-fade-up animate-delay-${delay}`}>
      {inner}
    </div>
  )
}
