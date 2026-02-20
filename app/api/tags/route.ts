import { NextRequest } from 'next/server'
import { sql } from '@/lib/database'
import { getUserIdFromClerk, getUserRole } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse, validationErrorResponse } from '@/lib/response'
import { getCachedData, setCachedData, deleteCachedData } from '@/lib/cache'
import { TAXONOMY_CACHE_TTL } from '@/lib/constants'
import { tagSchema } from '@/lib/validation'

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

    const cacheKey = `api:tags:page:${page}:limit:${limit}`
    
    const cachedTags = await getCachedData(cacheKey)
    if (cachedTags) {
      return successResponse(cachedTags, true)
    }
    
    const tags = await sql`
      SELECT id, name, slug, created_at, updated_at FROM tags
      ORDER BY name
      LIMIT ${limit} OFFSET ${offset}
    `
    
    await setCachedData(cacheKey, tags || [], TAXONOMY_CACHE_TTL)
    
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

    // H-4: Enforce role — only admins and super_admins can create tags
    const role = await getUserRole(userId)
    if (!role || !['super_admin', 'admin'].includes(role)) {
      return forbiddenResponse('You do not have permission to create tags')
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
    await deleteCachedData('api:v1:tags:*')
    
    return successResponse(newTag, false, 201)
  } catch (error) {
    console.error('Error creating tag:', error)
    return errorResponse('Failed to create tag')
  }
}
