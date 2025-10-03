import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getUserIdFromClerk } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse, validationErrorResponse } from '@/lib/response'
import { getCachedData, setCachedData, deleteCachedData } from '@/lib/cache'
import { tagSchema } from '@/lib/validation'

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromClerk()
    if (!userId) {
      return unauthorizedResponse('You must be logged in')
    }
    
    const cacheKey = 'api:tags:all'
    
    const cachedTags = await getCachedData(cacheKey)
    if (cachedTags) {
      return successResponse(cachedTags, true)
    }
    
    const { data: tags, error } = await supabase
      .from('tags')
      .select('*')
      .order('name')
    
    if (error) throw error
    
    await setCachedData(cacheKey, tags || [], 600)
    
    return successResponse(tags || [], false)
  } catch (error) {
    console.error('Error fetching tags:', error)
    return errorResponse('Failed to fetch tags')
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromClerk()
    if (!userId) {
      return unauthorizedResponse('You must be logged in')
    }
    
    const body = await request.json()
    
    const validation = tagSchema.safeParse(body)
    if (!validation.success) {
      return validationErrorResponse(validation.error.issues[0].message)
    }
    
    const { name, slug } = validation.data
    
    const { data: newTag, error } = await supabase
      .from('tags')
      .insert({
        name,
        slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
      })
      .select()
      .single()
    
    if (error) throw error
    
    await deleteCachedData('api:tags:*')
    
    return successResponse(newTag, false, 201)
  } catch (error) {
    console.error('Error creating tag:', error)
    return errorResponse('Failed to create tag')
  }
}
