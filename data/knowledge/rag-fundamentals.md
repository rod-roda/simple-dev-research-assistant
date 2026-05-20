# RAG Fundamentals

## Chunking Strategies

Chunking breaks source documents into segments small enough for embedding models yet large enough to preserve meaning. Common approaches:

- **Fixed-size**: Split at N characters/tokens with overlap. Simple but may cut mid-sentence. Overlap (10–20%) prevents losing context at boundaries.
- **Paragraph-based**: Split on `\n\n`. Respects natural boundaries but yields variable-length chunks.
- **Semantic**: Use a model to detect topic shifts, then split between topics. Higher quality, higher compute cost.
- **Sliding window with metadata**: Chunk at fixed size but tag each chunk with parent document title, section headers, and sequential position.

Aim for 300–800 tokens per chunk for `text-embedding-3-small`. Too small loses context; too large dilutes relevance.

## Embedding Models

Embedding models convert text into fixed-dimension float vectors. Key models:

- `text-embedding-3-small` (1536 dims default, supports `dimensions` param for shorter vectors). Cheap, fast, good for most RAG.
- `text-embedding-3-large` (3072 dims). Higher recall at higher cost.
- `text-embedding-ada-002` (1536 dims). Legacy, still functional.

Choose dimension by storage budget vs recall needs. Cosine similarity is the standard distance metric for these models.

## Vector Similarity Search

Store embeddings in a vector database (Chroma, Pinecone, Qdrant, pgvector). Query by embedding the user's question, then retrieving the K nearest vectors by distance. Chroma supports cosine (`cosine`), L2 (`l2`), and inner product (`ip`) distance functions. Cosine is default and best for normalized embeddings.

Search returns documents sorted by relevance (distance). Threshold at a maximum distance to avoid irrelevant hits, or just take the top K.

## Retrieval Pipeline

1. Embed the user query.
2. Query the vector store for top-K results.
3. (Optional) Rerank with a cross-encoder for higher precision.
4. Format retrieved chunks into context — typically numbered blocks with source metadata.
5. Inject into the LLM prompt under a "Retrieved Context" section.
6. Instruct the model: "Answer using only the provided context. If insufficient, say so."

## Context Injection into Prompts

Insert retrieved chunks into the system or user message. Example template:

```
## Retrieved Context
{formatted_chunks}

## Instructions
Using only the context above, answer the user's question. Cite sources by number.
```

Keep total context under the model's context window. If chunk count exceeds budget, truncate the least relevant. Always include source metadata so the model can cite.

## Hybrid Search

Combine vector similarity search with full-text keyword search (BM25). Chroma supports `whereDocument` filtering alongside vector queries. Merge results by reciprocal rank fusion (RRF): score = 1/(k + rank_vector) + 1/(k + rank_keyword). Hybrid search improves recall for exact term matches (names, IDs) that semantic search may miss while preserving semantic matching for conceptual queries.