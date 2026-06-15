import os
from chunkers import semantic_chunker, get_openai_embeddings, cosine_similarity
from run_eval import load_env, MOCK_LEASE, EVAL_SET

load_env()
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")

chunks = semantic_chunker(MOCK_LEASE, OPENAI_API_KEY, threshold=0.45)
print(f"Number of semantic chunks: {len(chunks)}")
for i, c in enumerate(chunks):
    print(f"Chunk {i}: {c['text'][:80]}...")

chunk_texts = [c['text'] for c in chunks]
chunk_embeddings = get_openai_embeddings(chunk_texts, OPENAI_API_KEY)
query_embeddings = get_openai_embeddings([item['query'] for item in EVAL_SET], OPENAI_API_KEY)

print("\n--- Retrieval details for Semantic Chunker ---")
for q_idx, eval_item in enumerate(EVAL_SET):
    q_emb = query_embeddings[q_idx]
    target_text = eval_item['target_text'].lower()
    
    similarities = []
    for c_idx, c_emb in enumerate(chunk_embeddings):
        sim = cosine_similarity(q_emb, c_emb)
        similarities.append((sim, chunk_texts[c_idx]))
    
    similarities.sort(key=lambda x: x[0], reverse=True)
    top_1_sim, top_1_text = similarities[0]
    matched = target_text in top_1_text.lower()
    print(f"Query: {eval_item['query']}")
    print(f"Target text: {target_text}")
    print(f"Top 1 retrieved: {top_1_text[:100]}... (Sim: {top_1_sim:.4f}, Match: {matched})")
    print("-" * 50)
