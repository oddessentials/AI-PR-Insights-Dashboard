AI Knowledge Worker POC for Yo Coney Bot
Executive Report

---

## Table of Contents

- Executive Summary
- Introduction & Context
- Basic Knowledge Worker Setup
- Additional Sources of Context
- Agent Evaluation Setup
- Guardrails & Safety
- Prompts, Instructions, and Agent Setup
- Overall Presentation & POC Walkthrough
- Conclusion & Future Work

---

## 1. Executive Summary

This report presents a working Proof of Concept (POC) for **Yo Coney Bot**, an AI Knowledge Worker designed for **The Coney Island** in Pottsville, PA. The system focuses on **real-time event discussion**, **menu expertise** (food and bar), **hours and breakfast details**, and **restaurant history**, with a clear roadmap to later support **food ordering and non-event promotions**.

The POC demonstrates:

- A **multi-persona** conversational agent (professional, local, and Shakespearean styles).
- A **voice-enabled experience**, where spoken questions receive both on-screen text and a synthesized voice reply via a Kokoro/MeloTTS microservice.
- A **strict, machine-readable knowledge base** (JSON data files) that powers both the chatbot and **SEO/LLM-friendly exposure** for web crawlers and external models.
- **Automated event syndication** to X.com (formerly Twitter) using LLM SEO techniques based on the same structured events dataset.
- A hardened API layer with **OpenAPI documentation**, **schema validation**, and **deterministic helper modules** for events, history, hours, and menu queries.

This milestone validates that an AI Knowledge Worker can act as a reliable “front-of-house digital host” for a restaurant, grounded in curated data and production-ready architecture, while leaving higher-risk features (ordering, dynamic promotions) for a later phase.

---

## 2. Introduction & Context

The Yo Coney Bot POC extends prior work on the **Yo Coney** web and mobile apps into a full **AI Knowledge Worker** layer. Instead of being a generic chatbot, the bot is designed as:

> A structured, voice-capable assistant for guests of The Coney Island, focused on events, menu, hours, and local history, with strict guardrails and neutral, factual behavior.

Key context:

- The POC runs alongside an existing **PWA UI** and a **React Native mobile app** (Android/iOS) that are already in the app store review pipeline.
- The backend is an **Express-based API** with a documented `/api/chat` and `/api/tts/{id}` surface, containerized and deployable via Docker Compose with a separate **Kokoro/MeloTTS microservice**.
- A **data update pipeline** (`npm run update:data`) maintains a local `server/data/` directory with machine-readable JSON that is used by the bot and is also suitable for SEO, structured markup, and future external LLM ingestion.

The POC is intentionally **narrow and deep**: it aims to excel at a few high-value tasks that matter to guests and the business, while clearly signaling that **food ordering and non-event specials** will follow in later phases.

---

## 3. Basic Knowledge Worker Setup

### 3.1 Purpose

The Yo Coney Bot Knowledge Worker is engineered to handle the real questions guests actually ask, across channels (web, mobile, and eventually voice-only):

- “What’s going on tonight?”
- “Do you have breakfast right now?”
- “What comes on your burgers?”
- “Is this kid-friendly?”
- “What’s the story behind this place?”

In the POC, the bot focuses on four core domains:

1. **Events & live entertainment** (including real-time “today/tonight/this weekend” logic).
2. **Menu + bar** (sections, items, prices where available, and kid-friendly picks).
3. **Hours & breakfast service windows**.
4. **Local history and story of The Coney Island / Palles family.**

Ordering, table-level recommendations, and non-event promotions are **explicitly out of scope for this POC** and called out as roadmap items.

### 3.2 Role Definition

**Role:** Local Hospitality Knowledge Worker for The Coney Island

The bot’s responsibilities are:

- Ingest and interpret **structured JSON data** (overview, hours, menu, events, history).
- Answer guest questions consistently, grounded in that data.
- Provide **concise, friendly responses**, tuned to the selected persona.
- Provide **short spoken summaries** suitable for TTS playback.
- Support **automated event syndication** by reusing the same event data for SEO-optimized social posts.

### 3.3 Technical Setup

- **Core Model:** OpenAI model (e.g., `gpt-4o-mini`), accessed via the official Node.js client.
- **System Prompt:** A persona-aware system prompt (`SYSTEM_PROMPT`) that:

  - Enforces data-only reasoning (hours, menu, events, history).
  - Forbids guessing or inventing details (prices, dates, band names).
  - Disallows revealing implementation details or code.

