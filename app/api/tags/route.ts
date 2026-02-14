import { NextRequest } from 'next/server'
import { sql } from '@/lib/database'
import { withClerkAuth } from '@/lib/auth'
import { successResponse, errorResponse, validationErrorResponse } from '@/lib/response'
import { getCachedData, setCachedData, deleteCachedData } from '@/lib/cache'
import { tagSchema } from '@/lib/validation'

export const GET = withClerkAuth(async (request: NextRequest, userId: string) => {
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
})

export const POST = withClerkAuth(async (request: NextRequest, userId: string) => {
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
  await deleteCachedData('api:v1:tags:*')
  
  return successResponse(newTag, false, 201)
})
