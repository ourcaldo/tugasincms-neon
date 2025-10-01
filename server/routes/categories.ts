import { Router } from 'express';
import { supabase } from '../db';

export const categoriesRouter = Router();

categoriesRouter.get('/', async (req, res) => {
  try {
    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');
    
    if (error) throw error;
    
    res.json(categories || []);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

categoriesRouter.post('/', async (req, res) => {
  try {
    const { name, slug, description } = req.body;
    
    const { data: newCategory, error } = await supabase
      .from('categories')
      .insert({
        name,
        slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
        description,
      })
      .select()
      .single();
    
    if (error) throw error;
    
    res.status(201).json(newCategory);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

categoriesRouter.put('/:id', async (req, res) => {
  try {
    const { name, slug, description } = req.body;
    
    const { data: updatedCategory, error } = await supabase
      .from('categories')
      .update({
        name,
        slug,
        description,
      })
      .eq('id', req.params.id)
      .select()
      .single();
    
    if (error) throw error;
    
    res.json(updatedCategory);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

categoriesRouter.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', req.params.id);
    
    if (error) throw error;
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});
