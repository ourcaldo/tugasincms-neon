import { NextRequest } from 'next/server'
import { sql } from '@/lib/database'
import { getCachedData, setCachedData } from '@/lib/cache'
import { getUserIdFromClerk } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse, validationErrorResponse } from '@/lib/response'
import { REFERENCE_DATA_CACHE_TTL } from '@/lib/constants'
import { z } from 'zod'

const experienceLevelSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(200),
  years_min: z.number().int().min(0).optional().nullable(),
  years_max: z.number().int().min(0).optional().nullable()
})

export async function GET(_request: NextRequest) {
  try {
    const userId = await getUserIdFromClerk()
    if (!userId) {
      return unauthorizedResponse('You must be logged in')
    }

    const cacheKey = 'api:job-data:experience-levels'
    const cached = await getCachedData(cacheKey)
    if (cached) return successResponse(cached, false)

    const levels = await sql`
      SELECT id, name, slug, years_min, years_max, created_at
      FROM job_experience_levels
      ORDER BY years_min ASC NULLS LAST, name ASC
    `

    const data = levels || []
    await setCachedData(cacheKey, data, REFERENCE_DATA_CACHE_TTL)
    return successResponse(data, false)
  } catch (error) {
    console.error('Failed to fetch experience levels:', error)
    return errorResponse('Failed to fetch experience levels')
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromClerk()
    if (!userId) {
      return unauthorizedResponse('You must be logged in')
    }

    const body = await request.json()
    const validation = experienceLevelSchema.safeParse(body)
    
    if (!validation.success) {
      return validationErrorResponse(validation.error.issues[0].message)
    }

    const { name, slug, years_min, years_max } = validation.data

    const result = await sql`
      INSERT INTO job_experience_levels (name, slug, years_min, years_max)
      VALUES (${name}, ${slug}, ${years_min || null}, ${years_max || null})
      RETURNING *
    `

    return successResponse(result[0], false, 201)
  } catch (error: unknown) {
    console.error('Failed to create experience level:', error)
    if (error instanceof Error && 'code' in error && (error as Record<string, unknown>).code === '23505') {
      return validationErrorResponse('An experience level with this slug already exists')
    }
    return errorResponse('Failed to create experience level')
  }
}
