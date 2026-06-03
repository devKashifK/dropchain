# AI Prompts Log

This file documents how I used Claude (Anthropic) as a collaborative tool while building this application. The approach was mixed — some parts I designed and asked AI to validate, some parts I asked AI to build directly, and some parts were genuine back-and-forth iteration. The prompts below reflect all three honestly.

---

## Tool Used
**Claude (Anthropic)** — used as a pair programmer throughout the build.

---

## 1. Architecture Validation — Routes vs Services Split

**My design before prompting:**
I planned a clean separation: `routes/` handles HTTP concerns (`ingest.ts`, `query.ts`) and `services/` holds the RAG pipeline logic (`chunker.ts`, `embedder.ts`, `vectorStore.ts`). The idea was that services stay independently testable and swappable without touching route handlers.

**Prompt:**
> I've designed this folder structure for the backend — routes/ for HTTP handlers and services/ for RAG pipeline logic (chunker, embedder, vectorStore). The routes just call into services and handle request/response shapes. Does this separation make sense for this scale, or is it over-engineering a small project? Any gaps in the contract between layers I should think about?

**What AI confirmed / added:**
The separation was validated as the right call even at this scale. Claude suggested one thing I hadn't locked down yet — defining the response shapes as explicit TypeScript interfaces upfront so both sides of the API stay in sync. I added that before writing any route handlers, and it saved me a few back-and-forth fixes later.

---

## 2. Text Chunking — Chunk Size and Overlap Strategy

**My plan before prompting:**
I knew I wanted word-based chunking with overlap to avoid losing context at boundaries. My instinct was somewhere around 100–200 words per chunk, but I wasn't confident about the right overlap size or the reasoning behind it.

**Prompt:**
> I'm building a chunker for a RAG pipeline over small-to-medium documents like company policies and product specs. I'm thinking 150-word chunks with some overlap. Is that a reasonable size, or would you adjust it? What overlap amount would you recommend, and what's the actual reason overlap helps?

**What AI confirmed / added:**
150 words with 20-word overlap was confirmed as a solid baseline. The explanation of *why* overlap matters was useful — it's not just about sentence boundaries, it's about ensuring a phrase split across two chunks still appears intact in at least one. That clarified why 20 words specifically is meaningful. My final `chunkText()` in `chunker.ts` uses exactly this: `i += chunkSize - overlap` to slide the window forward.

---

## 3. Embedding Task Types — A Gap I Almost Missed

**My plan before prompting:**
I had chosen Gemini's `gemini-embedding-001` model. I planned to use the same embedding call for both ingesting document chunks and embedding the user's query at search time — same function, same parameters.

**Prompt:**
> I'm using Gemini embeddings for both storing document chunks and embedding queries at search time. I was going to use one generic embedding call for both. Is there any reason to differentiate between these two uses, or is it fine to treat them the same?

**What AI caught:**
This is where AI genuinely saved me. Gemini's embedding API supports a `taskType` parameter — `RETRIEVAL_DOCUMENT` for storage and `RETRIEVAL_QUERY` for search — and the model optimises the vector space differently depending on the task. I hadn't known this existed. I updated `embedder.ts` to accept a `taskType` parameter: `ingest.ts` calls with `RETRIEVAL_DOCUMENT`, `query.ts` calls with `RETRIEVAL_QUERY`.

**Where human intervention was needed:**
The correct model name still required manual verification against Google's official docs. AI gave plausible-sounding but outdated names — went through `text-embedding-004` → `embedding-001` → `gemini-embedding-001` before landing on the right one. The fallback array in `embedder.ts` reflects what I found through manual testing.

---

## 4. Gemini Fallback Chain 

**The problem:**
Gemini 2.5 Flash was intermittently returning 503 overloaded errors and crashing the app entirely. I didn't have a clear solution in mind and asked AI to design the resilience pattern.

**Prompt:**
> Gemini 2.5 Flash keeps returning 503 overloaded errors and crashing my app. I want to handle this gracefully without the user noticing. Can you design a resilient fallback function that automatically tries other Gemini models, differentiates between retryable errors (503, 429) and hard stops (401, 403 auth errors), and propagates a clear flag so the frontend can show a specific message for auth failures?