- **Knowledge Layer:**

  - `overview.json` – core business facts, highlights, social links.
  - `hours.json` – hours + breakfast windows.
  - `menu.raw.json` – full restaurant + alcohol menu.
  - `events.json` – normalized, time-aware calendar.
  - `history.json` – canonical history, timeline, and stories.

- **Routing & Intents:**

  - An **intent classifier** (`classifyIntent`) routes each turn to one of:

    - `hours | overview | events | menu | history | general`

  - A **pure router** (`routeConey`) chooses deterministic helpers vs. LLM.

- **API Contract:**

  - `POST /api/chat` → `{ reply: { message }, audioId? }`
  - `GET /api/tts/:id` → streaming audio for the previously synthesized reply.

- **TTS Layer:**

  - `chatWithConey` returns both `message` and `ttsSummary` (short spoken version).
  - `synthesizeSpeech(text)` (Kokoro/MeloTTS) generates audio bytes.
  - Audio stored in a **TTL-based in-memory store**, exposed via `/api/tts/:id`.

### 3.4 Capabilities Demonstrated in the POC

- Real-time **event Q&A**:

  - “What’s happening right now / tonight / this weekend?”
  - “Are they playing again?” (pronoun-aware follow-ups).

- **Menu guidance**:

  - Item prices (when present).
  - “What comes on…” and kid-friendly options.
  - Category browsing (pizza, burgers, wings, breakfast, cocktails, etc.).

- **Hours + breakfast**:

  - High-level open status and breakfast windows.
  - Clear disclaimers when real-time precision is not guaranteed.

- **Local history**:

  - Founding story, original downtown location, multi-generation Palles ownership.
  - Whitelisted, high-confidence stories only.

- **Voice experience**:

  - If the user speaks, the response includes both:

    - A full **text answer**, and
    - A **shorter TTS summary** tailored for audio playback.

- **SEO & social syndication**:

  - Events data drives both conversational answers and automated posts to X.com using LLM SEO techniques.
  - The same JSON sources can be exposed in machine-readable formats to help web crawlers and external LLMs learn about The Coney.

---

## 4. Additional Sources of Context

The POC is powered by a deliberately **constrained, curated data backbone**. No live scraping. No hidden external calls. Just local JSON kept up to date by a controlled pipeline.

### 4.1 Overview Data (`overview.json`)

Captures:

- Name, aliases, address, phone, website, menu URL, facts URL.
- Highlights and signature items.
- Social handles (e.g., Facebook, Instagram, X.com).
- Optional **temporary status** block (e.g., “temporarily closed due to renovation”).

The router checks `temporary_status` first:

> If a user asks “Are you open?” while a temporary closure flag is active, the bot overrides normal logic and surfaces that message verbatim.

### 4.2 Hours & Breakfast (`hours.json`)

Defines:

- Whether the restaurant is **24/7**.
- **Breakfast windows** (Mon–Sat and Sunday separately).

Helper functions:

- `getOpenStatusNow()` – conservative open/closed message.
- `getBreakfastSummary()` – human-readable schedule.
- `getBreakfastStatusNow()` – “Yes, breakfast is currently being served…” vs “outside posted breakfast hours.”

### 4.3 Events Engine (`events.json` + helpers)

Data from `events.json` is normalized into `NormalizedEvent` entries with:

- Deterministic IDs, names, performers.
- Start/end times, **status**, age limits, free/paid flags, and tags.
- Phase classification: `upcoming | ongoing | completed`.

Key helpers:

- `getEventsToday`, `getEventsTonight`, `getUpcomingEvents`, `getEventsInRange`.
- `searchEventsByKeyword` – band/keyword lookup with stopwords removed.
- `answerEventsQuestion(query)` – a high-level Q&A engine that:

  - Handles phrases like “right now”, “this weekend”, “21+”, “family-friendly”, “no cover”.
  - Decodes dates (“Dec 20”, “12/19”) and understands follow-ups like “Do they play again?” or “What about Dec 20?” using conversational memory.
  - Produces **chat-friendly lists** and **TTS-friendly one-liners**.

This is the backbone for both **guest Q&A** and **LLM SEO event posts**.

### 4.4 Menu Engine (`menu.raw.json` + helpers)

The menu engine:

- Indexes menu and alcohol sections into searchable **item** and **section** structures.
- Detects **categories** (pizza, burgers, wings, breakfast, cocktails, milkshakes, kids, etc.).
- Resolves intents from chat history:

  - `item_price`, `item_detail`, `section_list`, or `kids_list`.

