import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/database'
import { getUserIdFromClerk } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse, notFoundResponse, validationErrorResponse } from '@/lib/response'
import { z } from 'zod'

const updateJobCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(200).optional(),
  description: z.string().max(500).optional()
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
    const validation = updateJobCategorySchema.safeParse(body)
    
    if (!validation.success) {
      return validationErrorResponse(validation.error.issues[0].message)
    }

    const { name, slug, description } = validation.data

    const result = await sql`
      UPDATE job_categories
      SET 
        name = COALESCE(${name || null}, name),
        slug = COALESCE(${slug || null}, slug),
        description = COALESCE(${description || null}, description),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `

    if (!result || result.length === 0) {
      return notFoundResponse('Job category not found')
    }

    return successResponse(result[0], false)
  } catch (error: any) {
    if (error?.code === '23505') {
      return validationErrorResponse('A job category with this slug already exists')
    }
    return errorResponse('Failed to update job category')
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
      DELETE FROM job_categories
      WHERE id = ${id}
    `

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return errorResponse('Failed to delete job category')
  }
}
