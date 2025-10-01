import { Router } from 'express';
import { supabase } from '../db';

export const tagsRouter = Router();

tagsRouter.get('/', async (req, res) => {
  try {
    const { data: tags, error } = await supabase
      .from('tags')
      .select('*')
      .order('name');
    
    if (error) throw error;
    
    res.json(tags || []);
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

tagsRouter.post('/', async (req, res) => {
  try {
    const { name, slug } = req.body;
    
    const { data: newTag, error } = await supabase
      .from('tags')
      .insert({
        name,
        slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
      })
      .select()
      .single();
    
    if (error) throw error;
    
    res.status(201).json(newTag);
  } catch (error) {
    console.error('Error creating tag:', error);
    res.status(500).json({ error: 'Failed to create tag' });
  }
});

tagsRouter.put('/:id', async (req, res) => {
  try {
    const { name, slug } = req.body;
    
    const { data: updatedTag, error } = await supabase
      .from('tags')
      .update({
        name,
        slug,
      })
      .eq('id', req.params.id)
      .select()
      .single();
    
    if (error) throw error;
    
    res.json(updatedTag);
  } catch (error) {
    console.error('Error updating tag:', error);
    res.status(500).json({ error: 'Failed to update tag' });
  }
});

tagsRouter.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('tags')
      .delete()
      .eq('id', req.params.id);
    
    if (error) throw error;
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting tag:', error);
    res.status(500).json({ error: 'Failed to delete tag' });
  }
});
