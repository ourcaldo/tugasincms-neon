import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { clerkMiddleware } from '@clerk/express';
import { postsRouter } from '../server/routes/posts.js';
import { categoriesRouter } from '../server/routes/categories.js';
import { tagsRouter } from '../server/routes/tags.js';
import { settingsRouter } from '../server/routes/settings.js';
import { apiRouter } from '../server/routes/api.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(clerkMiddleware());

app.use('/api/posts', postsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/tags', tagsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/public', apiRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

export default app;