`answerMenuRichFromHistory(history)` returns:

- `text` – full description and/or list for chat display.
- `ttsSummary` – short, spoken-friendly version (e.g., “Here are our burger options; check your screen for details.”).

This approach keeps the POC focused on **explanatory menu support** and sets the stage for later **ordering flows**, which will require additional safety rules and POS integrations.

### 4.5 History Engine (`history.json`)

The history module:

- Provides **deterministic answers** for:

  - Founding year and “how long” questions.
  - Founder and Palles family involvement.
  - Original downtown address vs current West Market Street location.
  - General “tell me the story / history / backstory” prompts.

- Uses **whitelisted stories** with confidence levels; low-confidence lore is excluded by default.

Only if it cannot answer from `history.json` does the system fall back to the LLM with strict guardrails.

### 4.6 Strict, Machine-Readable Knowledge for SEO & External LLMs

All of these data sources (`overview.json`, `hours.json`, `menu.raw.json`, `events.json`, `history.json`) form a **single source of truth** that is:

- Local and **version-controlled**.
- Suitable to expose as **structured data** (JSON-LD, sitemaps, or public API).
- Ready to be consumed by **search engines and external LLMs**, ensuring that information about The Coney is **consistent** wherever guests encounter it.

---

## 5. Agent Evaluation Setup

### 5.1 Evaluation Queries

The POC is evaluated against realistic, high-value guest queries, such as:

- Events

  - “What’s happening tonight at The Coney?”
  - “Do they ever play here again?” (after asking about a band).
  - “Any all-ages shows this weekend?”
  - “Any no-cover events coming up?”

- Menu & drinks

  - “How much is a cheeseburger?”
  - “What comes on your pierogies?”
  - “What kinds of wings do you have?”
  - “Do you have kid-friendly options?”

- Hours & breakfast

  - “Are you open right now?”
  - “When is breakfast?”
  - “Are you serving breakfast now?”

- History

  - “Who started Coney Island in Pottsville?”
  - “How long has your family run this place?”
  - “Where was the original location downtown?”

- General / persona

  - “Tell me the story of this place in your Shakespeare voice.”
  - “What’s special about The Coney?”

### 5.2 Scoring Model

Responses are evaluated for:

- **Data grounding** – Does the answer align with the JSON source of truth?
- **Completeness** – Does it cover the obvious parts of the question (e.g., event date/time, basic menu details)?
- **Hallucination resistance** – Does it avoid making up bands, prices, or history that isn’t present?
- **Clarity & tone** – Does it match the selected persona while staying family-friendly and readable?
- **Voice suitability** – Is the TTS summary short, natural, and actually usable in audio form?

### 5.3 Benchmarking

The bot is compared against:

- The raw **data files** themselves (golden truth).
- Existing **website content** where applicable.
- Manual “ideal” answers crafted by the product owner (what a good staff member would say).

For social/SEO, LLM-generated event posts are checked for:

- Correct dates, times, and band names.
- Avoiding overclaiming (“biggest night ever,” etc.) when the data says nothing of the sort.
- Inclusion of relevant hashtags or local anchors as needed.

### 5.4 Pass/Fail Criteria

A response is considered a **pass** if it:

- Uses the correct underlying data (dates, times, prices where present).
- Respects **scope** (does not promise ordering, catering, or promotions that aren’t in the data).
- Clearly signals uncertainty when the data is missing (“You may want to call to confirm pricing.”).
- Produces a usable TTS summary within the character limit.

Failures include:

- Any fabricated specific fact (band names, menu items, prices, dates).
- Suggesting services the restaurant does not offer.
- Ignoring a temporary closure flag in `overview.json`.

---

## 6. Guardrails & Safety

### 6.1 Data-First, “Don’t Guess” Policy

The system prompt and helpers enforce:

- **Prefer deterministic helpers**:

  - Events: `answerEventsQuestion`.
  - Menu: `answerMenuRichFromHistory`.
  - History: `answerHistoryQuestion`.
  - Hours: `getOpenStatusNow`, `getBreakfastSummary`, `getBreakfastStatusNow`.

- Only when these cannot answer does the LLM see curated context (`safeJsonBlock`, `buildMenuContext`) and the user question.
- The model is instructed to **say it doesn’t know** and suggest calling the official phone number rather than guessing.

### 6.2 Privacy & Content Boundaries

