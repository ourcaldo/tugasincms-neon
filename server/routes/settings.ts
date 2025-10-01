import { Router } from 'express';
import { supabase } from '../db';
import { nanoid } from 'nanoid';

export const settingsRouter = Router();

settingsRouter.get('/profile/:userId', async (req, res) => {
  try {
    console.log('🔍 Fetching user profile:', req.params.userId);
    
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.params.userId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        console.log('❌ User not found:', req.params.userId);
        return res.status(404).json({ error: 'User not found' });
      }
      throw error;
    }
    
    if (!user) {
      console.log('❌ User not found:', req.params.userId);
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log('✅ User profile found:', user.email);
    res.json(user);
  } catch (error: any) {
    console.error('❌ Error fetching profile:', error);
    res.status(500).json({ 
      error: 'Failed to fetch profile',
      details: error.message 
    });
  }
});

settingsRouter.put('/profile/:userId', async (req, res) => {
  try {
    const { name, bio, avatar } = req.body;
    
    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({
        name,
        bio,
        avatar,
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.params.userId)
      .select()
      .single();
    
    if (error) throw error;
    
    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

settingsRouter.post('/profile', async (req, res) => {
  try {
    const { id, email, name, avatar } = req.body;
    
    console.log('📝 Creating new user profile:', { id, email, name });
    
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        id,
        email,
        name,
        avatar,
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error creating profile:', error);
      throw error;
    }
    
    console.log('✅ User profile created successfully:', newUser);
    res.status(201).json(newUser);
  } catch (error: any) {
    console.error('❌ Failed to create profile:', error);
    res.status(500).json({ 
      error: 'Failed to create profile',
      details: error.message 
    });
  }
});

settingsRouter.get('/tokens/:userId', async (req, res) => {
  try {
    const { data: tokens, error } = await supabase
      .from('api_tokens')
      .select('*')
      .eq('user_id', req.params.userId);
    
    if (error) throw error;
    
    res.json(tokens || []);
  } catch (error) {
    console.error('Error fetching tokens:', error);
    res.status(500).json({ error: 'Failed to fetch tokens' });
  }
});

settingsRouter.post('/tokens', async (req, res) => {
  try {
    const { name, userId } = req.body;
    const token = `cms_${nanoid(32)}`;
    
    const { data: newToken, error } = await supabase
      .from('api_tokens')
      .insert({
        token,
        name,
        user_id: userId,
      })
      .select()
      .single();
    
    if (error) throw error;
    
    res.status(201).json(newToken);
  } catch (error) {
    console.error('Error creating token:', error);
    res.status(500).json({ error: 'Failed to create token' });
  }
});

settingsRouter.delete('/tokens/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('api_tokens')
      .delete()
      .eq('id', req.params.id);
    
    if (error) throw error;
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting token:', error);
    res.status(500).json({ error: 'Failed to delete token' });
  }
});
