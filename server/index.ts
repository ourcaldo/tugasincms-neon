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
const PORT = process.env.BACKEND_PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(clerkMiddleware());

app.use('/api/posts', postsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/tags', tagsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/public', apiRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, 'localhost', () => {
  console.log(`Backend API server running on http://localhost:${PORT}`);
});
