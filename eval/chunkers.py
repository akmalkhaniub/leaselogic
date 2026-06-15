import re
import urllib.request
import json
import math

# Regex to split text into sentences
SENTENCE_SPLIT_REGEX = re.compile(r'(?<!\w\.\w.)(?<![A-Z][a-z]\.)(?<=\.|\?)\s+')

# Regex to match clause headers
CLAUSE_REGEX = re.compile(
    r'^\s*(?:(?:Section|SECTION|Article|ARTICLE|Clause|CLAUSE|Para|Paragraph)\s+(\d+(?:\.\d+)*|\w+)|(\d+\.\d+))\s*(.*)$'
)

def get_openai_embeddings(texts, api_key):
    """
    Fetch embeddings for a list of texts from OpenAI API using standard urllib.
    """
    if not api_key:
        raise ValueError("OpenAI API Key is required for semantic chunking.")
    
    url = "https://api.openai.com/v1/embeddings"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }
    
    data = {
        "model": "text-embedding-3-small",
        "input": texts
    }
    
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode('utf-8'),
        headers=headers,
        method="POST"
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            res_body = json.loads(response.read().decode('utf-8'))
            return [item['embedding'] for item in res_body['data']]
    except Exception as e:
        print(f"Error fetching embeddings from OpenAI: {e}")
        return None

def dot_product(v1, v2):
    return sum(x * y for x, y in zip(v1, v2))

def magnitude(v):
    return math.sqrt(sum(x * x for x in v))

def cosine_similarity(v1, v2):
    mag1 = magnitude(v1)
    mag2 = magnitude(v2)
    if mag1 == 0 or mag2 == 0:
        return 0
    return dot_product(v1, v2) / (mag1 * mag2)

def fixed_size_chunker(text, size=500, overlap=100):
    chunks = []
    start = 0
    while start < len(text):
        end = start + size
        chunk_text = text[start:end]
        chunks.append({
            "text": chunk_text.strip(),
            "clause_number": None,
            "clause_title": "Fixed-Size Chunk"
        })
        start += (size - overlap)
    return chunks

def clause_boundary_chunker(text):
    lines = text.split('\n')
    chunks = []
    current_chunk = []
    current_clause_num = None
    current_clause_title = "Preamble"
    
    for line in lines:
        match = CLAUSE_REGEX.match(line)
        if match:
            # Save previous chunk
            if current_chunk:
                clause_text = "\n".join(current_chunk).strip()
                if len(clause_text) > 30:
                    chunks.append({
                        "text": clause_text,
                        "clause_number": current_clause_num,
                        "clause_title": current_clause_title
                    })
            
            # Start new chunk
            current_clause_num = match.group(1) or match.group(2)
            current_clause_title = match.group(3).strip() if match.group(3) else "Clause Header"
            current_chunk = [line]
        else:
            current_chunk.append(line)
            
    # Save last chunk
    if current_chunk:
        clause_text = "\n".join(current_chunk).strip()
        if len(clause_text) > 30:
            chunks.append({
                "text": clause_text,
                "clause_number": current_clause_num,
                "clause_title": current_clause_title
            })
            
    return chunks

def semantic_chunker(text, api_key, threshold=0.45):
    """
    Split text into sentences, embed them, check similarity between adjacent sentences, and split.
    """
    sentences = [s.strip() for s in SENTENCE_SPLIT_REGEX.split(text) if s.strip()]
    if not sentences:
        return []
    
    # Batch embeddings call
    embeddings = get_openai_embeddings(sentences, api_key)
    if not embeddings or len(embeddings) != len(sentences):
        # Fallback to fixed size if API fails
        print("Fallback to fixed-size chunking due to API/embedding failure.")
        return fixed_size_chunker(text)
        
    chunks = []
    current_chunk_sentences = [sentences[0]]
    
    for i in range(len(sentences) - 1):
        sim = cosine_similarity(embeddings[i], embeddings[i+1])
        # If similarity is lower than threshold, split!
        if sim < threshold:
            chunks.append({
                "text": " ".join(current_chunk_sentences),
                "clause_number": None,
                "clause_title": "Semantic Chunk"
            })
            current_chunk_sentences = [sentences[i+1]]
        else:
            current_chunk_sentences.append(sentences[i+1])
            
    if current_chunk_sentences:
        chunks.append({
            "text": " ".join(current_chunk_sentences),
            "clause_number": None,
            "clause_title": "Semantic Chunk"
        })
        
    return chunks