- The bot does **not do personal performance evaluation** of staff.
- No collection or inference of PHI; this is a hospitality-focused system.
- Persona rules forbid profanity, edgy jokes, or misrepresenting the bot as an individual staff member.

### 6.3 Operational Safety

- API input is validated with **Zod schemas** and Express middleware (`validateBody`, `validateParams`), returning structured 400 errors on invalid inputs.
- OpenAPI definitions (`openapi.ts`) describe:

  - `POST /api/chat` with `ChatRequest` and `ChatResponse`.
  - `GET /api/tts/{id}` with binary audio responses and relevant error shapes.
  - `GET /api/health` for monitoring.

- TTS is guarded by:

  - An environment flag (`TTS_ENABLED`).
  - Character limits (`TTS_MAX_CHARS`) for TTS text.
  - A TTL-based audio store to avoid unbounded memory growth.

### 6.4 Feature Scope Guardrails

The POC explicitly **does not**:

- Take orders or modify reservations.
- Offer discounts, coupons, or non-event promotions unless they’re part of the data.
- Discuss internal policies, staff schedules, or back-of-house operations.

Future ordering features will add POS-specific validations, payment handling, and additional guardrails.

---

## 7. Prompts, Instructions, and Agent Setup

### 7.1 Persona Configuration

Personas are configured via a `PersonaKey`:

- `default` – Friendly, concise, professional; no slang; short answers unless more detail is requested.
- `coneyLocal` – Sounds like a local from Pottsville working the floor:

  - Casual, welcoming, “zero-corporate” tone.
  - Uses light local flavor (“Yeah, we’ve got you.”) but never stereotypes.
  - Explicit rules to avoid fictional traditions or in-jokes.

- `shakespeare` – “Talk like William Shakespeare” and “Speak only in old English.”

The active persona is selected via `CONEY_BOT_PERSONA` in the environment, and its `styleSummary` and `rules` are embedded into the **SYSTEM_PROMPT**.

### 7.2 System Prompt Core

The system prompt encodes:

- Identity: You are Yo Coney Bot for The Coney Island in Pottsville.
- Data precedence:

  1. `hours.json` / `overview.json`
  2. `menu.raw.json`
  3. `events.json`
  4. `history.json`

- Behavior:

  - Answer directly and helpfully on first try.
  - Focus on guest-relevant information.
  - Don’t show code or internal policies.
  - Never guess or overpromise.

### 7.3 Intent-Aware Context Injection

The agent receives:

- `SYSTEM_PROMPT` (persona + rules).
- A compact, intent-specific **context block**:

  - For events: upcoming events list, possibly truncated JSON.
  - For menu: a **filtered menu context** built by `buildMenuContext`.
  - For history: summarized `history.json`.
  - For hours/overview: address, phone, website, open24x7 flag, breakfast hours, highlights.

- A JSON-only instruction block:

```json
{
  "answer": "<full reply to show in chat>",
  "tts_summary": "<natural spoken summary, max 90 characters>"
}
```

This ensures the model outputs **structured JSON** that the API can parse, rather than arbitrary text.

### 7.4 Output Structure & Voice Contract

`chatWithConey` always returns:

- `message: { role: "assistant", content: "<answer>" }`
- `ttsSummary: "<short spoken summary>"`

The `/api/chat` route then:

- Checks whether the user **spoke** (`userSpoke` flag).
- If TTS is enabled and the TTS summary is short enough, it calls `synthesizeSpeech(ttsText)`, stores the audio via `storeTtsAudio`, and returns `audioId` alongside the text reply.

Clients (PWA and mobile) can then **play audio** when `audioId` is present, or fall back to text-only behavior.

---

## 8. Overall Presentation & POC Walkthrough

### 8.1 Narrative of the POC

The POC tells a simple story:

> “You walk into The Coney, pull out your phone, or open the kiosk / PWA, ask what’s going on tonight or what’s good for the kids — and the bot responds instantly, in a friendly local voice, grounded in the actual events and menu data the restaurant controls.”

Behind that moment are:

- Deterministic helpers for events, menu, hours, and history.
- Persona-aware prompts.
- A voice pipeline that generates both on-screen text and audio.
- Structured JSON that can drive dashboards, SEO, and future analytics.

### 8.2 Visuals (for the final submission)

Replace these placeholders with real assets:

- **Architecture Diagram**

  - Show:

    - Clients (PWA, iOS, Android).
    - API layer (`/api/chat`, `/api/tts`).
    - Knowledge modules (overview, hours, menu, events, history).
    - OpenAI LLM.
    - Kokoro/MeloTTS microservice.
    - X.com posting service (LLM SEO event posts).

