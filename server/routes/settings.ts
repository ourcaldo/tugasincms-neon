import { Router } from 'express';
import { db } from '../db';
import { users, apiTokens } from '../../src/db/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const settingsRouter = Router();

settingsRouter.get('/profile/:userId', async (req, res) => {
  try {
    const user = await db.select().from(users).where(eq(users.id, req.params.userId)).limit(1);
    
    if (!user[0]) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user[0]);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

settingsRouter.put('/profile/:userId', async (req, res) => {
  try {
    const { name, bio, avatar } = req.body;
    
    const updatedUser = await db.update(users)
      .set({
        name,
        bio,
        avatar,
        updatedAt: new Date(),
      })
      .where(eq(users.id, req.params.userId))
      .returning();
    
    res.json(updatedUser[0]);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

settingsRouter.post('/profile', async (req, res) => {
  try {
    const { id, email, name, avatar } = req.body;
    
    const newUser = await db.insert(users).values({
      id,
      email,
      name,
      avatar,
    }).returning();
    
    res.status(201).json(newUser[0]);
  } catch (error) {
    console.error('Error creating profile:', error);
    res.status(500).json({ error: 'Failed to create profile' });
  }
});

settingsRouter.get('/tokens/:userId', async (req, res) => {
  try {
    const tokens = await db.select().from(apiTokens).where(eq(apiTokens.userId, req.params.userId));
    res.json(tokens);
  } catch (error) {
    console.error('Error fetching tokens:', error);
    res.status(500).json({ error: 'Failed to fetch tokens' });
  }
});

settingsRouter.post('/tokens', async (req, res) => {
  try {
    const { name, userId } = req.body;
    const token = `cms_${nanoid(32)}`;
    
    const newToken = await db.insert(apiTokens).values({
      token,
      name,
      userId,
    }).returning();
    
    res.status(201).json(newToken[0]);
  } catch (error) {
    console.error('Error creating token:', error);
    res.status(500).json({ error: 'Failed to create token' });
  }
});

settingsRouter.delete('/tokens/:id', async (req, res) => {
  try {
    await db.delete(apiTokens).where(eq(apiTokens.id, req.params.id));
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting token:', error);
    res.status(500).json({ error: 'Failed to delete token' });
  }
});
