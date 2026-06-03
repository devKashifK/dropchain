export interface VectorEntry {
    id: number;
    text: string;
    embedding: number[];
}

const storeMap = new Map<string, VectorEntry[]>();

function getStore(chatId: string): VectorEntry[] {
    if (!storeMap.has(chatId)) {
        storeMap.set(chatId, []);
    }
    return storeMap.get(chatId)!;
}

// Add a single chunk with its embedding
export function addChunk(chatId: string, text: string, embedding: number[]): number {
    const store = getStore(chatId);
    const id = store.length;
    store.push({ id, text, embedding });
    return id;
}

// Batch add chunks with embeddings
export function addChunks(chatId: string, chunks: string[], embeddings: number[][]): void {
    chunks.forEach((text, i) => addChunk(chatId, text, embeddings[i]));
}

// Cosine similarity between two vectors
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
    const dot = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    if (magA === 0 || magB === 0) return 0;
    return dot / (magA * magB);
}

// Find top K most similar chunks to a query embedding
export function similaritySearch(chatId: string, queryEmbedding: number[], topK: number = 3) {
    const store = getStore(chatId);
    return store
        .map(chunk => ({
            text: chunk.text,
            score: parseFloat(cosineSimilarity(queryEmbedding, chunk.embedding).toFixed(4))
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
}

// Clear all stored chunks for a specific chat
export function clearStore(chatId: string): void {
    storeMap.set(chatId, []);
    console.log(`Vector store cleared for chat: ${chatId}`);
}

// Get total chunks stored for a specific chat
export function size(chatId: string): number {
    return getStore(chatId).length;
}
