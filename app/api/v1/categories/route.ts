import { NextRequest } from 'next/server'
import { sql } from '@/lib/database'
import { getCachedData, setCachedData } from '@/lib/cache'
import { API_CACHE_TTL } from '@/lib/constants'
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
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '50')), 100)
    const search = searchParams.get('search') || ''
    
    const offset = (page - 1) * limit
    
    const cacheKey = `api:v1:categories:${page}:${limit}:${search}`
    
    const cachedData = await getCachedData(cacheKey)
    if (cachedData) {
      return setCorsHeaders(successResponse(cachedData, true), origin)
    }
    
    let whereClause = sql`TRUE`
    if (search) {
      whereClause = sql`(name ILIKE ${`%${search}%`} OR description ILIKE ${`%${search}%`})`
    }
    
    const countResult = await sql`
      SELECT COUNT(*)::int as count FROM categories WHERE ${whereClause}
    `
    const count = countResult[0].count
    
    const categories = await sql`
      SELECT c.*, COALESCE(pc_count.count, 0)::int as post_count
      FROM categories c
      LEFT JOIN (
        SELECT category_id, COUNT(*) as count
        FROM post_categories
        GROUP BY category_id
      ) pc_count ON c.id = pc_count.category_id
      WHERE ${whereClause}
      ORDER BY c.name ASC
      LIMIT ${limit} OFFSET ${offset}
    `
    
    const categoriesWithCounts = (categories || []).map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      postCount: category.post_count,
      createdAt: category.created_at,
      updatedAt: category.updated_at,
    }))
    
    const totalPages = Math.ceil(count / limit)
    
    const responseData = {
      categories: categoriesWithCounts,
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
  } catch (error) {
    console.error('Error fetching categories:', error)
    return setCorsHeaders(errorResponse('Failed to fetch categories'), origin)
  }
}
