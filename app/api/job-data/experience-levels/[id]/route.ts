import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/database'
import { getUserIdFromClerk } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse, notFoundResponse, validationErrorResponse } from '@/lib/response'
import { z } from 'zod'

const updateExperienceLevelSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(200).optional(),
  years_min: z.number().int().min(0).optional().nullable(),
  years_max: z.number().int().min(0).optional().nullable()
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromClerk()
    if (!userId) {
      return unauthorizedResponse('You must be logged in')
    }

    const { id } = await params
    const body = await request.json()
    const validation = updateExperienceLevelSchema.safeParse(body)
    
    if (!validation.success) {
      return validationErrorResponse(validation.error.issues[0].message)
    }

    const { name, slug, years_min, years_max } = validation.data

    const result = await sql`
      UPDATE job_experience_levels
      SET 
        name = COALESCE(${name || null}, name),
        slug = COALESCE(${slug || null}, slug),
        years_min = CASE WHEN ${years_min !== undefined} THEN ${years_min || null} ELSE years_min END,
        years_max = CASE WHEN ${years_max !== undefined} THEN ${years_max || null} ELSE years_max END
      WHERE id = ${id}
      RETURNING *
    `

    if (!result || result.length === 0) {
      return notFoundResponse('Experience level not found')
    }

    return successResponse(result[0], false)
  } catch (error: any) {
    if (error?.code === '23505') {
      return validationErrorResponse('An experience level with this slug already exists')
    }
    return errorResponse('Failed to update experience level')
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromClerk()
    if (!userId) {
      return unauthorizedResponse('You must be logged in')
    }

    const { id } = await params

    await sql`
      DELETE FROM job_experience_levels
      WHERE id = ${id}
    `

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return errorResponse('Failed to delete experience level')
  }
}
