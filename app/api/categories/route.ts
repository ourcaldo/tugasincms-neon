import { NextRequest } from 'next/server'
import { sql } from '@/lib/database'
import { getUserIdFromClerk, getUserRole } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse, validationErrorResponse } from '@/lib/response'
import { getCachedData, setCachedData, deleteCachedData } from '@/lib/cache'
import { TAXONOMY_CACHE_TTL } from '@/lib/constants'
import { categorySchema } from '@/lib/validation'

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromClerk()
    if (!userId) {
      return unauthorizedResponse('You must be logged in')
    }
    
    // H-7: Support pagination
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '100')), 500)
    const offset = (page - 1) * limit
    
    const cacheKey = `api:categories:page:${page}:limit:${limit}`
    
    const cachedCategories = await getCachedData(cacheKey)
    if (cachedCategories) {
      return successResponse(cachedCategories, true)
    }
    
    const categories = await sql`
      SELECT id, name, slug, description, created_at, updated_at FROM categories
      ORDER BY name
      LIMIT ${limit} OFFSET ${offset}
    `
    
    await setCachedData(cacheKey, categories || [], TAXONOMY_CACHE_TTL)
    
    return successResponse(categories || [], false)
  } catch (error) {
    console.error('Error fetching categories:', error)
    return errorResponse('Failed to fetch categories')
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromClerk()
    if (!userId) {
      return unauthorizedResponse('You must be logged in')
    }
    
    // H-4: Enforce role — only admins and super_admins can create categories
    const role = await getUserRole(userId)
    if (!role || !['super_admin', 'admin'].includes(role)) {
      return forbiddenResponse('You do not have permission to create categories')
    }
    
    const body = await request.json()
    
    const validation = categorySchema.safeParse(body)
    if (!validation.success) {
      return validationErrorResponse(validation.error.issues[0].message)
    }
    
    const { name, slug, description } = validation.data
    const finalSlug = slug || name.toLowerCase().replace(/\s+/g, '-')
    
    const result = await sql`
      INSERT INTO categories (name, slug, description)
      VALUES (${name}, ${finalSlug}, ${description || null})
      RETURNING *
    `
    
    const newCategory = result[0]
    
    await deleteCachedData('api:categories:*')
    await deleteCachedData('api:v1:categories:*')
    
    return successResponse(newCategory, false, 201)
  } catch (error) {
    console.error('Error creating category:', error)
    return errorResponse('Failed to create category')
  }
}
