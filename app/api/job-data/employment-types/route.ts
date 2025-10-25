import { NextRequest } from 'next/server'
import { sql } from '@/lib/database'
import { getUserIdFromClerk } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse, validationErrorResponse } from '@/lib/response'
import { z } from 'zod'

const employmentTypeSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(200)
})

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromClerk()
    if (!userId) {
      return unauthorizedResponse('You must be logged in')
    }

    const types = await sql`
      SELECT id, name, slug, created_at
      FROM job_employment_types
      ORDER BY name ASC
    `

    return successResponse(types || [], false)
  } catch (error) {
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
  } catch (error: any) {
    if (error?.code === '23505') {
      return validationErrorResponse('An employment type with this slug already exists')
    }
    return errorResponse('Failed to create employment type')
  }
}
