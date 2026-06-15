# LeaseLogic 📄⚖️
### AI-Powered Lease Abstraction, Compliance Assistant, & Retrieval Benchmark (PropTech / Legal)

LeaseLogic turns unstructured commercial lease agreements (dense, multi-column, multi-page PDFs containing complex rent schedules, covenants, and options) into structured, queryable data. Built on a fully native full-stack architecture, it showcases layout-aware parsing, pgvector-grounded RAG compliance Q&A (via chat and voice), and Playwright automation, featuring an empirical **Retrieval & Chunking Evaluation Suite** that solves the hard retrieval problems of legal document ingestion.

---

## 🏗️ Architecture

```
        ┌──────────────────────────────────────────────────┐
        │             Next.js 16 (Client)                  │
        │  Upload · Lease Explorer · Chat · Voice Assistant│
        └───────────────┬──────────────────────────────────┘
                        │ SSE (Server-Sent Events)
        ┌───────────────▼──────────────────────────────────┐
        │          Express 5 + TypeScript API              │
        │   Auth · Query Routing · Embedding · Aggregation  │
        └──┬───────────────┬───────────────┬───────────────┘
           │               │               │
  ┌────────▼───────┐  ┌────▼────────┐  ┌───▼───────────────┐
  │ Voice Q&A      │  │ LLM APIs    │  │ Postgres Queue    │
  │ Browser Web    │  │ OpenAI +    │  │ SELECT FOR UPDATE │
  │ Audio STT/TTS  │  │ Claude      │  │ SKIP LOCKED       │
  └────────────────┘  └─────────────┘  └───┬───────────────┘
                        │                  │
       ┌────────────────┼──────────────────┼───────────────┐
       │                │                  │               │
┌──────▼──────────┐  ┌──▼──────────────┐  ┌─▼──────────────┐
│ FastAPI parser  │  │ Postgres +      │  │ FastAPI +      │
│ lease PDF →     │  │ pgvector        │  │ Playwright     │
│ structured text │  │ leases, clauses,│  │ land registry  │
│ + table extract │  │ embeddings,     │  │ portal filing  │
│ (Python)        │  │ audit           │  │                │
└─────────────────┘  └─────────────────┘  └────────────────┘
```

---

## ⚡ Core Features

- **Layout-Aware PDF Ingestion**: Leveraging `pdfplumber` (Python) to read leases page-by-page, extracting structural elements and tables (e.g. rent escalation schedules) as clean Markdown matrices.
- **Postgres Transactional Task Queue**: A queue worker built in Node.js using `SELECT ... FOR UPDATE SKIP LOCKED` on a Postgres table (`abstraction_jobs`). This guarantees concurrent, transactional background execution without requiring a separate Redis service.
- **Empirical Chunking Evaluation**: A python testing suite that benchmarks three distinct partitioning strategies against a gold-standard legal dataset (Recall@k / Precision@k), proving the retrieval depth called out in modern RAG engineering roles.
- **Structured Attribute Extraction with Resilient Fallback**: Automates the extraction of key terms (Start/End dates, initial rent, escalation %, break dates, obligations, insurance limits) backed by tool calling. If the primary LLM (Claude-3.5-Sonnet) encounters API errors or missing credentials, the pipeline automatically falls back to OpenAI's `gpt-4o-mini` tool use.
- **Pane-Linked Explorer UI**: A sleek Light Mode corporate workspace built in Next.js 16 (App Router, Vanilla CSS). Clicking an extracted parameter (e.g. "Break Clause") automatically highlights and scrolls to the exact source clause in the PDF's text flow.
- **Streaming Compliance Chat (RAG)**: Streams response tokens grounded in vector-searched clauses across the portfolio using pgvector and cosine similarity.
- **Voice Compliance Assistant**: Toggles microphone speech-to-text transcription and text-to-speech audio playback natively in the browser with full barge-in support.
- **Automated Filing (Playwright)**: Launches a Chromium instance using Playwright, navigates to a mock land-registry portal, fills in the extracted lease data parameter-by-parameter, submits the form, and prints terminal logs to the user console.

