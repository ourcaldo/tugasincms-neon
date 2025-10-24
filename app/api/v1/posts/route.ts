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
    
    let whereConditions = [sql`p.status = ${status}`]
    
    if (search) {
      whereConditions.push(sql`(p.title ILIKE ${`%${search}%`} OR p.content ILIKE ${`%${search}%`} OR p.excerpt ILIKE ${`%${search}%`})`)
    }
    
    if (category) {
      const categoryData = await sql`
        SELECT id FROM categories WHERE id = ${category} OR slug = ${category}
      `
      
      if (categoryData.length > 0) {
        const categoryId = categoryData[0].id
        whereConditions.push(sql`EXISTS (SELECT 1 FROM post_categories WHERE post_id = p.id AND category_id = ${categoryId})`)
      } else {
        whereConditions.push(sql`FALSE`)
      }
    }
    
    if (tag) {
      const tagData = await sql`
        SELECT id FROM tags WHERE id = ${tag} OR slug = ${tag}
      `
      
      if (tagData.length > 0) {
        const tagId = tagData[0].id
        whereConditions.push(sql`EXISTS (SELECT 1 FROM post_tags WHERE post_id = p.id AND tag_id = ${tagId})`)
      } else {
        whereConditions.push(sql`FALSE`)
      }
    }
    
    const whereClause = whereConditions.reduce((acc, cond, idx) => 
      idx === 0 ? sql`WHERE ${cond}` : sql`${acc} AND ${cond}`
    )
    
    const countResult = await sql`
      SELECT COUNT(DISTINCT p.id)::int as count
      FROM posts p
      ${whereClause}
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
      ${whereClause}
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
