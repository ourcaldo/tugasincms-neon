import { NextRequest } from 'next/server'
import { sql } from '@/lib/database'
import { getCachedData, setCachedData } from '@/lib/cache'
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
      SELECT * FROM tags
      WHERE ${whereClause}
      ORDER BY name ASC
      LIMIT ${limit} OFFSET ${offset}
    `
    
    const tagsWithCounts = await Promise.all(
      (tags || []).map(async (tag: any) => {
        const postCountResult = await sql`
          SELECT COUNT(*)::int as count FROM post_tags WHERE tag_id = ${tag.id}
        `
        
        return {
          id: tag.id,
          name: tag.name,
          slug: tag.slug,
          postCount: postCountResult[0].count,
          createdAt: tag.created_at,
          updatedAt: tag.updated_at,
        }
      })
    )
    
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
    
    await setCachedData(cacheKey, responseData, 3600)
    
    return setCorsHeaders(successResponse(responseData, false), origin)
})
