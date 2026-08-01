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




// ── Public API ────────────────────────────────────────────────────────────────

export async function createBrand(
  name: string,
  sourceText: string,
): Promise<BrandIdentityCard> {
  const API_BASE = 'http://localhost:8000'
  const response = await fetch(`${API_BASE}/brands`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, source_text: sourceText, source_urls: [] })
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || 'Failed to create brand')
  }

  const brandOut = await response.json()
  return brandOut.identity_card
}

export async function updateBrand(
  id: string,
  card: BrandIdentityCard,
): Promise<BrandIdentityCard> {
  const API_BASE = 'http://localhost:8000'
  const response = await fetch(`${API_BASE}/brands/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tone_words: card.tone_words,
      vocabulary: card.vocabulary,
      banned_generic_phrases: card.banned_generic_phrases,
      core_values: card.core_values,
      visual_tokens: card.visual_tokens,
    })
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || 'Failed to update brand')
  }

  const brandOut = await response.json()
  return brandOut.identity_card
}

export async function chatTrajectory(
  id: string,
  history: ChatMessage[],
): Promise<TrajectoryChatResponse> {
  const API_BASE = 'http://localhost:8000'
  const response = await fetch(`${API_BASE}/brands/${id}/trajectory/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_history: history })
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || 'Failed to chat with trajectory agent')
  }

  return response.json()
}

export async function confirmTrajectory(
  id: string,
  targetCard: TargetCard,
  history: ChatMessage[],
): Promise<{ status: string }> {
  const API_BASE = 'http://localhost:8000'
  const response = await fetch(`${API_BASE}/brands/${id}/trajectory/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_transcript: history,
      target_tone_words: targetCard.tone_words,
      target_vocabulary: targetCard.vocabulary,
      target_core_values: targetCard.core_values,
    })
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || 'Failed to confirm trajectory')
  }

  return response.json()
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
  is_cached?: boolean
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
  
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)

    const response = await fetch(`${API_BASE}/brands/${brandId}/score`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content, modality }),
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error('API error')
    }

    return response.json()
  } catch (error) {
    console.warn("scoreContent failed, falling back to cached results", error)
    
    // Load fallback results
    try {
      const fallbackData = await import('./fallback-results.json')
      // Randomly pick one of the 4 results
      const results = Object.values(fallbackData.default || fallbackData) as any[]
      const fallbackResult = results[Math.floor(Math.random() * results.length)]
      
      return {
        ...fallbackResult.score_result,
        brand_id: brandId,
        is_cached: true
      }
    } catch (fallbackError) {
      console.error("Failed to load fallback data", fallbackError)
      throw new Error('Failed to score content and fallback failed')
    }
  }
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

export async function getAgentTrace(
  brandId: string,
  contentId: string
): Promise<AgentTraceStep[]> {
  const API_BASE = 'http://localhost:8000'
  
  try {
    const response = await fetch(`${API_BASE}/brands/${brandId}/trace/${contentId}`)
    
    if (!response.ok) {
      throw new Error('API error')
    }
    
    return await response.json()
  } catch (error) {
    console.warn("getAgentTrace failed, checking fallback data for contentId:", contentId)
    try {
      const fallbackData = await import('./fallback-results.json')
      const results = Object.values(fallbackData.default || fallbackData) as any[]
      const fallbackResult = results.find(r => r.score_result.content_id === contentId)
      
      if (fallbackResult) {
        return fallbackResult.agent_trace
      }
    } catch (fallbackError) {
      console.error("Failed to check fallback data", fallbackError)
    }
    
    throw new Error('Failed to fetch agent trace')
  }
}

export interface DriftHistoryItem {
  scored_at: string
  consistency_score: number
  distinctiveness_score: number
  quadrant: string
  content_id: string
}

export async function getBrandHistory(
  brandId: string
): Promise<DriftHistoryItem[]> {
  const API_BASE = 'http://localhost:8000'
  const response = await fetch(`${API_BASE}/brands/${brandId}/history`)

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || 'Failed to fetch drift history')
  }

  return response.json()
}
