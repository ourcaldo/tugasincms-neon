import { sql } from '@/lib/database'
import { withApiTokenAuth, apiTokenOptions } from '@/lib/auth'
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  validationErrorResponse,
} from '@/lib/response'
import { setCorsHeaders } from '@/lib/cors'
import { userEducationSchema } from '@/lib/validation'

export { apiTokenOptions as OPTIONS }

// GET /api/v1/users/[clerkId]/education — List education history
export const GET = withApiTokenAuth(async (request, _token, origin) => {
  try {
    const url = new URL(request.url)
    const segments = url.pathname.split('/').filter(Boolean)
    const clerkId = segments[segments.indexOf('users') + 1]

    if (!clerkId) {
      return setCorsHeaders(errorResponse('User ID is required', 400), origin)
    }

    const result = await sql`
      SELECT id, institution, degree, field_of_study,
             start_date, end_date, is_current, description, created_at, updated_at
      FROM user_education
      WHERE user_id = ${clerkId}
      ORDER BY is_current DESC, start_date DESC
    `

    return setCorsHeaders(successResponse(result), origin)
  } catch (err) {
    console.error('Error fetching user education:', err)
    return setCorsHeaders(errorResponse('Failed to fetch education'), origin)
  }
})

// POST /api/v1/users/[clerkId]/education — Add education
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
    const validation = userEducationSchema.safeParse(body)

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

    const { institution, degree, field_of_study, start_date, end_date, is_current, description } = validation.data

    const result = await sql`
      INSERT INTO user_education (user_id, institution, degree, field_of_study, start_date, end_date, is_current, description)
      VALUES (${clerkId}, ${institution}, ${degree}, ${field_of_study || null},
              ${start_date}, ${end_date || null}, ${is_current || false}, ${description || null})
      RETURNING id, institution, degree, field_of_study, start_date, end_date, is_current, description, created_at, updated_at
    `

    return setCorsHeaders(successResponse(result[0], false, 201), origin)
  } catch (err) {
    console.error('Error adding user education:', err)
    return setCorsHeaders(errorResponse('Failed to add education'), origin)
  }
})
