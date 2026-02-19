import { NextRequest } from 'next/server'
import { sql } from '@/lib/database'
import { withApiTokenAuth, apiTokenOptions } from '@/lib/auth'
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  validationErrorResponse,
} from '@/lib/response'
import { setCorsHeaders } from '@/lib/cors'
import { userSkillSchema, userSkillsBatchSchema } from '@/lib/validation'

export { apiTokenOptions as OPTIONS }

// GET /api/v1/users/[clerkId]/skills — List all skills for a user
export const GET = withApiTokenAuth(async (request, _token, origin) => {
  try {
    const url = new URL(request.url)
    const segments = url.pathname.split('/').filter(Boolean)
    const clerkId = segments[segments.indexOf('users') + 1]

    if (!clerkId) {
      return setCorsHeaders(errorResponse('User ID is required', 400), origin)
    }

    const result = await sql`
      SELECT id, name, created_at FROM user_skills
      WHERE user_id = ${clerkId} ORDER BY name ASC
    `

    return setCorsHeaders(successResponse(result), origin)
  } catch (err) {
    console.error('Error fetching user skills:', err)
    return setCorsHeaders(errorResponse('Failed to fetch skills'), origin)
  }
})

// POST /api/v1/users/[clerkId]/skills — Add skills (single or batch)
export const POST = withApiTokenAuth(async (request, _token, origin) => {
  try {
    const url = new URL(request.url)
    const segments = url.pathname.split('/').filter(Boolean)
    const clerkId = segments[segments.indexOf('users') + 1]

    if (!clerkId) {
      return setCorsHeaders(errorResponse('User ID is required', 400), origin)
    }

    // Check user exists
    const userExists = await sql`SELECT id FROM users WHERE id = ${clerkId} LIMIT 1`
    if (userExists.length === 0) {
      return setCorsHeaders(notFoundResponse('User not found'), origin)
    }

    const body = await request.json()

    // Support both single skill { name: "..." } and batch { skills: ["...", "..."] }
    if (body.skills && Array.isArray(body.skills)) {
      const validation = userSkillsBatchSchema.safeParse(body)
      if (!validation.success) {
        const errors = validation.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }))
        return setCorsHeaders(
          validationErrorResponse(`Validation failed: ${errors[0].field} - ${errors[0].message}`, errors),
          origin
        )
      }

      const skillNames = validation.data.skills
      // Insert all, skip duplicates
      const result = await sql`
        INSERT INTO user_skills (user_id, name)
        SELECT ${clerkId}, unnest(${skillNames}::text[])
        ON CONFLICT (user_id, name) DO NOTHING
        RETURNING id, name, created_at
      `

      return setCorsHeaders(successResponse(result, false, 201), origin)
    } else {
      const validation = userSkillSchema.safeParse(body)
      if (!validation.success) {
        const errors = validation.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }))
        return setCorsHeaders(
          validationErrorResponse(`Validation failed: ${errors[0].field} - ${errors[0].message}`, errors),
          origin
        )
      }

      const { name } = validation.data

      const result = await sql`
        INSERT INTO user_skills (user_id, name)
        VALUES (${clerkId}, ${name})
        ON CONFLICT (user_id, name) DO NOTHING
        RETURNING id, name, created_at
      `

      if (result.length === 0) {
        return setCorsHeaders(errorResponse('Skill already exists', 409), origin)
      }

      return setCorsHeaders(successResponse(result[0], false, 201), origin)
    }
  } catch (err) {
    console.error('Error adding user skills:', err)
    return setCorsHeaders(errorResponse('Failed to add skills'), origin)
  }
})

// DELETE /api/v1/users/[clerkId]/skills — Delete all skills for a user
export const DELETE = withApiTokenAuth(async (request, _token, origin) => {
  try {
    const url = new URL(request.url)
    const segments = url.pathname.split('/').filter(Boolean)
    const clerkId = segments[segments.indexOf('users') + 1]

    if (!clerkId) {
      return setCorsHeaders(errorResponse('User ID is required', 400), origin)
    }

    await sql`DELETE FROM user_skills WHERE user_id = ${clerkId}`

    return setCorsHeaders(successResponse({ message: 'All skills deleted' }), origin)
  } catch (err) {
    console.error('Error deleting user skills:', err)
    return setCorsHeaders(errorResponse('Failed to delete skills'), origin)
  }
})
