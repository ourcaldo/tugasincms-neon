import { NextRequest } from 'next/server'
import { sql } from '@/lib/database'
import { getCachedData, setCachedData } from '@/lib/cache'
import { verifyApiToken, extractBearerToken } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/response'
import { mapPostsFromDB } from '@/lib/post-mapper'
import { checkRateLimit } from '@/lib/rate-limit'
import { setCorsHeaders, handleCorsPreflightRequest } from '@/lib/cors'

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin')
  return handleCorsPreflightRequest(origin)
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin')
  
  try {
    const token = extractBearerToken(request)
    
    const validToken = await verifyApiToken(token || '')
    
    if (!validToken) {
      return setCorsHeaders(unauthorizedResponse('Invalid or expired API token'), origin)
    }
    
    const rateLimitResult = await checkRateLimit(`api_token:${validToken.id}`)
    if (!rateLimitResult.success) {
      return setCorsHeaders(
        errorResponse('Rate limit exceeded. Please try again later.', 429),
        origin
      )
    }
    
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const category = searchParams.get('category') || ''
    const tag = searchParams.get('tag') || ''
    const status = searchParams.get('status') || 'published'
    
    const offset = (page - 1) * limit
    
    const cacheKey = `api:v1:posts:${page}:${limit}:${search}:${category}:${tag}:${status}`
    
    const cachedData = await getCachedData(cacheKey)
    if (cachedData) {
      return setCorsHeaders(successResponse(cachedData, true), origin)
    }
    
    let categoryId = null
    if (category) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(category)
      const categoryData = isUuid 
        ? await sql`SELECT id FROM categories WHERE id = ${category}`
        : await sql`SELECT id FROM categories WHERE slug = ${category}`
      categoryId = categoryData.length > 0 ? categoryData[0].id : 'none'
    }
    
    let tagId = null
    if (tag) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tag)
      const tagData = isUuid 
        ? await sql`SELECT id FROM tags WHERE id = ${tag}`
        : await sql`SELECT id FROM tags WHERE slug = ${tag}`
      tagId = tagData.length > 0 ? tagData[0].id : 'none'
    }
    
    const countResult = await sql`
      SELECT COUNT(DISTINCT p.id)::int as count
      FROM posts p
      ${categoryId ? sql`LEFT JOIN post_categories pc ON p.id = pc.post_id` : sql``}
      ${tagId ? sql`LEFT JOIN post_tags pt ON p.id = pt.post_id` : sql``}
      WHERE (p.post_type = 'post' OR p.post_type IS NULL)
        AND p.status = ${status}
        ${search ? sql`AND (p.title ILIKE ${`%${search}%`} OR p.content ILIKE ${`%${search}%`} OR p.excerpt ILIKE ${`%${search}%`})` : sql``}
        ${categoryId === 'none' ? sql`AND FALSE` : categoryId ? sql`AND pc.category_id = ${categoryId}` : sql``}
        ${tagId === 'none' ? sql`AND FALSE` : tagId ? sql`AND pt.tag_id = ${tagId}` : sql``}
    `
    const count = countResult[0].count
    
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
      WHERE (p.post_type = 'post' OR p.post_type IS NULL)
        AND p.status = ${status}
        ${search ? sql`AND (p.title ILIKE ${`%${search}%`} OR p.content ILIKE ${`%${search}%`} OR p.excerpt ILIKE ${`%${search}%`})` : sql``}
        ${categoryId === 'none' ? sql`AND FALSE` : categoryId ? sql`AND EXISTS (SELECT 1 FROM post_categories WHERE post_id = p.id AND category_id = ${categoryId})` : sql``}
        ${tagId === 'none' ? sql`AND FALSE` : tagId ? sql`AND EXISTS (SELECT 1 FROM post_tags WHERE post_id = p.id AND tag_id = ${tagId})` : sql``}
      GROUP BY p.id
      ORDER BY p.publish_date DESC
      LIMIT ${limit} OFFSET ${offset}
    `
    
    const postsWithRelations = mapPostsFromDB(posts as any || [])
    
    const totalPages = Math.ceil(count / limit)
    
    const responseData = {
      posts: postsWithRelations,
      pagination: {
        page,
        limit,
        total: count,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      filters: {
        search: search || null,
        category: category || null,
        tag: tag || null,
        status: status || null,
      }
    }
    
    await setCachedData(cacheKey, responseData, 3600)
    
    return setCorsHeaders(successResponse(responseData, false), origin)
  } catch (error) {
    console.error('Error fetching posts:', error)
    return setCorsHeaders(errorResponse('Failed to fetch posts'), origin)
  }
}
