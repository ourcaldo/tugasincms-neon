import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
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
    
    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .order('name')
    
    if (error) throw error
    
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
    
    const { data: newCategory, error } = await supabase
      .from('categories')
      .insert({
        name,
        slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
        description,
      })
      .select()
      .single()
    
    if (error) throw error
    
    await deleteCachedData('api:categories:*')
    
    return successResponse(newCategory, false, 201)
  } catch (error) {
    console.error('Error creating category:', error)
    return errorResponse('Failed to create category')
  }
}
