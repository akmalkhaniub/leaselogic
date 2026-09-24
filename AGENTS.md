# AGENTS.md — Autonomous Agent Operating Contract

## 🎯 Repository Purpose & Architecture
`LeaseLogic` turns unstructured commercial lease agreements into structured relational models with layout-aware parsing (`pdfplumber`), transactional task queues (`SKIP LOCKED`), and empirical chunking benchmarks (Recall@k, Precision@k).

### Tech Stack
- **Frontend**: Next.js 16 App Router
- **Backend API**: Express 5 + TypeScript
- **Parser & Benchmarks**: FastAPI + Python (`pdfplumber`)
- **Database**: PostgreSQL + pgvector

---

## ⚡ Autonomous Execution Protocol
1. Pull task from `TASKS.json`.
2. Run verification: `npm run typecheck` / `python -m pytest`.
3. Commit with: `feat(task-id): description`.
