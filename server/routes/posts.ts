import { Router } from 'express';
import { supabase } from '../db';

export const postsRouter = Router();

postsRouter.get('/', async (req, res) => {
  try {
    const { data: posts, error } = await supabase
      .from('posts')
      .select(`
        *,
        categories:post_categories(category:categories(*)),
        tags:post_tags(tag:tags(*))
      `);
    
    if (error) throw error;
    
    const postsWithRelations = posts?.map(post => ({
      id: post.id,
      title: post.title,
      content: post.content,
      excerpt: post.excerpt,
      slug: post.slug,
      featuredImage: post.featured_image,
      publishDate: post.publish_date,
      status: post.status,
      authorId: post.author_id,
      createdAt: post.created_at,
      updatedAt: post.updated_at,
      seo: {
        title: post.seo_title,
        metaDescription: post.meta_description,
        focusKeyword: post.focus_keyword,
        slug: post.slug,
      },
      categories: post.categories?.map((pc: any) => pc.category).filter(Boolean) || [],
      tags: post.tags?.map((pt: any) => pt.tag).filter(Boolean) || [],
    }));
    
    res.json(postsWithRelations || []);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

postsRouter.get('/:id', async (req, res) => {
  try {
    const { data: post, error } = await supabase
      .from('posts')
      .select(`
        *,
        categories:post_categories(category:categories(*)),
        tags:post_tags(tag:tags(*))
      `)
      .eq('id', req.params.id)
      .single();
    
    if (error) throw error;
    if (!post) return res.status(404).json({ error: 'Post not found' });
    
    const postWithRelations = {
      id: post.id,
      title: post.title,
      content: post.content,
      excerpt: post.excerpt,
      slug: post.slug,
      featuredImage: post.featured_image,
      publishDate: post.publish_date,
      status: post.status,
      authorId: post.author_id,
      createdAt: post.created_at,
      updatedAt: post.updated_at,
      seo: {
        title: post.seo_title,
        metaDescription: post.meta_description,
        focusKeyword: post.focus_keyword,
        slug: post.slug,
      },
      categories: post.categories?.map((pc: any) => pc.category).filter(Boolean) || [],
      tags: post.tags?.map((pt: any) => pt.tag).filter(Boolean) || [],
    };
    
    res.json(postWithRelations);
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
});

postsRouter.post('/', async (req, res) => {
  try {
    const {
      title,
      slug,
      content,
      excerpt,
      featuredImage,
      status,
      publishDate,
      seoTitle,
      metaDescription,
      focusKeyword,
      authorId,
      categoryIds,
      tagIds,
    } = req.body;
    
    const { data: newPost, error } = await supabase
      .from('posts')
      .insert({
        title,
        slug,
        content,
        excerpt,
        featured_image: featuredImage,
        status: status || 'draft',
        publish_date: publishDate || null,
        seo_title: seoTitle || title,
        meta_description: metaDescription || excerpt,
        focus_keyword: focusKeyword,
        author_id: authorId,
      })
      .select()
      .single();
    
    if (error) throw error;
    
    if (categoryIds && categoryIds.length > 0) {
      await supabase.from('post_categories').insert(
        categoryIds.map((catId: string) => ({
          post_id: newPost.id,
          category_id: catId,
        }))
      );
    }
    
    if (tagIds && tagIds.length > 0) {
      await supabase.from('post_tags').insert(
        tagIds.map((tagId: string) => ({
          post_id: newPost.id,
          tag_id: tagId,
        }))
      );
    }
    
    res.status(201).json(newPost);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

postsRouter.put('/:id', async (req, res) => {
  try {
    const {
      title,
      slug,
      content,
      excerpt,
      featuredImage,
      status,
      publishDate,
      seoTitle,
      metaDescription,
      focusKeyword,
      categoryIds,
      tagIds,
    } = req.body;
    
    const { data: updatedPost, error } = await supabase
      .from('posts')
      .update({
        title,
        slug,
        content,
        excerpt,
        featured_image: featuredImage,
        status,
        publish_date: publishDate || null,
        seo_title: seoTitle,
        meta_description: metaDescription,
        focus_keyword: focusKeyword,
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.params.id)
      .select()
      .single();
    
    if (error) throw error;
    
    await supabase.from('post_categories').delete().eq('post_id', req.params.id);
    
    if (categoryIds && categoryIds.length > 0) {
      await supabase.from('post_categories').insert(
        categoryIds.map((catId: string) => ({
          post_id: req.params.id,
          category_id: catId,
        }))
      );
    }
    
    await supabase.from('post_tags').delete().eq('post_id', req.params.id);
    
    if (tagIds && tagIds.length > 0) {
      await supabase.from('post_tags').insert(
        tagIds.map((tagId: string) => ({
          post_id: req.params.id,
          tag_id: tagId,
        }))
      );
    }
    
    res.json(updatedPost);
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ error: 'Failed to update post' });
  }
});

postsRouter.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', req.params.id);
    
    if (error) throw error;
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});
