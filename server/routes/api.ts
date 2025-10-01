import { Router } from 'express';
import { db } from '../db';
import { posts, postCategories, postTags, categories, tags, apiTokens } from '../../src/db/schema';
import { eq, and, gte } from 'drizzle-orm';

export const apiRouter = Router();

const verifyApiToken = async (token: string) => {
  if (!token) return null;
  
  try {
    const apiToken = await db.select().from(apiTokens).where(eq(apiTokens.token, token)).limit(1);
    
    if (!apiToken[0]) return null;
    
    if (apiToken[0].expiresAt && new Date(apiToken[0].expiresAt) < new Date()) {
      return null;
    }
    
    await db.update(apiTokens)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiTokens.id, apiToken[0].id));
    
    return apiToken[0];
  } catch (error) {
    console.error('Error verifying token:', error);
    return null;
  }
};

apiRouter.get('/posts', async (req, res) => {
  try {
    const publishedPosts = await db.select().from(posts)
      .where(
        and(
          eq(posts.status, 'published'),
          gte(posts.publishDate, new Date())
        )
      );
    
    const postsWithRelations = await Promise.all(
      publishedPosts.map(async (post) => {
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
      categoryIds,
      tagIds,
    } = req.body;
    
    const newPost = await db.insert(posts).values({
      title,
      slug,
      content,
      excerpt,
      featuredImage,
      status: 'published',
      publishDate: publishDate ? new Date(publishDate) : new Date(),
      seoTitle: seoTitle || title,
      metaDescription: metaDescription || excerpt,
      focusKeyword,
      authorId: validToken.userId,
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
    
    res.status(201).json({ success: true, data: newPost[0] });
  } catch (error) {
    console.error('Error creating post via API:', error);
    res.status(500).json({ success: false, error: 'Failed to create post' });
  }
});
