import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/database'
import { getUserIdFromClerk } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse, notFoundResponse, validationErrorResponse } from '@/lib/response'
import { mapPostFromDB } from '@/lib/post-mapper'
import { getCachedData, setCachedData, deleteCachedData } from '@/lib/cache'
import { updatePostSchema } from '@/lib/validation'
import { invalidateSitemaps } from '@/lib/sitemap'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromClerk()
    if (!userId) {
      return unauthorizedResponse('You must be logged in')
    }
    
    const { id } = await params
    
    const cacheKey = `api:posts:id:${id}`
    const cachedPost = await getCachedData(cacheKey)
    if (cachedPost) {
      return successResponse(cachedPost, true)
    }
    
    const post = await sql`
      SELECT 
        p.*,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('id', c.id, 'name', c.name, 'slug', c.slug, 'description', c.description))
          FILTER (WHERE c.id IS NOT NULL),
          '[]'::json
        ) as categories,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('id', t.id, 'name', t.name, 'slug', t.slug))
          FILTER (WHERE t.id IS NOT NULL),
          '[]'::json
        ) as tags
      FROM posts p
      LEFT JOIN post_categories pc ON p.id = pc.post_id
      LEFT JOIN categories c ON pc.category_id = c.id
      LEFT JOIN post_tags pt ON p.id = pt.post_id
      LEFT JOIN tags t ON pt.tag_id = t.id
      WHERE p.id = ${id} AND p.author_id = ${userId}
      GROUP BY p.id
    `
    
    if (!post || post.length === 0) {
      return notFoundResponse('Post not found')
    }
    
    const mappedPost = mapPostFromDB(post[0])
    
    await setCachedData(cacheKey, mappedPost, 300)
    
    return successResponse(mappedPost, false)
  } catch (error) {
    console.error('Error fetching post:', error)
    return errorResponse('Failed to fetch post')
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromClerk()
    if (!userId) {
      return unauthorizedResponse('You must be logged in')
    }
    
    const { id } = await params
    
    const existingPost = await sql`
      SELECT author_id, status FROM posts WHERE id = ${id}
    `
    
    if (!existingPost || existingPost.length === 0) {
      return notFoundResponse('Post not found')
    }
    
    if (existingPost[0].author_id !== userId) {
      return forbiddenResponse('You can only edit your own posts')
    }
    
    const body = await request.json()
    
    const validation = updatePostSchema.safeParse(body)
    if (!validation.success) {
      return validationErrorResponse(validation.error.issues[0].message)
    }
    
    const { title, content, excerpt, slug, featuredImage, publishDate, status, seo, categories, tags } = validation.data
    
    await sql`
      UPDATE posts
      SET 
        title = ${title || sql`title`},
        content = ${content || sql`content`},
        excerpt = ${excerpt !== undefined ? excerpt : sql`excerpt`},
        slug = ${slug || sql`slug`},
        featured_image = ${featuredImage !== undefined ? featuredImage : sql`featured_image`},
        publish_date = ${publishDate || sql`publish_date`},
        status = ${status || sql`status`},
        seo_title = ${seo?.title !== undefined ? seo?.title : sql`seo_title`},
        meta_description = ${seo?.metaDescription !== undefined ? seo?.metaDescription : sql`meta_description`},
        focus_keyword = ${seo?.focusKeyword !== undefined ? seo?.focusKeyword : sql`focus_keyword`},
        updated_at = NOW()
      WHERE id = ${id}
    `
    
    await sql`DELETE FROM post_categories WHERE post_id = ${id}`
    await sql`DELETE FROM post_tags WHERE post_id = ${id}`
    
    if (categories && categories.length > 0) {
      for (const catId of categories) {
        await sql`INSERT INTO post_categories (post_id, category_id) VALUES (${id}, ${catId})`
      }
    }
    
    if (tags && tags.length > 0) {
      for (const tagId of tags) {
        await sql`INSERT INTO post_tags (post_id, tag_id) VALUES (${id}, ${tagId})`
      }
    }
    
    await deleteCachedData('api:public:posts:*')
    await deleteCachedData(`api:posts:user:${userId}`)
    await deleteCachedData(`api:posts:id:${id}`)
    
    if (status === 'published' || existingPost[0].status === 'published') {
      await invalidateSitemaps()
    }
    
    const fullPost = await sql`
      SELECT 
        p.*,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('id', c.id, 'name', c.name, 'slug', c.slug))
          FILTER (WHERE c.id IS NOT NULL),
          '[]'::json
        ) as categories,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('id', t.id, 'name', t.name, 'slug', t.slug))
          FILTER (WHERE t.id IS NOT NULL),
          '[]'::json
        ) as tags
      FROM posts p
      LEFT JOIN post_categories pc ON p.id = pc.post_id
      LEFT JOIN categories c ON pc.category_id = c.id
      LEFT JOIN post_tags pt ON p.id = pt.post_id
      LEFT JOIN tags t ON pt.tag_id = t.id
      WHERE p.id = ${id}
      GROUP BY p.id
    `
    
    return successResponse(mapPostFromDB(fullPost[0]), false)
  } catch (error) {
    console.error('Error updating post:', error)
    return errorResponse('Failed to update post')
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromClerk()
    if (!userId) {
      return unauthorizedResponse('You must be logged in')
    }
    
    const { id } = await params
    
    const existingPost = await sql`
      SELECT author_id, status FROM posts WHERE id = ${id}
    `
    
    if (!existingPost || existingPost.length === 0) {
      return notFoundResponse('Post not found')
    }
    
    if (existingPost[0].author_id !== userId) {
      return forbiddenResponse('You can only delete your own posts')
    }
    
    await sql`DELETE FROM posts WHERE id = ${id}`
    
    await deleteCachedData('api:public:posts:*')
    await deleteCachedData(`api:posts:user:${userId}`)
    await deleteCachedData(`api:posts:id:${id}`)
    
    if (existingPost[0].status === 'published') {
      await invalidateSitemaps()
    }
    
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error deleting post:', error)
    return errorResponse('Failed to delete post')
  }
}
