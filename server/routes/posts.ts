import { Router } from 'express';
import { db } from '../db';
import { posts, postCategories, postTags, categories, tags } from '../../src/db/schema';
import { eq, desc, and, or, like } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const postsRouter = Router();

postsRouter.get('/', async (req, res) => {
  try {
    const { status, search, category } = req.query;
    
    let query = db.select().from(posts);
    
    const allPosts = await query;
    
    const postsWithRelations = await Promise.all(
      allPosts.map(async (post) => {
        const postCats = await db
          .select({ category: categories })
          .from(postCategories)
          .leftJoin(categories, eq(postCategories.categoryId, categories.id))
          .where(eq(postCategories.postId, post.id));
        
        const postTagsList = await db
          .select({ tag: tags })
          .from(postTags)
          .leftJoin(tags, eq(postTags.tagId, tags.id))
          .where(eq(postTags.postId, post.id));
        
        return {
          ...post,
          categories: postCats.map(pc => pc.category).filter(Boolean),
          tags: postTagsList.map(pt => pt.tag).filter(Boolean),
        };
      })
    );
    
    res.json(postsWithRelations);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

postsRouter.get('/:id', async (req, res) => {
  try {
    const post = await db.select().from(posts).where(eq(posts.id, req.params.id)).limit(1);
    
    if (!post[0]) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    const postCats = await db
      .select({ category: categories })
      .from(postCategories)
      .leftJoin(categories, eq(postCategories.categoryId, categories.id))
      .where(eq(postCategories.postId, req.params.id));
    
    const postTagsList = await db
      .select({ tag: tags })
      .from(postTags)
      .leftJoin(tags, eq(postTags.tagId, tags.id))
      .where(eq(postTags.postId, req.params.id));
    
    res.json({
      ...post[0],
      categories: postCats.map(pc => pc.category).filter(Boolean),
      tags: postTagsList.map(pt => pt.tag).filter(Boolean),
    });
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
    
    const newPost = await db.insert(posts).values({
      title,
      slug,
      content,
      excerpt,
      featuredImage,
      status: status || 'draft',
      publishDate: publishDate ? new Date(publishDate) : null,
      seoTitle: seoTitle || title,
      metaDescription: metaDescription || excerpt,
      focusKeyword,
      authorId,
    }).returning();
    
    if (categoryIds && categoryIds.length > 0) {
      await Promise.all(
        categoryIds.map((catId: string) =>
          db.insert(postCategories).values({
            postId: newPost[0].id,
            categoryId: catId,
          })
        )
      );
    }
    
    if (tagIds && tagIds.length > 0) {
      await Promise.all(
        tagIds.map((tagId: string) =>
          db.insert(postTags).values({
            postId: newPost[0].id,
            tagId,
          })
        )
      );
    }
    
    res.status(201).json(newPost[0]);
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
    
    const updatedPost = await db.update(posts)
      .set({
        title,
        slug,
        content,
        excerpt,
        featuredImage,
        status,
        publishDate: publishDate ? new Date(publishDate) : null,
        seoTitle,
        metaDescription,
        focusKeyword,
        updatedAt: new Date(),
      })
      .where(eq(posts.id, req.params.id))
      .returning();
    
    await db.delete(postCategories).where(eq(postCategories.postId, req.params.id));
    
    if (categoryIds && categoryIds.length > 0) {
      await Promise.all(
        categoryIds.map((catId: string) =>
          db.insert(postCategories).values({
            postId: req.params.id,
            categoryId: catId,
          })
        )
      );
    }
    
    await db.delete(postTags).where(eq(postTags.postId, req.params.id));
    
    if (tagIds && tagIds.length > 0) {
      await Promise.all(
        tagIds.map((tagId: string) =>
          db.insert(postTags).values({
            postId: req.params.id,
            tagId,
          })
        )
      );
    }
    
    res.json(updatedPost[0]);
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ error: 'Failed to update post' });
  }
});

postsRouter.delete('/:id', async (req, res) => {
  try {
    await db.delete(posts).where(eq(posts.id, req.params.id));
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});
