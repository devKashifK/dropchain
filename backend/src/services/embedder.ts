import fetch from 'node-fetch';

/**
 * Generates an embedding vector for a given text using Gemini or OpenAI.
 *
 * @param text       - The text to embed
 * @param taskType   - RETRIEVAL_DOCUMENT (chunks) or RETRIEVAL_QUERY (questions)
 * @param provider   - 'gemini' or 'openai'
 * @param apiKey     - Custom API key or default from env
 * @returns embedding vector (768 for Gemini, 1536 for OpenAI)
 */
export async function generateEmbedding(
    text: string,
    taskType: string = 'RETRIEVAL_DOCUMENT',
    provider: 'gemini' | 'openai' = 'gemini',
    apiKey?: string
): Promise<number[]> {
    if (provider === 'gemini') {
        const key = apiKey || process.env.GEMINI_API_KEY;
        console.log(key, "keyyy")
        if (!key) throw new Error('GEMINI_API_KEY is not set');

        const models = ['gemini-embedding-001'];
        let lastError: any = null;

        for (const model of models) {
            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${key}`;
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: `models/${model}`,
                        content: { parts: [{ text }] },
                        taskType
                    })
                });

                if (!response.ok) {
                    const error = await response.json() as any;
                    if (response.status === 400 && error.error?.message?.includes("API key not valid")) {
                        const authErr = new Error(`Gemini Authentication Error: ${error.error.message}`);
                        (authErr as any).isAuthError = true;
                        throw authErr;
                    }
                    throw new Error(`Gemini Embedding error: ${JSON.stringify(error)}`);
                }

                const data = (await response.json()) as any;
                return data.embedding.values;
            } catch (err: any) {
                if (err.isAuthError) {
                    throw err;
                }
                console.warn(`Embedding model ${model} failed: ${err.message}. Trying next fallback...`);
                lastError = err;
            }
        }

        if (lastError) {
            throw lastError;
        }
    } else {
        const key = apiKey || process.env.OPENAI_API_KEY;
        if (!key) throw new Error('OPENAI_API_KEY is not set');

        const url = 'https://api.openai.com/v1/embeddings';
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${key}`
            },
            body: JSON.stringify({
                model: 'text-embedding-3-small',
                input: text
            })
        });

        if (!response.ok) {
            const error = await response.json() as any;
            if (response.status === 401 || response.status === 403) {
                const authErr = new Error(`OpenAI Authentication Error: ${error.error?.message || 'Unauthorized'}`);
                (authErr as any).isAuthError = true;
                throw authErr;
            }
            throw new Error(`OpenAI Embedding error: ${JSON.stringify(error)}`);
        }

        const data = (await response.json()) as any;
        return data.data[0].embedding;
    }
}