---

## 📊 The Chunking Evaluation Deep-Dive

Commercial leases are a challenging chunking problem. Clauses refer to other sections, definitions are scattered, and tabular data represents complex timelines. LeaseLogic benchmarks three chunking methodologies:
1. **Fixed-Size with Overlap (Baseline)**: 500-character windows with 100-character overlap.
2. **Clause-Boundary-Aware (Structural)**: regex splits matching legal paragraph layouts (`SECTION X.Y`, `Clause X`).
3. **Semantic Chunker (AI-Similarity)**: Splits text dynamically into sentences and groups them based on embedding similarity drops.

### Benchmark Results
Evaluating each strategy against a gold-standard dataset of 9 queries (e.g. *"Who is responsible for structural roof repairs?"* or *"What is the minimum required amount of public liability insurance?"*) using OpenAI's `text-embedding-3-small` model:

| Chunking Strategy | Chunks Created | Recall@1 | Recall@3 | Precision@1 | Precision@3 |
|-------------------|----------------|----------|----------|-------------|-------------|
| **Fixed-Size with Overlap** | 7 | 77.78% | 100.00% | 77.78% | 33.33% |
| **Clause-Boundary-Aware** | 10 | **100.00%** | **100.00%** | **100.00%** | **33.33%** |
| **Semantic Chunker** | 20 | **100.00%** | **100.00%** | **100.00%** | **33.33%** |

*Analysis*: Clause-Boundary-Aware chunking yields the clean, author-intended sections without crossing boundaries. Fixed-size chunking frequently splits terms (like escalation percentages) across chunk boundaries, polluting the vector representation and degrading retrieval Recall@1.

---

## 🛠️ Installation & Setup

### Prerequisites
- **Node.js**: v18+ (tested on v24)
- **Python**: v3.11 to v3.13
- **PostgreSQL**: v15+ with `pgvector` extension installed.

### 1. Database Setup
Ensure PostgreSQL is running, log into your server, and create the database:
```sql
CREATE DATABASE leaselogic;
```
Run the initialization script to generate tables and create the HNSW vector index:
```bash
# On Windows PowerShell:
$env:PGPASSWORD='your_password'; & "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d leaselogic -f .\init.sql
```

### 2. Configure Environment Variables
Create a `.env` file in the `server/` directory:
```env
PORT=5000
DATABASE_URL=postgresql://postgres:password@localhost:5432/leaselogic
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
PARSER_URL=http://localhost:8000
JWT_SECRET=super_secret_lease_logic_jwt_token_key_123
```

### 3. Install Backend Server (Express)
```bash
cd server
npm install
npm run build
```

### 4. Install Parser Service (FastAPI)
```bash
cd ../parser
python -m venv venv
.\venv\Scripts\activate   # On Windows
pip install -r requirements.txt
playwright install chromium
```

### 5. Install Client App (Next.js)
```bash
cd ../client
npm install
```

---

## 🚀 Running the Services

Start all services from their respective directories:

1. **Start Express Server** (on port `5000`):
   ```bash
   cd server
   npm run dev
   ```
2. **Start FastAPI Parser** (on port `8000`):
   ```bash
   cd parser
   .\venv\Scripts\uvicorn.exe main:app --host 0.0.0.0 --port 8000
   ```
3. **Start Next.js Client** (on port `3000`):
   ```bash
   cd client
   npm run dev
   ```

Open http://localhost:3000 in your browser.

---

## 🧪 Running Benchmarks & Generating Sample Leases

We provide helper scripts to generate mock PDF agreements and run the chunking evaluation:

```bash
# 1. Generate sample lease PDFs
python eval/generate_leases.py

# 2. Run the retrieval benchmark & write report
python eval/run_eval.py
```
Generated PDFs will be stored in `sample_leases/` and the report will be outputted to [eval/chunking_evaluation_report.md](file:///g:/ReplitProjects/leaselogic/eval/chunking_evaluation_report.md).
