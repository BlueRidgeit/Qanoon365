# Qanoon365 AI Handover

> **What is this?** Everything you need to know about the AI side of Qanoon365.
> Skip around. Read the bold parts. Come back when you need details.

---

## THE 30-SECOND VERSION

Qanoon365 is AlBasti reskinned with BlueRidge IT branding. Same CRM, same 13 modules, same multi-tenant architecture. What's NEW is **Daleel** — an AI chatbot that lets lawyers ask questions about their own documents.

**The pipeline:** SharePoint docs go in one end. Chunked, embedded, indexed text comes out the other. Lawyers ask questions, Daleel searches the index, feeds relevant chunks to GPT-4o, and returns answers with page-number citations.

**Right now:** Pipeline is built. Chatbot is live. No real documents are in the system yet. That's the next step.

---

## WHAT'S LIVE RIGHT NOW

| Thing | Status | URL |
|-------|--------|-----|
| Web app | LIVE | `https://qanoon365-web-dev.victoriousdesert-c704d4be.eastus2.azurecontainerapps.io` |
| API | LIVE | `https://qanoon365-api-dev.victoriousdesert-c704d4be.eastus2.azurecontainerapps.io` |
| Login | Works | `bladmin@albasti.dev` / `Myfav0r!teBL1T` |
| GitHub | Main branch | `github.com/BlueBeelo/qanoon365` |
| CI/CD | Auto-deploy on push to main | GitHub Actions -> ACR -> Azure Container Apps |

---

## THE AI FEATURES (5 total)

### 1. Daleel Chatbot (the big one)

**What it does:** Lawyers type a question. Daleel searches their document knowledge base, finds relevant chunks, feeds them to GPT-4o, and returns an answer with source citations (document name + page number).

**Where the code lives:**
```
packages/api/src/daleel/          <- Backend (NestJS)
  daleel.service.ts               <- Core logic: search -> context -> GPT-4o -> response
  daleel.config.ts                <- Environment variable config
  daleel.controller.ts            <- API routes (POST /daleel/chat, GET /conversations)
  dto/chat.dto.ts                 <- Request shape
  dto/conversation.dto.ts         <- Response shapes

packages/web/src/app/(dashboard)/daleel/
  page.tsx                        <- Chat UI (sidebar + messages + sources)

packages/web/src/hooks/
  use-daleel.ts                   <- React hook for API calls
```

**API endpoints:**
- `POST /daleel/chat` — send message, get response with sources
- `GET /daleel/conversations` — list user's conversations
- `GET /daleel/conversations/:id` — load a conversation
- `DELETE /daleel/conversations/:id` — delete a conversation

**How search works (hybrid):**
1. User asks a question
2. Question gets embedded (text-embedding-3-large -> 3072-dim vector)
3. Azure AI Search runs BOTH keyword search (BM25) AND vector similarity search
4. Top 5 results come back
5. Results get injected into the user message as context
6. GPT-4o answers based on the context
7. Sources (file name, page number, snippet) are saved with the response

**System prompt:** Comprehensive UAE legal prompt with jurisdictional awareness (DIFC vs ADGM vs Federal), court hierarchy, anti-hallucination rules, citation requirements, and mandatory disclaimer. See `daleel.service.ts` line 25.

### 2. Court Intelligence Engine

**What it does:** 4 query types for analyzing court records and CRM data.
- Party intelligence (litigation history, risk profile)
- Comparable cases (timeline/outcome estimation)
- Contextual case law (relevant precedents)
- Opposing counsel (track record analysis)

**Where:** `packages/api/src/court-intel/`

### 3. AI Document Drafting

**What it does:** Generates first drafts of legal documents from matter/client context.
- Engagement letters, legal memos, client updates, NDAs, demand letters

**Where:** `packages/api/src/ai-drafting/`

### 4. AI Conflict Detection

**What it does:** Auto-checks new engagements against existing clients, matters, and court records. Fuzzy Arabic name matching.

**Where:** `packages/api/src/conflicts/conflict-analysis.service.ts`

### 5. AI Intake Assistant

**What it does:** Paste raw text (email, phone notes). AI extracts practice area, jurisdiction, urgency, client name, opposing party.

**Where:** `packages/api/src/leads/intake-assistant.service.ts`

---

## THE DOCUMENT PIPELINE

