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
import { userExperienceSchema } from '@/lib/validation'

export { apiTokenOptions as OPTIONS }

// GET /api/v1/users/[clerkId]/experience — List work experience
export const GET = withApiTokenAuth(async (request, _token, origin) => {
  try {
    const url = new URL(request.url)
    const segments = url.pathname.split('/').filter(Boolean)
    const clerkId = segments[segments.indexOf('users') + 1]

    if (!clerkId) {
      return setCorsHeaders(errorResponse('User ID is required', 400), origin)
    }

    const result = await sql`
      SELECT id, company_name, company_logo, job_title, location,
             start_date, end_date, is_current, description, created_at, updated_at
      FROM user_experience
      WHERE user_id = ${clerkId}
      ORDER BY is_current DESC, start_date DESC
    `

    return setCorsHeaders(successResponse(result), origin)
  } catch (err) {
    console.error('Error fetching user experience:', err)
    return setCorsHeaders(errorResponse('Failed to fetch experience'), origin)
  }
})

// POST /api/v1/users/[clerkId]/experience — Add work experience
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
    const validation = userExperienceSchema.safeParse(body)

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

    const { company_name, company_logo, job_title, location, start_date, end_date, is_current, description } = validation.data

    const result = await sql`
      INSERT INTO user_experience (user_id, company_name, company_logo, job_title, location, start_date, end_date, is_current, description)
      VALUES (${clerkId}, ${company_name}, ${company_logo || null}, ${job_title}, ${location || null},
              ${start_date}, ${end_date || null}, ${is_current || false}, ${description || null})
      RETURNING id, company_name, company_logo, job_title, location, start_date, end_date, is_current, description, created_at, updated_at
    `

    return setCorsHeaders(successResponse(result[0], false, 201), origin)
  } catch (err) {
    console.error('Error adding user experience:', err)
    return setCorsHeaders(errorResponse('Failed to add experience'), origin)
  }
})