- **OpenAPI Screenshot**

  - Swagger UI showing the Yo Coney Bot API with `/api/chat`, `/api/tts/{id}`, `/api/health`.

- **Event Q&A Flow**

  - Screenshot of:

    - User: “What’s on this weekend?”
    - Bot: list of events + a play button for audio.

- **Menu Q&A Flow**

  - Screenshot of:

    - User: “What kinds of wings do you have?”
    - Bot: structured list of flavors and options.

- **History Persona Demo**

  - Screenshot:

    - User: “Tell me the history in Shakespeare mode.”
    - Bot: fun, old-English narrative, still factually grounded.

- **Mobile App View**

  - Screens from the React Native app showing:

    - Voice button.
    - Chat bubbles.
    - Optional “Now Playing” TTS indicator.

### 8.3 Scenario Walkthroughs

**Scenario 1 – Events & SEO**

- Guest: “What’s going on tonight?”
- Bot:

  - Uses `answerEventsQuestion("tonight")` to list tonight’s events.
  - Returns text + TTS summary.

- Separately, the same events power:

  - A scheduled LLM-generated post: “Tonight at The Coney in Pottsville: [Band] at [time] – no cover, all ages.”

**Scenario 2 – Menu Guidance**

- Guest: “How much is a cheeseburger, and what comes on it?”
- Bot:

  - Uses `answerMenuRichFromHistory` to find the cheeseburger item, including price if available.
  - Returns item details and a TTS line: “Our cheeseburger comes with…”

**Scenario 3 – Breakfast & Hours**

- Guest: “Are you serving breakfast right now?”
- Bot:

  - Uses `getBreakfastSummary()` and `getBreakfastStatusNow()`.
  - Responds with a clear yes/no plus posted hours.

**Scenario 4 – Local History**

- Guest: “Who started The Coney and how long has it been in the Palles family?”
- Bot:

  - Uses `answerHistoryQuestion` and `history.json` to respond with:

    - Founding date, founder’s name.
    - Multi-generation family stewardship.

  - No speculation beyond the curated facts.

**Scenario 5 – Persona Shift**

- Guest: “Switch to local tone and tell me what’s special about this place.”
- Bot:

  - Persona: `coneyLocal`.
  - Tone: casual, local, but still grounded in `overview.json` highlights and `history.json`.

---

## 9. Conclusion & Future Work

### 9.1 POC Value

This POC validates that:

- An AI Knowledge Worker can meaningfully serve a **local restaurant** with:

  - Accurate event information.
  - Useful menu guidance.
  - Hours and breakfast clarity.
  - A rich, safe local history story.

- The same structured dataset can serve:

  - Chatbot responses.
  - Voice experiences.
  - SEO, social posts, and future machine-readable integrations.

- The architecture (Express API, OpenAPI docs, deterministic helpers, LLM router, Kokoro/MeloTTS, RN + PWA clients) is suitable for **productionization** with clear extension points.

### 9.2 Recommended Next Steps

1. **Ordering & POS Integration (Future Phase)**

   - Add scoped flows for “simple orders” or “call-ahead orders,” tightly integrated with the POS.
   - Extend guardrails to handle payments, kitchen capacity, and timing.

2. **Non-Event Promotions & Specials**

   - Introduce a structured `specials.json` and `promotions.json`.
   - Allow the bot to discuss limited-time offers, happy hours, and combos.

3. **Analytics & Feedback**

   - Log intent distribution, success rates, and fallback rates.
   - Add a lightweight “Did this help?” signal to tune prompts and data coverage.

4. **Deeper Voice/Kiosk Integration**

   - Add a kiosk mode for in-venue use (hands-free, large-font display).
   - Improve bar-noise robustness and audio UX.

5. **Broader Multi-Venue Support**

   - Generalize the architecture to onboard additional independent venues, each with:

     - Their own structured data set.
     - Custom personas.
     - Local history and events.

6. **Investor-Ready Pitch & Demo**

   - Convert this report and its visuals into a **pitch deck**.
   - Highlight:

     - The dual value: **guest experience + SEO/data control**.
     - The multi-tenant potential across local restaurants and venues.

---

**End of Report**

This version of the report reflects the actual Yo Coney Bot implementation: multi-persona, voice-enabled, data-grounded, and production-minded, while clearly flagging **ordering and promotions** as future work rather than current capabilities.
