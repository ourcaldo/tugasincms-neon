import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/database'
import { getUserIdFromClerk } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse, notFoundResponse, validationErrorResponse } from '@/lib/response'
import { z } from 'zod'

const updateEmploymentTypeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(200).optional()
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
    const validation = updateEmploymentTypeSchema.safeParse(body)
    
    if (!validation.success) {
      return validationErrorResponse(validation.error.issues[0].message)
    }

    const { name, slug } = validation.data

    const result = await sql`
      UPDATE job_employment_types
      SET 
        name = COALESCE(${name || null}, name),
        slug = COALESCE(${slug || null}, slug)
      WHERE id = ${id}
      RETURNING *
    `

    if (!result || result.length === 0) {
      return notFoundResponse('Employment type not found')
    }

    return successResponse(result[0], false)
  } catch (error: any) {
    if (error?.code === '23505') {
      return validationErrorResponse('An employment type with this slug already exists')
    }
    return errorResponse('Failed to update employment type')
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
      DELETE FROM job_employment_types
      WHERE id = ${id}
    `

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return errorResponse('Failed to delete employment type')
  }
}
