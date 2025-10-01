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

app.use('/posts', postsRouter);
app.use('/categories', categoriesRouter);
app.use('/tags', tagsRouter);
app.use('/settings', settingsRouter);
app.use('/public', apiRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

export default app;