**What AI built:**
AI designed the full `callGeminiWithFallback()` pattern — a priority-ordered model array `['gemini-2.5-flash', 'gemini-3.5-flash', 'gemini-1.5-flash-latest']` with a loop that catches errors, checks whether they're retryable, and breaks early on auth failures. The `isAuthError` flag was AI's idea — it propagates up to the frontend's `ApiErrorDialog` component so users see "check your API key" instead of a generic crash. I reviewed the logic, understood it, and integrated it into `query.ts` and `embedder.ts` as-is. This was one of the clearest cases of AI directly accelerating the build.

---

## 5. Per-Session Vector Store Isolation

**My plan before prompting:**
I designed a `Map<chatId, VectorEntry[]>` to isolate each chat session's embeddings in memory, with no database needed. Each request passes `x-chat-id` via header. `clearStore(chatId)` only wipes that session. I was confident in the design but wanted to stress-test it before writing it.

**Prompt:**
> I've designed per-session vector store isolation using a Map<chatId, VectorEntry[]>. New sessions lazily initialise an empty array, and clearStore only touches that chatId's data. For an internal demo tool with a small number of concurrent users, is there anything fragile about this — concurrency issues, memory leaks, anything worth guarding against now vs deferring?

**What AI flagged:**
The design was confirmed as solid for this scale. Claude flagged one real concern: without a TTL or cleanup mechanism, old session data accumulates indefinitely in memory. I consciously deferred this for the assessment scope and noted it in the README. In production this would need LRU eviction or session expiry.

---

## 6. Cosine Similarity

**The situation:**
I knew I wanted to avoid pulling in an external vector search library for something this small, and I knew cosine similarity was the right algorithm — but I asked AI to write the actual implementation rather than doing it myself.

**Prompt:**
> I need a cosine similarity function in TypeScript for my in-memory vector store. I don't want to add a library dependency. Write me a clean implementation that handles any edge cases properly.

**What AI built:**
AI wrote the full implementation now in `vectorStore.ts`:

```ts
const dot = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
if (magA === 0 || magB === 0) return 0;
return dot / (magA * magB);
```

The zero-magnitude guard (`if (magA === 0 || magB === 0) return 0`) was included by AI to prevent `NaN` on zero vectors — I wouldn't have added that guard myself on the first pass. I reviewed the math, confirmed it was correct, and used it directly.

---

## 7. Docker — Debugging a Build Failure

**The situation:**
The TypeScript build worked locally but kept failing inside Docker on the `tsc` step. I had a working Dockerfile structure in mind but couldn't spot why it was breaking.

**Prompt:**
> My Docker build is failing on the tsc step. It works fine locally. I'm copying package.json and src/ into the image before running npm run build. Here's my Dockerfile — what am I missing?

**What AI caught:**
`tsconfig.json` wasn't being copied into the image, so `tsc` couldn't resolve configurations during the build step. One-line fix. Claude also suggested explicitly copying `tsconfig.json` as its own `COPY` step rather than relying on a broad `COPY . .`, which makes the build layer more predictable. The final `docker-compose.yml` brings up both backend (port 3001) and frontend (port 5173) with a single `docker-compose up --build`.

---

## 8. Frontend Component Architecture

**My plan before prompting:**
I had a clear component breakdown in mind: `Sidebar` for chat history, `ChatInterface` for the message thread, `ChatMessage` for individual messages with citation display, `DocumentSetup` for the upload flow, `SettingsModal` for API key config, and `TopBar` + `ChatInput` as layout pieces.

**Prompt:**
> Here's my planned component breakdown for the frontend — Sidebar, ChatInterface, ChatMessage, DocumentSetup, SettingsModal, TopBar, ChatInput, TypingIndicator. I'm using React context for global state (theme, chat sessions). Is there anything in this structure that will cause prop-drilling issues or awkward state management?

**What AI confirmed / added:**
The structure was validated. Claude pointed out that `ChatMessage` would need citation data typed explicitly rather than left loose, and suggested an optional `citations` prop with a defined interface. That's reflected in the final component — citations render conditionally with relevance scores shown per chunk. Context handles theme state via `ThemeProvider.tsx` and chat session state via the `context/` folder.

---
