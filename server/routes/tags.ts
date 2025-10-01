import { Router } from 'express';
import { db } from '../db';
import { tags } from '../../src/db/schema';
import { eq } from 'drizzle-orm';

export const tagsRouter = Router();

tagsRouter.get('/', async (req, res) => {
  try {
    const allTags = await db.select().from(tags);
    res.json(allTags);
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

tagsRouter.post('/', async (req, res) => {
  try {
    const { name, slug } = req.body;
    
    const newTag = await db.insert(tags).values({
      name,
      slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
    }).returning();
    
    res.status(201).json(newTag[0]);
  } catch (error) {
    console.error('Error creating tag:', error);
    res.status(500).json({ error: 'Failed to create tag' });
  }
});

tagsRouter.delete('/:id', async (req, res) => {
  try {
    await db.delete(tags).where(eq(tags.id, req.params.id));
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting tag:', error);
    res.status(500).json({ error: 'Failed to delete tag' });
  }
});