> **This is the part that matters most.** Without documents in the system, Daleel is just GPT-4o with a fancy prompt. The documents are the product.

### How Documents Get Into the System

```
SharePoint (client's document library)
        |
        v
  Download via Microsoft Graph API
        |
        v
  Extract text (dual: PyMuPDF + Azure Doc Intelligence)
  -> Quality scorer picks the best extraction per page
  -> Handles Arabic, English, tables, scanned PDFs
        |
        v
  Chunk (split into ~1024-token pieces with 256-token overlap)
  -> Tracks which pages each chunk came from
  -> SHA256 chunk IDs for deduplication
        |
        v
  Embed (Azure OpenAI text-embedding-3-large -> 3072-dim vectors)
  -> Batches of 16 (Azure API limit)
        |
        v
  Index (Azure AI Search)
  -> Hybrid index: keyword (BM25) + vector (HNSW)
  -> Filterable by tenantId, matterId, documentId
        |
        v
  Sync log (PostgreSQL)
  -> Tracks what's been synced, when, status
  -> Skips unchanged documents on re-sync
```

### Where the Pipeline Code Lives

```
packages/ingestion/               <- Python 3.12
  src/
    main.py                       <- CLI: --sync, --create-index, --test-extract
    sync.py                       <- Orchestrator (the main loop)
    sharepoint.py                 <- Microsoft Graph API client
    extract.py                    <- Dual PDF extraction + quality scoring
    chunk.py                      <- Token-aware chunking with overlap
    embed.py                      <- Azure OpenAI embedding generation
    index_manager.py              <- Azure AI Search index CRUD + hybrid search
    config.py                     <- All environment variables
  requirements.txt
  Dockerfile
```

### Running the Pipeline

```bash
# From packages/ingestion/
pip install -r requirements.txt

# Full sync: SharePoint -> extract -> chunk -> embed -> index
python -m src.main --sync

# Just create/update the search index schema
python -m src.main --create-index

# Test extraction on a local PDF (no Azure needed)
python -m src.main --test-extract /path/to/file.pdf
```

### Environment Variables the Pipeline Needs

```env
# SharePoint (Microsoft Graph)
SHAREPOINT_TENANT_ID=...
SHAREPOINT_CLIENT_ID=...
SHAREPOINT_CLIENT_SECRET=...
SHAREPOINT_SITE_ID=...
SHAREPOINT_LIBRARY_IDS=lib1,lib2   # comma-separated

# Azure AI Search
AZURE_SEARCH_ENDPOINT=https://qanoon365-search-dev.search.windows.net
AZURE_SEARCH_KEY=...
AZURE_SEARCH_INDEX=qanoon365-docs

# Azure Document Intelligence (optional, improves table/scan quality)
AZURE_DOCINTEL_ENDPOINT=https://qanoon365-docintel-dev.cognitiveservices.azure.com
AZURE_DOCINTEL_KEY=...

# Azure OpenAI (for embeddings)
AZURE_OPENAI_ENDPOINT=https://albasti-openai-dev.openai.azure.com
AZURE_OPENAI_KEY=...
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-3-large

# PostgreSQL (for sync log)
DATABASE_URL=postgresql://albastiAdmin:...@albasti-pg-dev.postgres.database.azure.com:5432/albasti?sslmode=require

# Chunking (optional, these are the defaults)
CHUNK_SIZE=1024
CHUNK_OVERLAP=256
```

---

## WHAT MAKES RAG DALEEL BETTER THAN RAW CHATGPT

> **Be honest about this.** GPT-4o already knows most public legal knowledge. It knows the New York Convention. It knows GDPR. It knows UAE arbitration law generally. You can NOT win by feeding it public documents it already knows.

### Where Daleel wins (the real value):

1. **Private documents.** The client's SharePoint court files, settlements, agreements, internal memos. No model has EVER seen these. Ask raw ChatGPT about a specific settlement — it can't. Ask Daleel — it pulls up the document and cites page 47.

2. **Citations with sources.** Lawyers need to verify everything. Daleel says "according to [Settlement Agreement - Al Fahim v. ABC Corp], Page 12..." — a lawyer can check that. Raw ChatGPT says "generally, settlement agreements include..." — useless.

3. **CRM context.** Daleel knows which matter you're working on. It can filter search results to just that matter's documents. It knows the client, the opposing party, the jurisdiction. Raw ChatGPT starts from zero every time.

