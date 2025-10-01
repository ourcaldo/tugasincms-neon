import { Router } from 'express';
import { db } from '../db';
import { categories } from '../../src/db/schema';
import { eq } from 'drizzle-orm';

export const categoriesRouter = Router();

categoriesRouter.get('/', async (req, res) => {
  try {
    const allCategories = await db.select().from(categories);
    res.json(allCategories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

categoriesRouter.post('/', async (req, res) => {
  try {
    const { name, slug, description } = req.body;
    
    const newCategory = await db.insert(categories).values({
      name,
      slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
      description,
    }).returning();
    
    res.status(201).json(newCategory[0]);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

categoriesRouter.delete('/:id', async (req, res) => {
  try {
    await db.delete(categories).where(eq(categories.id, req.params.id));
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});
