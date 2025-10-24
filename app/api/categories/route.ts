import { NextRequest } from 'next/server'
import { sql } from '@/lib/database'
import { getUserIdFromClerk } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse, validationErrorResponse } from '@/lib/response'
import { getCachedData, setCachedData, deleteCachedData } from '@/lib/cache'
import { categorySchema } from '@/lib/validation'

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromClerk()
    if (!userId) {
      return unauthorizedResponse('You must be logged in')
    }
    
    const cacheKey = 'api:categories:all'
    
    const cachedCategories = await getCachedData(cacheKey)
    if (cachedCategories) {
      return successResponse(cachedCategories, true)
    }
    
    const categories = await sql`
      SELECT * FROM categories
      ORDER BY name
    `
    
    await setCachedData(cacheKey, categories || [], 600)
    
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
    
    return successResponse(newCategory, false, 201)
  } catch (error) {
    console.error('Error creating category:', error)
    return errorResponse('Failed to create category')
  }
}