4. **It says "I don't know."** When there's nothing in the knowledge base, Daleel says so. Raw ChatGPT confidently invents case numbers and statute references. For lawyers, a confident wrong answer is worse than no answer.

### Where Daleel does NOT win (don't pretend it does):

- General legal knowledge (GPT already knows it)
- Public treaties and conventions (already in training data)
- Legal reasoning about hypotheticals (both are equally good/bad)

### The killer demo:

1. Upload 10 real court documents to SharePoint
2. Run the sync pipeline
3. Ask Daleel: "What were the damages awarded in the [specific case]?"
4. Show the answer with the exact citation
5. Ask ChatGPT the same question
6. Watch it say "I don't have access to that information"
7. That's the sale

---

## AZURE RESOURCES

> All in resource group `rg-albasti-dev`. DO NOT delete anything in this resource group.

| Resource | Name | Location | Notes |
|----------|------|----------|-------|
| Container App (API) | `qanoon365-api-dev` | eastus2 | NestJS backend |
| Container App (Web) | `qanoon365-web-dev` | eastus2 | Next.js frontend |
| Azure OpenAI | `albasti-openai-dev` | eastus2 | Deployments: `gpt-4o` + `text-embedding-3-large` |
| AI Search | `qanoon365-search-dev` | eastus2 | Free tier, index: `qanoon365-docs` |
| Doc Intelligence | `qanoon365-docintel-dev` | eastus2 | F0 (free tier) |
| PostgreSQL | `albasti-pg-dev` | centralus | User: `albastiAdmin` |
| Redis | `albasti-redis-dev` | eastus2 | |
| Storage | `albastistorage` | eastus2 | Container: `qanoon365-docs` |
| ACR | `albasticr` | eastus2 | Docker image registry |

The AlBasti resources (albasti-api-dev, albasti-web-dev) are ALSO in this resource group. Don't touch them.

---

## WHAT NEEDS TO HAPPEN NEXT

### Immediate (to make the demo work):

- [ ] Get SharePoint access credentials from BlueRidge IT
- [ ] Configure the ingestion pipeline environment variables
- [ ] Run `python -m src.main --sync` to pull documents into the index
- [ ] Test Daleel with real questions about those documents

### Short-term (to make it production-ready):

- [ ] Set up SharePoint webhooks for automatic re-sync when documents change
- [ ] Add streaming responses to Daleel (SSE) for better chat UX
- [ ] Test with Arabic-heavy documents to validate dual extraction quality
- [ ] Add a "no results" UI state when search returns nothing relevant

### Later (nice to have):

- [ ] Ingest DIFC/ADGM court judgments (freely available, niche, high value)
- [ ] Add semantic ranking in Azure AI Search for better result relevance
- [ ] Build an eval benchmark to quantify RAG vs raw GPT quality
- [ ] Consider pgvector on existing PostgreSQL as a fallback/complement to AI Search

---

## ARCHITECTURE DECISIONS (why things are the way they are)

**Why Azure AI Search instead of pgvector?**
Hybrid search (keyword + vector) out of the box. Legal queries need both — "Federal Law No. 6 of 2018" (keyword) AND "UAE arbitration framework" (semantic). pgvector only does vector.

**Why dual extraction (PyMuPDF + Doc Intelligence)?**
PyMuPDF is fast and free. Doc Intelligence handles scanned PDFs and tables better. The quality scorer picks the best per page. Most pages use PyMuPDF (saves money). Pages with tables use Doc Intelligence.

**Why text-embedding-3-large (3072 dims) instead of small (1536)?**
Better quality for mixed Arabic/English legal text. The cost difference is negligible at our scale (pennies).

**Why no LangChain?**
Explicit decision. Raw Azure SDKs only. LangChain adds abstraction overhead, version churn, and makes debugging harder. The pipeline is ~2000 lines of Python — simple enough to read top to bottom.

**Why schema-per-tenant?**
`SET search_path TO "tenant_{id}", public` on every request. Each tenant's data is completely isolated at the database level. Public court data lives in the `public` schema, accessible to all tenants.

**Why swappable provider pattern for AI?**
`ICourtIntelProvider` interface lets you swap GPT-4o for a custom model later. All AI features use this pattern. When you have enough UAE court data to fine-tune your own model, you can drop it in without touching the service layer.
