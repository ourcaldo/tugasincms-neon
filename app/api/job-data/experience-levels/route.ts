import { NextRequest } from 'next/server'
import { sql } from '@/lib/database'
import { getUserIdFromClerk } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse, validationErrorResponse } from '@/lib/response'
import { z } from 'zod'

const experienceLevelSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(200),
  years_min: z.number().int().min(0).optional().nullable(),
  years_max: z.number().int().min(0).optional().nullable()
})

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromClerk()
    if (!userId) {
      return unauthorizedResponse('You must be logged in')
    }

    const levels = await sql`
      SELECT id, name, slug, years_min, years_max, created_at
      FROM job_experience_levels
      ORDER BY years_min ASC NULLS LAST, name ASC
    `

    return successResponse(levels || [], false)
  } catch (error) {
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
  } catch (error: any) {
    if (error?.code === '23505') {
      return validationErrorResponse('An experience level with this slug already exists')
    }
    return errorResponse('Failed to create experience level')
  }
}
