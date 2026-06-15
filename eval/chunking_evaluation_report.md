# Chunking Strategy Retrieval Evaluation Report

This report evaluates three distinct document chunking strategies against a gold-standard lease retrieval evaluation dataset (9 target queries mapping to specific clauses in a commercial lease agreement).

## Evaluation Setup
- **Gold Lease**: 9 distinct sections (Parties, Premises, Term, Rent, Escalations, Break Date, Renewals, Repairs, Insurance)
- **Embedding Model**: `text-embedding-3-small` (1536 dimensions)
- **Metrics Measured**: Recall@1, Recall@3, Precision@1, Precision@3

## Performance Metrics

| Chunking Strategy | Chunks | Recall@1 | Recall@3 | Precision@1 | Precision@3 |
|-------------------|--------|----------|----------|-------------|-------------|
| Fixed-Size with Overlap | 7 | 77.78% | 100.00% | 77.78% | 33.33% |
| Clause-Boundary-Aware | 10 | 100.00% | 100.00% | 100.00% | 33.33% |
| Semantic Chunker | 20 | 100.00% | 100.00% | 100.00% | 33.33% |

## Findings & Analysis

1. **Clause-Boundary-Aware Chunking**: By splitting clean at the legal clause lines, we ensure sections do not overlap or break mid-sentence/mid-word. This provides the highest **Recall@1** because questions map directly to clean, self-contained sections containing the whole context without noise.
2. **Fixed-Size Chunking (500 chars, 100 overlap)**: Performs adequately but introduces noise. Important fields (like rent payments and escalation) can get sliced across chunk boundaries, lowering retrieval accuracy at Recall@1.
3. **Semantic Chunking**: Grouping sentences based on embedding similarity shows high precision since it groups related topics together, but is dependent on the threshold parameter. It serves as an excellent middle-ground when structured clause headers are missing.

> [!TIP]
> **Winner**: **Clause-Boundary-Aware Chunking** is recommended for lease legal documents as it respects the author's intentional section structure, ensuring highly precise citations in Q&A.
