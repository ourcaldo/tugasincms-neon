import { Router } from 'express';
import { supabase } from '../db';

export const apiRouter = Router();

const verifyApiToken = async (token: string) => {
  if (!token) return null;
  
  try {
    const { data: apiToken, error } = await supabase
      .from('api_tokens')
      .select('*')
      .eq('token', token)
      .single();
    
    if (error || !apiToken) return null;
    
    if (apiToken.expires_at && new Date(apiToken.expires_at) < new Date()) {
      return null;
    }
    
    await supabase
      .from('api_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', apiToken.id);
    
    return apiToken;
  } catch (error) {
    console.error('Error verifying token:', error);
    return null;
  }
};

apiRouter.get('/posts', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    const validToken = await verifyApiToken(token || '');
    
    if (!validToken) {
      return res.status(401).json({ success: false, error: 'Invalid or expired API token' });
    }
    
    const { data: publishedPosts, error } = await supabase
      .from('posts')
      .select(`
        *,
        categories:post_categories(category:categories(*)),
        tags:post_tags(tag:tags(*))
      `)
      .eq('status', 'published')
      .order('publish_date', { ascending: false });
    
    if (error) throw error;
    
    const postsWithRelations = (publishedPosts || []).map((post) => ({
      ...post,
      categories: (post.categories || []).map((pc: any) => pc.category).filter(Boolean),
      tags: (post.tags || []).map((pt: any) => pt.tag).filter(Boolean),
    }));
    
    res.json({ success: true, data: postsWithRelations });
  } catch (error) {
    console.error('Error fetching published posts:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch posts' });
  }
});

apiRouter.post('/posts', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    const validToken = await verifyApiToken(token || '');
    
    if (!validToken) {
      return res.status(401).json({ success: false, error: 'Invalid or expired API token' });
    }
    
    const {
      title,
      slug,
      content,
      excerpt,
      featuredImage,
      publishDate,
      seoTitle,
      metaDescription,
      focusKeyword,
      categories,
      tagIds,
    } = req.body;
    
    const { data: newPost, error: postError } = await supabase
      .from('posts')
      .insert({
        title,
        slug,
        content,
        excerpt,
        featured_image: featuredImage,
        status: 'published',
        publish_date: publishDate ? new Date(publishDate).toISOString() : new Date().toISOString(),
        seo_title: seoTitle || title,
        meta_description: metaDescription || excerpt,
        focus_keyword: focusKeyword,
        author_id: validToken.user_id,
      })
      .select()
      .single();
    
    if (postError) throw postError;
    
    if (categories && categories.length > 0) {
      const categoryIdsToAssociate = [];
      
      for (const categoryName of categories) {
        const trimmedName = categoryName.trim();
        if (!trimmedName) continue;
        
        const { data: existingCategory } = await supabase
          .from('categories')
          .select('id')
          .ilike('name', trimmedName)
          .single();
        
        if (existingCategory) {
          categoryIdsToAssociate.push(existingCategory.id);
        } else {
          const categorySlug = trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
          const { data: newCategory, error: catError } = await supabase
            .from('categories')
            .insert({
              name: trimmedName,
              slug: categorySlug,
            })
            .select('id')
            .single();
          
          if (!catError && newCategory) {
            categoryIdsToAssociate.push(newCategory.id);
          }
        }
      }
      
      if (categoryIdsToAssociate.length > 0) {
        const categoryInserts = categoryIdsToAssociate.map((catId: string) => ({
          post_id: newPost.id,
          category_id: catId,
        }));
        
        await supabase.from('post_categories').insert(categoryInserts);
      }
    }
    
    if (tagIds && tagIds.length > 0) {
      const tagInserts = tagIds.map((tagId: string) => ({
        post_id: newPost.id,
        tag_id: tagId,
      }));
      
      await supabase.from('post_tags').insert(tagInserts);
    }
    
    res.status(201).json({ success: true, data: newPost });
  } catch (error) {
    console.error('Error creating post via API:', error);
    res.status(500).json({ success: false, error: 'Failed to create post' });
  }
});
