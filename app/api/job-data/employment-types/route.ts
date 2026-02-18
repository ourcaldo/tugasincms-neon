import { NextRequest } from 'next/server'
import { sql } from '@/lib/database'
import { getCachedData, setCachedData } from '@/lib/cache'
import { getUserIdFromClerk } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse, validationErrorResponse } from '@/lib/response'
import { REFERENCE_DATA_CACHE_TTL } from '@/lib/constants'
import { z } from 'zod'

const employmentTypeSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(200)
})

export async function GET(_request: NextRequest) {
  try {
    const userId = await getUserIdFromClerk()
    if (!userId) {
      return unauthorizedResponse('You must be logged in')
    }

    const cacheKey = 'api:job-data:employment-types'
    const cached = await getCachedData(cacheKey)
    if (cached) return successResponse(cached, false)

    const types = await sql`
      SELECT id, name, slug, created_at
      FROM job_employment_types
      ORDER BY name ASC
    `

    const data = types || []
    await setCachedData(cacheKey, data, REFERENCE_DATA_CACHE_TTL)
    return successResponse(data, false)
  } catch (error) {
    console.error('Failed to fetch employment types:', error)
    return errorResponse('Failed to fetch employment types')
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromClerk()
    if (!userId) {
      return unauthorizedResponse('You must be logged in')
    }

    const body = await request.json()
    const validation = employmentTypeSchema.safeParse(body)
    
    if (!validation.success) {
      return validationErrorResponse(validation.error.issues[0].message)
    }

    const { name, slug } = validation.data

    const result = await sql`
      INSERT INTO job_employment_types (name, slug)
      VALUES (${name}, ${slug})
      RETURNING *
    `

    return successResponse(result[0], false, 201)
  } catch (error: unknown) {
    console.error('Failed to create employment type:', error)
    if (error instanceof Error && 'code' in error && (error as Record<string, unknown>).code === '23505') {
      return validationErrorResponse('An employment type with this slug already exists')
    }
    return errorResponse('Failed to create employment type')
  }
}
