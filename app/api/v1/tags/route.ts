import { NextRequest } from 'next/server'
import { sql } from '@/lib/database'
import { getCachedData, setCachedData } from '@/lib/cache'
import { API_CACHE_TTL } from '@/lib/constants'
import { withApiTokenAuth, apiTokenOptions, ApiToken } from '@/lib/auth'
import { successResponse } from '@/lib/response'
import { setCorsHeaders } from '@/lib/cors'

export { apiTokenOptions as OPTIONS }

export const GET = withApiTokenAuth(async (request: NextRequest, validToken: ApiToken, origin: string | null) => {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '50')), 100)
    const search = searchParams.get('search') || ''
    
    const offset = (page - 1) * limit
    
    const cacheKey = `api:v1:tags:${page}:${limit}:${search}`
    
    const cachedData = await getCachedData(cacheKey)
    if (cachedData) {
      return setCorsHeaders(successResponse(cachedData, true), origin)
    }
    
    let whereClause = sql`TRUE`
    if (search) {
      whereClause = sql`name ILIKE ${`%${search}%`}`
    }
    
    const countResult = await sql`
      SELECT COUNT(*)::int as count FROM tags WHERE ${whereClause}
    `
    const count = countResult[0].count
    
    const tags = await sql`
      SELECT t.*, COALESCE(pt_count.count, 0)::int as post_count
      FROM tags t
      LEFT JOIN (
        SELECT tag_id, COUNT(*) as count
        FROM post_tags
        GROUP BY tag_id
      ) pt_count ON t.id = pt_count.tag_id
      WHERE ${whereClause}
      ORDER BY t.name ASC
      LIMIT ${limit} OFFSET ${offset}
    `
    
    const tagsWithCounts = (tags || []).map((tag) => ({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      postCount: tag.post_count,
      createdAt: tag.created_at,
      updatedAt: tag.updated_at,
    }))
    
    const totalPages = Math.ceil(count / limit)
    
    const responseData = {
      tags: tagsWithCounts,
      pagination: {
        page,
        limit,
        total: count,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      }
    }
    
    await setCachedData(cacheKey, responseData, API_CACHE_TTL)
    
    return setCorsHeaders(successResponse(responseData, false), origin)
})
