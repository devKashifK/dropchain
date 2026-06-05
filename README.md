# Dropchain — Mini Contextual AI Assistant

A full-stack RAG (Retrieval-Augmented Generation) application that lets you upload a document and chat with it. The AI answers questions using **only** the provided document as context, and shows you exactly which parts of the document it used to generate the answer.

**Live Demo:** [dropchain-peach.vercel.app](https://dropchain-peach.vercel.app)

**GitHub:** [github.com/devKashifK/dropchain](https://github.com/devKashifK/dropchain)

---

## Features

- **Document Ingestion** — Upload a `.txt` file or paste text directly (PDF support removed)
- **RAG Pipeline** — Text chunking → Gemini embeddings → cosine similarity search → LLM answer
- **Citations** — Every answer shows the exact document chunks used with relevance scores
- **Automatic Fallbacks** — Highly resilient model fallback chains for both LLM generation and embeddings
- **Multiple Chats** — Each conversation has its own isolated vector store
- **Export Chat** — Download your conversation history in clean structured formats
- **Dark / Light Mode & Mobile Drawer** — Toggle themes, with an optimized responsive design for mobile screens (including quick-switching recent chats)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript + Vite + Tailwind CSS |
| Backend | Node.js + Express + TypeScript |
| Embeddings | Gemini `gemini-embedding-001` (Fallback: `text-embedding-004`) |
| LLM | Gemini `gemini-2.5-flash` (Fallbacks: `gemini-3.5-flash`, `gemini-1.5-flash-latest`) |
| Vector Store | In-memory array with cosine similarity |
| Deployment | Vercel (frontend) + Render (backend) |

---

## Architecture

```
User uploads document
        ↓
  POST /api/ingest
        ↓
  chunkText()           split into 150-word chunks with 20-word overlap
        ↓
  generateEmbedding()   Gemini embedding-001 → 768-dimensional vector
        ↓
  vectorStore           store { text, embedding } in memory per chatId

User asks a question
        ↓
  POST /api/query
        ↓
  generateEmbedding()   embed question with RETRIEVAL_QUERY taskType
        ↓
  similaritySearch()    cosine similarity → top 3 matching chunks
        ↓
  buildPrompt()         "Answer ONLY using this context: {chunks}"
        ↓
  Gemini Flash          generate answer
        ↓
  return { answer, citations: [{ text, score }] }
```

---

## Running Locally with Docker (Recommended)

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running


### Steps

```bash
# 1. Clone the repository
git clone https://github.com/devKashifK/dropchain
cd dropchain

# 3. Start everything with one command
docker-compose up --build
```

**App is now running at:**
- Frontend → http://localhost:5173
- Backend  → http://localhost:3001
- Health   → http://localhost:3001/health

---

## Running Locally Without Docker

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Add your GEMINI_API_KEY in .env
npm run dev
# Runs on http://localhost:3001
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
# Set VITE_API_URL=http://localhost:3001 in .env
npm run dev
# Runs on http://localhost:5173
```

---

## Environment Variables

### Root `.env` — for Docker

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | ✅ Yes | Gemini API key for embeddings and answers. 
### `backend/.env` — for local dev

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | ✅ Yes | Gemini API key |
| `PORT` | No | Server port (default: 3001) |
| `FRONTEND_URL` | No | Frontend URL for CORS (default: *) |

### `frontend/.env` — for local dev

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | ✅ Yes | Backend URL (default: http://localhost:3001) |

---

## API Reference

### `POST /api/ingest`

Ingests a document into the vector store.

**Request** (multipart/form-data):
```
file: .txt file
```

**Request** (application/json):
```json
{ "text": "your document text here" }
```

**Headers:**
```
x-provider: gemini
x-api-key:  your custom API key (optional)
x-chat-id:  unique chat session ID
```

**Response:**
```json
{
  "success": true,
  "chunksStored": 8,
  "chunks": ["chunk 1 text...", "chunk 2 text..."]
}
```

---

### `POST /api/query`

Queries the vector store and returns an AI-generated answer with citations.

**Request:**
```json
{ "question": "What is the main topic of this document?" }
```

**Headers:**
```
x-provider: gemini
x-api-key:  your custom API key (optional)
x-chat-id:  unique chat session ID
```

**Response:**
```json
{
  "success": true,
  "answer": "The main topic is...",
  "citations": [
    { "text": "relevant chunk text...", "score": 0.921 },
    { "text": "another relevant chunk...", "score": 0.874 }
  ]
}
```

---

### `GET /health`

Health check endpoint.

**Response:**
```json
{ "status": "ok", "timestamp": "2026-06-03T10:00:00.000Z" }
```

---

## Project Structure

```
dropchain/
├── docker-compose.yml
├── .env.example
├── README.md
├── AI_PROMPTS.md
│
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── src/
│       ├── index.ts              Express app entry point
│       ├── routes/
│       │   ├── ingest.ts         POST /api/ingest
│       │   └── query.ts          POST /api/query
│       └── services/
│           ├── chunker.ts        Text splitting with overlap
│           ├── embedder.ts       Gemini + OpenAI embeddings
│           └── vectorStore.ts    In-memory vector store with cosine similarity
│
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── .env.example
    └── src/
        └── App.tsx
```

---

## Architectural Decisions

**Why in-memory vector store?**
The assessment spec explicitly lists it as a valid option. For a demo application it avoids infrastructure complexity while still correctly demonstrating the full RAG pipeline. In production this would be replaced with ChromaDB or Pinecone.

**Why Gemini for both embeddings and LLM?**
Gemini offers a generous free tier (1,500 requests/day) making the app fully functional without any paid API credits. Additionally, we implement resilient fallback model chains (e.g. falling back to `gemini-3.5-flash` and `gemini-1.5-flash-latest` for LLM tasks, and `text-embedding-004` for embedding tasks) to ensure high service availability in case of model rate-limits or outages.

**Why per-chatId vector stores?**
Each conversation is isolated in its own vector store using a `Map<chatId, VectorEntry[]>`. This allows multiple users to ingest different documents simultaneously without interference.

**Why TypeScript?**
Type safety catches bugs at compile time, makes the codebase more maintainable, and clearly documents the shape of data flowing through the RAG pipeline.

**Why tsx instead of ts-node?**
`tsx` is faster, requires zero configuration, and handles both ESM and CommonJS TypeScript seamlessly — making it ideal for both local development and Docker.

---

> **Note:** The backend is hosted on Render's free tier and may take up to 50 seconds to wake up after a period of inactivity. Subsequent requests will be fast.