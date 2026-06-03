import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import ingestRouter from './routes/ingest';
import queryRouter from './routes/query';

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ───────────────────────────────────────────────
app.use(cors({
    origin: [
        'http://localhost:5173',
        'https://dropchain-peach.vercel.app'
    ],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'x-api-key', 'x-provider', 'x-chat-id']
}));



app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Routes ──────────────────────────────────────────────────
app.use('/api/ingest', ingestRouter);
app.use('/api/query', queryRouter);

// ─── Health Check ────────────────────────────────────────────
app.get('/health', (req: Request, res: Response) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString()
    });
});

// ─── 404 Handler ─────────────────────────────────────────────
app.use((req: Request, res: Response) => {
    res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ─── Global Error Handler ─────────────────────────────────────
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Unhandled error:', err.message);
    res.status(500).json({ error: err.message || 'Internal server error' });
});

// ─── Start Server ─────────────────────────────────────────────
app.listen(PORT, () => {
    console.log('─────────────────────────────────────');
    console.log(`  Server running on port ${PORT}`);
    console.log(`  http://localhost:${PORT}`);
    console.log(`  Health: http://localhost:${PORT}/health`);
    console.log('─────────────────────────────────────');
});
