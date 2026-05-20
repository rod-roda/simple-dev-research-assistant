# ChromaDB

## ChromaClient Setup with Docker

Run Chroma in Docker: `docker run -p 8000:8000 chromadb/chroma`. The server exposes a REST API at `http://localhost:8000`. Connect from the `chromadb` npm package:

```ts
import { ChromaClient } from "chromadb";
const client = new ChromaClient({ host: "localhost", port: 8000, ssl: false });
```

For custom URLs, parse the env var and pass `host`, `port`, `ssl` individually. The deprecated `path` option also accepts a full URL but may be removed in future versions. Authenticate by passing `headers` with an `Authorization` bearer token if Chroma is configured for auth.

## Collections

A collection is a named container for embeddings, documents, and metadata. Create or retrieve:

```ts
const collection = await client.getOrCreateCollection({ name: "my-kb" });
```

`createCollection` throws if the name exists. `getCollection` throws if it doesn't exist. `getOrCreateCollection` is idempotent. Each collection has a distance function set at creation (default: cosine). Specify via `metadata: { "hnsw:space": "l2" }` for L2, `"cosine"` for cosine, or `"ip"` for inner product.

## Upsert

Upsert inserts new records or updates existing ones by ID:

```ts
await collection.upsert({
  ids: ["chunk-0", "chunk-1"],
  embeddings: [[0.1, 0.2, ...], [0.3, 0.4, ...]],
  documents: ["First chunk text", "Second chunk text"],
  metadatas: [{ filename: "doc1.md" }, { filename: "doc2.md" }],
});
```

If `embeddings` are omitted and an embedding function was configured on the collection, Chroma generates them from `documents`. When providing pre-computed embeddings (e.g., from OpenAI), omit the embedding function and pass embeddings explicitly.

## Query by Embedding

```ts
const results = await collection.query({
  queryEmbeddings: [queryVector],
  nResults: 5,
  include: ["documents", "metadatas", "distances"],
});
```

Results are column-major arrays: `results.documents[0]` is the list of documents for the first query, `results.metadatas[0]` the corresponding metadata, `results.distances[0]` the distance scores. Lower distance = more similar for cosine/L2.

You can also query by text if an embedding function is set on the collection: `queryTexts: ["search query"]`.

## Metadata Filtering

Filter queries with `where` (metadata) and `whereDocument` (document content):

```ts
await collection.query({
  queryEmbeddings: [vec],
  nResults: 5,
  where: { filename: "important.md" },              // exact match
  where: { year: { "$gte": 2024 } },                // comparison
  whereDocument: { "$contains": "chromadb" },       // content filter
});
```

Operators: `$eq`, `$ne`, `$gt`, `$gte`, `$lt`, `$lte` for metadata; `$contains` for document text. Combine with `$and` / `$or`.

## Distance Functions

- **Cosine** (default): measures angle between vectors. Normalized vectors → cosine similarity equals dot product. Best for embedding models that produce normalized vectors.
- **L2** (Euclidean): straight-line distance. Better when magnitude matters.
- **IP** (Inner Product): dot product. Useful for maximum inner product search where higher is better (requires reversing sort intuition).

Choose at collection creation time; cannot be changed after.