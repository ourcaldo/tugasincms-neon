import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { clerkMiddleware } from '@clerk/express';
import { postsRouter } from './routes/posts';
import { categoriesRouter } from './routes/categories';
import { tagsRouter } from './routes/tags';
import { settingsRouter } from './routes/settings';
import { apiRouter } from './routes/api';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);

app.use(cors());
app.use(express.json());
app.use(clerkMiddleware());

// API routes
app.use('/api/posts', postsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/tags', tagsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/public', apiRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Serve static files from the build directory
app.use(express.static(path.join(__dirname, '../build')));

// All other routes should serve the index.html for client-side routing
app.use((_req, res) => {
  res.sendFile(path.join(__dirname, '../build', 'index.html'));
});

// Only start the server if not in production (Vercel)
if (process.env.NODE_ENV !== 'production') {
  const HOST = '0.0.0.0';
  app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
  });
}

export default app;
