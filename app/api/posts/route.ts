import { NextRequest } from 'next/server'
import { sql } from '@/lib/database'
import { getUserIdFromClerk } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse, validationErrorResponse } from '@/lib/response'
import { mapPostsFromDB, mapPostFromDB } from '@/lib/post-mapper'
import { getCachedData, setCachedData, deleteCachedData } from '@/lib/cache'
import { INTERNAL_CACHE_TTL } from '@/lib/constants'
import { postSchema } from '@/lib/validation'
import { invalidateSitemaps } from '@/lib/sitemap'

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromClerk()
    if (!userId) {
      return unauthorizedResponse('You must be logged in')
    }
    
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '20')), 100)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const category = searchParams.get('category') || ''
    
    const offset = (page - 1) * limit
    
    const cacheKey = `api:posts:user:${userId}:page:${page}:limit:${limit}:search:${search}:status:${status}:category:${category}`
    
    const cachedData = await getCachedData(cacheKey)
    if (cachedData) {
      return successResponse(cachedData, true)
    }
    
    // Build WHERE conditions dynamically using NULL-parameter pattern
    const searchPattern = search ? `%${search}%` : null
    const statusFilter = status || null
    const categoryFilter = category || null

    const countResult = await sql`
      SELECT COUNT(DISTINCT p.id)::int as count
      FROM posts p
      WHERE p.author_id = ${userId}
        AND p.post_type = 'post'
        AND (${searchPattern}::text IS NULL OR p.title ILIKE ${searchPattern})
        AND (${statusFilter}::text IS NULL OR p.status = ${statusFilter})
        AND (${categoryFilter}::text IS NULL OR EXISTS (
          SELECT 1 FROM post_categories WHERE post_id = p.id AND category_id = ${categoryFilter}::uuid
        ))
    `

    const posts = await sql`
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
      WHERE p.author_id = ${userId}
        AND p.post_type = 'post'
        AND (${searchPattern}::text IS NULL OR p.title ILIKE ${searchPattern})
        AND (${statusFilter}::text IS NULL OR p.status = ${statusFilter})
        AND (${categoryFilter}::text IS NULL OR EXISTS (
          SELECT 1 FROM post_categories WHERE post_id = p.id AND category_id = ${categoryFilter}::uuid
        ))
      GROUP BY p.id
      ORDER BY p.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `
    
    const total = countResult[0].count
    
    const postsWithRelations = mapPostsFromDB((posts || []) as any)
    
    const responseData = {
      posts: postsWithRelations,
      total,
      page,
      limit
    }
    
    await setCachedData(cacheKey, responseData, INTERNAL_CACHE_TTL)
    
    return successResponse(responseData, false)
  } catch (error) {
    console.error('Error fetching posts:', error)
    return errorResponse('Failed to fetch posts')
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromClerk()
    if (!userId) {
      return unauthorizedResponse('You must be logged in')
    }
    
    const body = await request.json()
    
    const validation = postSchema.safeParse(body)
    if (!validation.success) {
      return validationErrorResponse(validation.error.issues[0].message)
    }
    
    const { title, content, excerpt, slug, featuredImage, publishDate, status, seo, categories, tags } = validation.data
    
    const postResult = await sql`
      INSERT INTO posts (
        title, content, excerpt, slug, featured_image, publish_date, status, author_id,
        seo_title, meta_description, focus_keyword
      )
      VALUES (
        ${title}, ${content}, ${excerpt || null}, ${slug}, ${featuredImage || null},
        ${publishDate || new Date().toISOString()}, ${status || 'draft'}, ${userId},
        ${seo?.title || null}, ${seo?.metaDescription || null}, ${seo?.focusKeyword || null}
      )
      RETURNING *
    `
    
    const newPost = postResult[0]
    
    if (categories && categories.length > 0) {
      for (const catId of categories) {
        await sql`INSERT INTO post_categories (post_id, category_id) VALUES (${newPost.id}, ${catId})`
      }
    }
    
    if (tags && tags.length > 0) {
      for (const tagId of tags) {
        await sql`INSERT INTO post_tags (post_id, tag_id) VALUES (${newPost.id}, ${tagId})`
      }
    }
    
    await deleteCachedData('api:public:posts:*')
    await deleteCachedData(`api:posts:user:${userId}`)
    await deleteCachedData('api:v1:posts:*')
    
    if (status === 'published') {
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
      WHERE p.id = ${newPost.id}
      GROUP BY p.id
    `
    
    return successResponse(mapPostFromDB(fullPost[0] as any), false, 201)
  } catch (error) {
    console.error('Error creating post:', error)
    return errorResponse('Failed to create post')
  }
}
