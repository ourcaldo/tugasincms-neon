import { NextRequest } from 'next/server'
import { sql } from '@/lib/database'
import { getUserIdFromClerk } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse, validationErrorResponse } from '@/lib/response'
import { mapPostsFromDB, mapPostFromDB } from '@/lib/post-mapper'
import { getCachedData, setCachedData, deleteCachedData } from '@/lib/cache'
import { postSchema } from '@/lib/validation'
import { invalidateSitemaps } from '@/lib/sitemap'

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromClerk()
    if (!userId) {
      return unauthorizedResponse('You must be logged in')
    }
    
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const category = searchParams.get('category') || ''
    
    const offset = (page - 1) * limit
    
    const cacheKey = `api:posts:user:${userId}:page:${page}:limit:${limit}:search:${search}:status:${status}:category:${category}`
    
    const cachedData = await getCachedData(cacheKey)
    if (cachedData) {
      return successResponse(cachedData, true)
    }
    
    let whereConditions = [sql`p.author_id = ${userId}`]
    if (search) {
      whereConditions.push(sql`p.title ILIKE ${`%${search}%`}`)
    }
    if (status) {
      whereConditions.push(sql`p.status = ${status}`)
    }
    if (category) {
      whereConditions.push(sql`EXISTS (SELECT 1 FROM post_categories WHERE post_id = p.id AND category_id = ${category})`)
    }
    
    const whereClause = whereConditions.reduce((acc, cond, idx) => 
      idx === 0 ? sql`WHERE ${cond}` : sql`${acc} AND ${cond}`
    )
    
    const countResult = await sql`
      SELECT COUNT(DISTINCT p.id)::int as count
      FROM posts p
      ${whereClause}
    `
    const total = countResult[0].count
    
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
      ${whereClause}
      GROUP BY p.id
      ORDER BY p.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `
    
    const postsWithRelations = mapPostsFromDB(posts || [])
    
    const responseData = {
      posts: postsWithRelations,
      total,
      page,
      limit
    }
    
    await setCachedData(cacheKey, responseData, 300)
    
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
    
    return successResponse(mapPostFromDB(fullPost[0]), false, 201)
  } catch (error) {
    console.error('Error creating post:', error)
    return errorResponse('Failed to create post')
  }
}
