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

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface TargetCard {
  tone_words: string[]
  vocabulary: string[]
  core_values: string[]
}

export interface TrajectoryChatResponse {
  response_message: string
  target_card: TargetCard
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

/**
 * POST /brands/:id/trajectory/chat (mock)
 * Simulates a response from the Trajectory Agent.
 */
export async function chatTrajectory(
  _id: string,
  history: ChatMessage[],
): Promise<TrajectoryChatResponse> {
  await delay(1500) // simulate LLM latency
  const lastMessage = history[history.length - 1]?.content || ''
  
  return {
    response_message: `Got it. You want to shift towards: "${lastMessage}". I've updated the target identity card to reflect a more rebellious and distinct tone.`,
    target_card: {
      tone_words: ['rebellious', 'bold', 'unapologetic'],
      vocabulary: ['disrupt the norm', 'no compromises', 'rewrite the rules'],
      core_values: ['courage', 'authenticity', 'defiance'],
    }
  }
}

/**
 * POST /brands/:id/trajectory/confirm (mock)
 */
export async function confirmTrajectory(
  _id: string,
  _targetCard: TargetCard,
  _history: ChatMessage[],
): Promise<{ status: string }> {
  await delay(500)
  return { status: 'active' }
}

export interface FlaggedPhrase {
  id?: string
  phrase: string
  reason: string
}

export interface ContentScoreResult {
  id?: string
  content_id: string
  brand_id: string
  consistency_score: number
  distinctiveness_score: number
  quadrant: 'on_brand' | 'safe_generic' | 'bold_off_brand' | 'off_brand'
  flagged_phrases: FlaggedPhrase[]
  suggested_rewrite: string | null
  scored_at: string
}

/**
 * POST /brands/:id/score (REAL API)
 * Calls the backend scoring pipeline.
 */
export async function scoreContent(
  brandId: string,
  content: string,
  modality: 'text' | 'image' = 'text'
): Promise<ContentScoreResult> {
  const API_BASE = 'http://localhost:8000'
  const response = await fetch(`${API_BASE}/brands/${brandId}/score`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ content, modality })
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || 'Failed to score content')
  }

  return response.json()
}

export interface AgentTraceStep {
  id: string
  content_id: string
  agent_name: string
  input_snippet: string
  output_snippet: string
  status: string
  started_at: string
  completed_at: string | null
}

/**
 * GET /brands/:id/trace/:content_id (REAL API)
 * Fetches the ordered agent trace steps for a specific content item.
 */
export async function getAgentTrace(
  brandId: string,
  contentId: string
): Promise<AgentTraceStep[]> {
  const API_BASE = 'http://localhost:8000'
  const response = await fetch(`${API_BASE}/brands/${brandId}/trace/${contentId}`)

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || 'Failed to fetch agent trace')
  }

  return response.json()
}
