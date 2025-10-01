import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { clerkMiddleware } from '@clerk/express';
import { postsRouter } from './routes/posts';
import { categoriesRouter } from './routes/categories';
import { tagsRouter } from './routes/tags';
import { settingsRouter } from './routes/settings';
import { apiRouter } from './routes/api';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.BACKEND_PORT || '3001', 10);

app.use(cors());
app.use(express.json());
app.use(clerkMiddleware());

app.use('/api/posts', postsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/tags', tagsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/public', apiRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Only start the server if not in production (Vercel)
if (process.env.NODE_ENV !== 'production') {
  const HOST = '0.0.0.0';
  app.listen(PORT, HOST, () => {
    console.log(`Backend API server running on http://${HOST}:${PORT}`);
  });
}

export default app;
