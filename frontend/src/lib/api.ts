/**
 * Mock API client — frontend/src/lib/api.ts
 *
 * Matches the Brand Identity Card shape from TRD §4.1.
 * All calls simulate realistic async delays so the loading states are exercised.
 * No real HTTP requests — swap the implementations out in a later prompt.
 */

// ── Types (TRD §4.1) ─────────────────────────────────────────────────────────

export interface VisualTokens {
  primary_colors: string[]
  style_descriptors: string[]
}

export interface BrandIdentityCard {
  brand_id: string
  brand_name: string
  tone_words: string[]
  vocabulary: string[]
  banned_generic_phrases: string[]
  core_values: string[]
  visual_tokens: VisualTokens | null
  source_urls: string[]
  created_at: string   // ISO-8601
}

// ── Fixture data ──────────────────────────────────────────────────────────────

const FIXTURE_CARD: BrandIdentityCard = {
  brand_id: 'mock-brand-001',
  brand_name: 'Muthirai Demo Brand',
  tone_words: ['confident', 'warm', 'precise', 'editorial'],
  vocabulary: [
    'the seal of authenticity',
    'built for the long game',
    'unmistakably ours',
    'earned, not borrowed',
  ],
  banned_generic_phrases: [
    'cutting-edge',
    'seamless experience',
    'best-in-class',
    'innovative solution',
    'leverage synergies',
    'disruptive',
  ],
  core_values: ['authenticity', 'craft', 'accountability', 'restraint'],
  visual_tokens: {
    primary_colors: ['#7A1F2B', '#B8862E', '#F7F1E8'],
    style_descriptors: ['minimal', 'high-contrast', 'editorial', 'refined'],
  },
  source_urls: [],
  created_at: new Date().toISOString(),
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function delay(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms))
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * POST /brands (mock)
 * Simulates ingestion agent running for ~2.5 s, then returns a fixture card.
 */
export async function createBrand(
  name: string,
  _sourceText: string,
): Promise<BrandIdentityCard> {
  await delay(2500)
  return {
    ...FIXTURE_CARD,
    brand_id: `brand-${Date.now()}`,
    brand_name: name || FIXTURE_CARD.brand_name,
    created_at: new Date().toISOString(),
  }
}

/**
 * PATCH /brands/:id (mock)
 * Simulates a quick DB write, returns the updated card.
 */
export async function updateBrand(
  _id: string,
  card: BrandIdentityCard,
): Promise<BrandIdentityCard> {
  await delay(500)
  return { ...card }
}
