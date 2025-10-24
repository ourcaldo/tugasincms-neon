import { NextRequest } from 'next/server'
import { sql } from '@/lib/database'
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
    
    const tags = await sql`
      SELECT * FROM tags
      ORDER BY name
    `
    
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
    const finalSlug = slug || name.toLowerCase().replace(/\s+/g, '-')
    
    const result = await sql`
      INSERT INTO tags (name, slug)
      VALUES (${name}, ${finalSlug})
      RETURNING *
    `
    
    const newTag = result[0]
    
    await deleteCachedData('api:tags:*')
    
    return successResponse(newTag, false, 201)
  } catch (error) {
    console.error('Error creating tag:', error)
    return errorResponse('Failed to create tag')
  }
}
