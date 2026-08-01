# MUTHIRAI — App Flow Document
v1.0, Hackathon Build — companion to the PRD and TRD

---

## 1. Purpose

Screen-by-screen user journey: what the user sees, what they can do, what the system does in response, and edge cases (empty states, loading, errors).

## 2. Navigation Map

Two loops: a one-time setup loop (Landing → Brand Setup → Identity Card Review → Dashboard) that runs once per brand, and a repeatable scoring loop (Dashboard → Score Content → Results → back to Dashboard) that runs every time new content needs validation. The Drift Dashboard and Identity Card are reachable any time from the main Dashboard.

```
01 Landing --Get Started--> 02 Brand Setup --Submit--> [Ingesting...]
     --> 03 Identity Card Review --Confirm--> 04 Brand Dashboard
04 Brand Dashboard --Score New Content--> 05 Score Content --Submit--> [Scoring...]
     --> 06 Results --View reasoning--> 06a Agent Trace
06 Results --Back to dashboard--> 04 Brand Dashboard
04 Brand Dashboard --View trend--> 07 Drift Dashboard
04 Brand Dashboard --Edit identity--> 03 Identity Card Review
```

## 3. Screen Inventory

| # | Screen | One-line purpose |
|---|---|---|
| 01 | Landing | Entry point, explains Muthirai in one line, "Get Started" CTA |
| 02 | Brand Setup | User provides brand source (URL / pasted content) |
| – | Ingesting (state) | System processing state while Ingestion Agent runs |
| 03 | Identity Card Review | User reviews / edits the auto-extracted brand identity |
| 04 | Brand Dashboard | Home base — overview, recent scores, entry to all other screens |
| 05 | Score Content | User submits new text/image content to be scored |
| – | Scoring (state) | System processing state while the agent pipeline runs |
| 06 | Results | Quadrant placement, scores, flagged phrases, suggested rewrite |
| 06a | Agent Trace (panel) | Expandable view of the live multi-agent reasoning steps |
| 07 | Drift Dashboard | Score history and trend over time for the brand |

## 4. Screen-by-Screen Detail

### SCREEN 01 — Landing
**Purpose:** First impression. Communicates the core idea in one glance, funnels into brand setup.
**Key elements:** Headline + one-line product thesis; quadrant visual teaser; "Get Started" primary button.
**Actions:** Click "Get Started" → Navigate to Brand Setup (Screen 02).

### SCREEN 02 — Brand Setup
**Purpose:** Collect the minimum input needed to build a Brand Identity Card.
**Key elements:** Input toggle ("Paste a URL" / "Upload / paste past content"); brand name field; "Build My Brand Profile" button.
**Actions:**
- Paste URL and submit → Ingestion Agent triggered → processing state.
- Submit with no input → inline validation, button stays disabled.
**Processing state:** Animated state ("Reading your brand's voice…") shown while the Ingestion Agent runs, capped at ~60 seconds.

### SCREEN 03 — Identity Card Review
**Purpose:** Shows the auto-extracted Brand Identity Card; lets the user correct anything before it becomes the scoring baseline — the trust checkpoint of the product.
**Key elements:** Editable tone word chips; editable vocabulary/signature phrases list; editable banned generic phrases list; visual tokens preview (color swatches + style descriptors); "Confirm & Continue" button.
**Actions:**
- Edit any field → local state updates immediately.
- Click "Confirm & Continue" → saved via PATCH /brands/{id} → navigate to Brand Dashboard.
**Edge case:** Thin extraction results → fields shown empty with a placeholder prompting manual entry, not blocked.

### SCREEN 04 — Brand Dashboard
**Purpose:** Home base once a brand exists. One glance answers "where does my brand's content stand right now."
**Key elements:** Brand name + mini identity summary (tone word chips); "Score New Content" primary button; recent scores list (last 5, quadrant-color tagged); mini drift trend sparkline; "Edit Brand Identity" link.
**Actions:**
- Click "Score New Content" → Navigate to Score Content (Screen 05).
- Click a recent score item → Navigate to that item's Results screen.
- Click sparkline / "View trend" → Navigate to Drift Dashboard (Screen 07).
- Click "Edit Brand Identity" → back to Identity Card Review (Screen 03) in edit mode.
**Empty state:** Before any content scored — "Score your first piece of content to see it placed on the quadrant."

### SCREEN 05 — Score Content
**Purpose:** Where content actually gets validated. Single focused action.
**Key elements:** Modality toggle (Text / Image); text area or image upload dropzone; "Score This" button.
**Actions:**
- Submit text/image → POST /brands/{id}/score triggered → processing state.
- Submit empty content → inline validation, button disabled.
**Processing state:** Shows pipeline stages lighting up in sequence (Embedding → Scoring → Critic → Suggestion) — the wait demonstrates the multi-agent architecture.

### SCREEN 06 — Results
**Purpose:** The payoff screen — shows exactly where content landed and why, hands back something usable.
**Key elements:** Quadrant scatter chart with new content plotted as highlighted point; Consistency and Distinctiveness shown as two separate values; flagged phrases list with reasons; suggested rewrite block with "Copy" action; "View Agent Reasoning" link; "Score Another" / "Back to Dashboard" actions.
**Actions:**
- Click "Copy" on rewrite → copied to clipboard, confirmation toast.
- Click "View Agent Reasoning" → Agent Trace panel (06a) opens.
- Click "Score Another" → back to Score Content (05).

### SCREEN 06a — Agent Trace (panel)
**Purpose:** Makes the multi-agent pipeline visible and inspectable — does the most work in a live judged demo.
**Key elements:** Step list (Embedding → Scoring → Critic → Suggestion), each expandable with actual input/output snippet.
**Actions:** Click a step → expands to show that agent's reasoning/output for this content.

### SCREEN 07 — Drift Dashboard
**Purpose:** Reframes Muthirai from a one-off checker into an ongoing brand governance view — the enterprise story, made visible.
**Key elements:** Line chart (Consistency + Distinctiveness over time); table of past scored content, filterable by quadrant; click-through to Results screen.
**Empty state:** Fewer than 2 scored items — "Score a few more pieces of content to start seeing your brand's trend."

## 5. Cross-Screen States

| State | Handling |
|---|---|
| Loading / processing | Staged progress indicator naming the active agent step, never a bare spinner |
| API / agent failure | Friendly error with "Retry" action; cached fallback example for live-demo safety |
| Empty data | Always replaced with a specific next action, never a blank screen |

## 6. Demo Script Alignment

Recommended path for the live judged walkthrough:

Landing → Brand Setup (paste a real brand URL live) → Identity Card Review (show the auto-extraction) → Score Content with a deliberately generic example → Results (land in "Safe but Generic" zone) → Agent Trace (show the reasoning) → Score Content again with the suggested rewrite → Results (land in "On Brand" zone) → Drift Dashboard to close on the governance story.

> **Why this order wins the room:** It's a before/after story told through the product itself — judges watch a piece of content visibly move from "Safe but Generic" to "On Brand" in real time, which sells the two-axis framework far better than describing it in slides.
