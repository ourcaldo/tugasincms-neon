import { sql } from '@/lib/database'
import { withApiTokenAuth, apiTokenOptions } from '@/lib/auth'
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  validationErrorResponse,
} from '@/lib/response'
import { setCorsHeaders } from '@/lib/cors'
import { updateUserEducationSchema } from '@/lib/validation'

export { apiTokenOptions as OPTIONS }

// GET /api/v1/users/[clerkId]/education/[educationId] — Get single education
export const GET = withApiTokenAuth(async (request, _token, origin) => {
  try {
    const url = new URL(request.url)
    const segments = url.pathname.split('/').filter(Boolean)
    const educationId = segments.at(-1)
    const clerkId = segments[segments.indexOf('users') + 1]

    if (!clerkId || !educationId) {
      return setCorsHeaders(errorResponse('User ID and Education ID are required', 400), origin)
    }

    const result = await sql`
      SELECT id, institution, degree, field_of_study,
             start_date, end_date, is_current, description, created_at, updated_at
      FROM user_education
      WHERE id = ${educationId} AND user_id = ${clerkId}
      LIMIT 1
    `

    if (result.length === 0) {
      return setCorsHeaders(notFoundResponse('Education not found'), origin)
    }

    return setCorsHeaders(successResponse(result[0]), origin)
  } catch (err) {
    console.error('Error fetching education:', err)
    return setCorsHeaders(errorResponse('Failed to fetch education'), origin)
  }
})

// PUT /api/v1/users/[clerkId]/education/[educationId] — Update education
export const PUT = withApiTokenAuth(async (request, _token, origin) => {
  try {
    const url = new URL(request.url)
    const segments = url.pathname.split('/').filter(Boolean)
    const educationId = segments.at(-1)
    const clerkId = segments[segments.indexOf('users') + 1]

    if (!clerkId || !educationId) {
      return setCorsHeaders(errorResponse('User ID and Education ID are required', 400), origin)
    }

    const body = await request.json()
    const validation = updateUserEducationSchema.safeParse(body)

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
      UPDATE user_education SET
        institution = COALESCE(${institution ?? null}, institution),
        degree = COALESCE(${degree ?? null}, degree),
        field_of_study = COALESCE(${field_of_study ?? null}, field_of_study),
        start_date = COALESCE(${start_date ?? null}, start_date),
        end_date = ${end_date !== undefined ? end_date : null},
        is_current = COALESCE(${is_current ?? null}, is_current),
        description = COALESCE(${description ?? null}, description)
      WHERE id = ${educationId} AND user_id = ${clerkId}
      RETURNING id, institution, degree, field_of_study, start_date, end_date, is_current, description, created_at, updated_at
    `

    if (result.length === 0) {
      return setCorsHeaders(notFoundResponse('Education not found'), origin)
    }

    return setCorsHeaders(successResponse(result[0]), origin)
  } catch (err) {
    console.error('Error updating education:', err)
    return setCorsHeaders(errorResponse('Failed to update education'), origin)
  }
})

// DELETE /api/v1/users/[clerkId]/education/[educationId] — Delete education
export const DELETE = withApiTokenAuth(async (request, _token, origin) => {
  try {
    const url = new URL(request.url)
    const segments = url.pathname.split('/').filter(Boolean)
    const educationId = segments.at(-1)
    const clerkId = segments[segments.indexOf('users') + 1]

    if (!clerkId || !educationId) {
      return setCorsHeaders(errorResponse('User ID and Education ID are required', 400), origin)
    }

    const result = await sql`
      DELETE FROM user_education WHERE id = ${educationId} AND user_id = ${clerkId}
      RETURNING id
    `

    if (result.length === 0) {
      return setCorsHeaders(notFoundResponse('Education not found'), origin)
    }

    return setCorsHeaders(successResponse({ message: 'Education deleted' }), origin)
  } catch (err) {
    console.error('Error deleting education:', err)
    return setCorsHeaders(errorResponse('Failed to delete education'), origin)
  }
})
