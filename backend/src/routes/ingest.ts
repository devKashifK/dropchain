import express, { Request, Response } from 'express';
import multer from 'multer';
import { chunkText } from '../services/chunker';
import { generateEmbedding } from '../services/embedder';
import { addChunks, clearStore } from '../services/vectorStore';

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 }, // limit to 2MB for text files
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/plain') {
            cb(null, true);
        } else {
            cb(new Error('Only .txt files are allowed'));
        }
    }
});

router.post('/', upload.single('file'), async (req: Request, res: Response): Promise<void> => {
    try {
        let text = '';

        if (req.file) {
            text = req.file.buffer.toString('utf-8');
        } else if (req.body?.text) {
            text = req.body.text;
        } else {
            res.status(400).json({
                success: false,
                error: 'No text provided. Send a .txt file or { "text": "..." } in the body.'
            });
            return;
        }

        if (!text.trim()) {
            res.status(400).json({ success: false, error: 'Document is empty.' });
            return;
        }

        const provider = (req.headers['x-provider'] as 'gemini' | 'openai') || 'gemini';
        const apiKey = req.headers['x-api-key'] as string | undefined;
        let chatId = req.headers['x-chat-id'] as string | undefined;
        
        if (!chatId) {
            chatId = 'default';
        }

        clearStore(chatId);

        const chunks = chunkText(text, 150, 20);
        console.log(`[${chatId}] Document split into ${chunks.length} chunks.`);

        const embeddings: number[][] = [];
        for (let i = 0; i < chunks.length; i++) {
            console.log(`[${chatId}] Embedding chunk ${i + 1}/${chunks.length} with ${provider}...`);
            const embedding = await generateEmbedding(chunks[i], 'RETRIEVAL_DOCUMENT', provider, apiKey);
            embeddings.push(embedding);
        }

        addChunks(chatId, chunks, embeddings);

        res.json({
            success: true,
            chunksStored: chunks.length,
            chunks
        });

    } catch (err: any) {
        console.error('Ingest error:', err.message);
        if (err.isAuthError) {
             res.status(401).json({ success: false, isAuthError: true, error: err.message });
             return;
        }
        res.status(500).json({ success: false, error: err.message });
    }
});

export default router;
