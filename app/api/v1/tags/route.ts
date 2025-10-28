import { NextRequest } from 'next/server'
import { sql } from '@/lib/database'
import { getCachedData, setCachedData } from '@/lib/cache'
import { verifyApiToken, extractBearerToken } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/response'
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
    
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
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
  } catch (error) {
    console.error('Error fetching tags:', error)
    return setCorsHeaders(errorResponse('Failed to fetch tags'), origin)
  }
}
