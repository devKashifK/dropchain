import express, { Request, Response } from 'express';
import fetch from 'node-fetch';
import { generateEmbedding } from '../services/embedder';
import { similaritySearch } from '../services/vectorStore';

const router = express.Router();

/**
 * POST /api/query
 * Body: { "question": "your question here" }
 * Headers: x-provider, x-api-key
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
    try {
        const { question } = req.body;
        const provider = (req.headers['x-provider'] as 'gemini' | 'openai') || 'gemini';
        const apiKey = req.headers['x-api-key'] as string | undefined;
        let chatId = req.headers['x-chat-id'] as string | undefined;
        
        if (!chatId) {
            chatId = 'default';
        }

        if (!question?.trim()) {
            res.status(400).json({ success: false, error: 'No question provided.' });
            return;
        }

        // --- Step 1: Embed the question ---
        console.log(`[${chatId}] Embedding question with ${provider}...`);
        const questionEmbedding = await generateEmbedding(question, 'RETRIEVAL_QUERY', provider, apiKey);

        // --- Step 2: Find similar chunks in memory ---
        console.log(`[${chatId}] Searching vector store...`);
        const citations = similaritySearch(chatId, questionEmbedding, 3);

        if (citations.length === 0) {
            res.json({
                success: true,
                answer: "No document has been ingested yet. Please upload a document first.",
                citations: []
            });
            return;
        }

        // --- Step 3: Build prompt ---
        const context = citations
            .map((c, i) => `[${i + 1}] ${c.text}`)
            .join('\n\n');

        const prompt = `You are a helpful assistant. Answer the question using ONLY the context provided below.
If the answer is not found in the context, say exactly: "I don't know based on the provided document."
Do not make up any information. Be concise and accurate.

CONTEXT:
${context}

QUESTION: ${question}

ANSWER:`;

        let answer = "";

        // --- Step 4: Call LLM ---
        if (provider === 'gemini') {
            const key = apiKey || process.env.GEMINI_API_KEY;
            if (!key) throw new Error('GEMINI_API_KEY is not configured.');

            const models = ['gemini-2.5-flash', 'gemini-3.5-flash', 'gemini-1.5-flash-latest'];
            let lastError: any = null;

            for (const model of models) {
                try {
                    console.log(`Calling Gemini (${model})...`);
                    const geminiRes = await fetch(
                        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
                        {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                contents: [{ parts: [{ text: prompt }] }],
                                generationConfig: { temperature: 0.2, maxOutputTokens: 1024 }
                            })
                        }
                    );

                    if (!geminiRes.ok) {
                        const err = await geminiRes.json() as any;
                        if (geminiRes.status === 400 && err.error?.message?.includes("API key not valid")) {
                            const authErr = new Error(`Gemini Authentication Error: ${err.error.message}`);
                            (authErr as any).isAuthError = true;
                            throw authErr;
                        }
                        throw new Error(`Gemini API error: ${JSON.stringify(err)}`);
                    }

                    const geminiData = (await geminiRes.json()) as any;
                    answer = geminiData.candidates[0].content.parts[0].text.trim();
                    lastError = null;
                    break;
                } catch (err: any) {
                    if (err.isAuthError) {
                        throw err;
                    }
                    console.warn(`Model ${model} failed: ${err.message}. Trying next fallback...`);
                    lastError = err;
                }
            }

            if (lastError) {
                throw lastError;
            }
        } else {
            console.log('Calling OpenAI GPT...');
            const key = apiKey || process.env.OPENAI_API_KEY;
            if (!key) throw new Error('OPENAI_API_KEY is not configured.');

            const openAiRes = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${key}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.2,
                    max_tokens: 1024
                })
            });

            if (!openAiRes.ok) {
                const err = await openAiRes.json() as any;
                if (openAiRes.status === 401 || openAiRes.status === 403) {
                    const authErr = new Error(`OpenAI Authentication Error: ${err.error?.message || 'Unauthorized'}`);
                    (authErr as any).isAuthError = true;
                    throw authErr;
                }
                throw new Error(`OpenAI API error: ${JSON.stringify(err)}`);
            }

            const openAiData = (await openAiRes.json()) as any;
            answer = openAiData.choices[0].message.content.trim();
        }

        // --- Step 5: Return answer + citations ---
        res.json({
            success: true,
            answer,
            citations
        });

    } catch (err: any) {
        console.error('Query error:', err.message);
        if (err.isAuthError) {
             res.status(401).json({ success: false, isAuthError: true, error: err.message });
             return;
        }
        res.status(500).json({ success: false, error: err.message });
    }
});

export default router;
