import { NextRequest } from 'next/server'
import { sql } from '@/lib/database'
import { getUserIdFromClerk } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse, notFoundResponse, validationErrorResponse } from '@/lib/response'
import { z } from 'zod'

const toggleCPTSchema = z.object({
  is_enabled: z.boolean()
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const userId = await getUserIdFromClerk()
    if (!userId) {
      return unauthorizedResponse('You must be logged in')
    }

    const { slug } = await params
    
    // Don't allow disabling the default 'post' type
    if (slug === 'post') {
      return validationErrorResponse('Cannot disable the default post type')
    }

    const body = await request.json()
    const validation = toggleCPTSchema.safeParse(body)
    
    if (!validation.success) {
      return validationErrorResponse(validation.error.issues[0].message)
    }

    const { is_enabled } = validation.data

    const result = await sql`
      UPDATE custom_post_types
      SET is_enabled = ${is_enabled}, updated_at = NOW()
      WHERE slug = ${slug}
      RETURNING *
    `

    if (!result || result.length === 0) {
      return notFoundResponse('Custom post type not found')
    }

    return successResponse(result[0], false)
  } catch (error) {
    return errorResponse('Failed to update custom post type')
  }
}
