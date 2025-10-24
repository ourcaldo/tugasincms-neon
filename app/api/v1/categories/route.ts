import { NextRequest } from 'next/server'
import { sql } from '@/lib/database'
import { getCachedData, setCachedData } from '@/lib/cache'
import { verifyApiToken, extractBearerToken } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/response'
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
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search') || ''
    
    const offset = (page - 1) * limit
    
    const cacheKey = `api:v1:categories:${page}:${limit}:${search}`
    
    const cachedData = await getCachedData(cacheKey)
    if (cachedData) {
      return setCorsHeaders(successResponse(cachedData, true), origin)
    }
    
    let query = supabase
      .from('categories')
      .select('*', { count: 'exact' })
    
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }
    
    const { data: categories, error, count } = await query
      .order('name', { ascending: true })
      .range(offset, offset + limit - 1)
    
    if (error) throw error
    
    const categoriesWithCounts = await Promise.all(
      (categories || []).map(async (category) => {
        const { count: postCount } = await supabase
          .from('post_categories')
          .select('*', { count: 'exact', head: true })
          .eq('category_id', category.id)
        
        return {
          id: category.id,
          name: category.name,
          slug: category.slug,
          description: category.description,
          postCount: postCount || 0,
          createdAt: category.created_at,
          updatedAt: category.updated_at,
        }
      })
    )
    
    const totalPages = Math.ceil((count || 0) / limit)
    
    const responseData = {
      categories: categoriesWithCounts,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      }
    }
    
    await setCachedData(cacheKey, responseData, 3600)
    
    return setCorsHeaders(successResponse(responseData, false), origin)
  } catch (error) {
    console.error('Error fetching categories:', error)
    return setCorsHeaders(errorResponse('Failed to fetch categories'), origin)
  }
}
