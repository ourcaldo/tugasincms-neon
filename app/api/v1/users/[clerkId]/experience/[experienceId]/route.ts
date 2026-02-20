import { sql } from '@/lib/database'
import { withApiTokenAuth, apiTokenOptions } from '@/lib/auth'
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  validationErrorResponse,
  forbiddenResponse,
} from '@/lib/response'
import { setCorsHeaders } from '@/lib/cors'
import { updateUserExperienceSchema } from '@/lib/validation'

export { apiTokenOptions as OPTIONS }

// GET /api/v1/users/[clerkId]/experience/[experienceId] — Get single experience
export const GET = withApiTokenAuth(async (request, token, origin) => {
  try {
    const url = new URL(request.url)
    const segments = url.pathname.split('/').filter(Boolean)
    const experienceId = segments.at(-1)
    const clerkId = segments[segments.indexOf('users') + 1]

    if (!clerkId || !experienceId) {
      return setCorsHeaders(errorResponse('User ID and Experience ID are required', 400), origin)
    }

    // C-2: Verify token owner matches requested user
    if (token.user_id !== clerkId) {
      return setCorsHeaders(forbiddenResponse('Cannot access another user\'s data'), origin)
    }

    const result = await sql`
      SELECT id, company_name, company_logo, job_title, location,
             start_date, end_date, is_current, description, created_at, updated_at
      FROM user_experience
      WHERE id = ${experienceId} AND user_id = ${clerkId}
      LIMIT 1
    `

    if (result.length === 0) {
      return setCorsHeaders(notFoundResponse('Experience not found'), origin)
    }

    return setCorsHeaders(successResponse(result[0]), origin)
  } catch (err) {
    console.error('Error fetching experience:', err)
    return setCorsHeaders(errorResponse('Failed to fetch experience'), origin)
  }
})

// PUT /api/v1/users/[clerkId]/experience/[experienceId] — Update experience
export const PUT = withApiTokenAuth(async (request, token, origin) => {
  try {
    const url = new URL(request.url)
    const segments = url.pathname.split('/').filter(Boolean)
    const experienceId = segments.at(-1)
    const clerkId = segments[segments.indexOf('users') + 1]

    if (!clerkId || !experienceId) {
      return setCorsHeaders(errorResponse('User ID and Experience ID are required', 400), origin)
    }

    // C-2: Verify token owner matches requested user
    if (token.user_id !== clerkId) {
      return setCorsHeaders(forbiddenResponse('Cannot access another user\'s data'), origin)
    }

    const body = await request.json()
    const validation = updateUserExperienceSchema.safeParse(body)

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
      UPDATE user_experience SET
        company_name = COALESCE(${company_name ?? null}, company_name),
        company_logo = COALESCE(${company_logo ?? null}, company_logo),
        job_title = COALESCE(${job_title ?? null}, job_title),
        location = COALESCE(${location ?? null}, location),
        start_date = COALESCE(${start_date ?? null}, start_date),
        end_date = ${end_date !== undefined ? end_date : null},
        is_current = COALESCE(${is_current ?? null}, is_current),
        description = COALESCE(${description ?? null}, description)
      WHERE id = ${experienceId} AND user_id = ${clerkId}
      RETURNING id, company_name, company_logo, job_title, location, start_date, end_date, is_current, description, created_at, updated_at
    `

    if (result.length === 0) {
      return setCorsHeaders(notFoundResponse('Experience not found'), origin)
    }

    return setCorsHeaders(successResponse(result[0]), origin)
  } catch (err) {
    console.error('Error updating experience:', err)
    return setCorsHeaders(errorResponse('Failed to update experience'), origin)
  }
})

// DELETE /api/v1/users/[clerkId]/experience/[experienceId] — Delete experience
export const DELETE = withApiTokenAuth(async (request, token, origin) => {
  try {
    const url = new URL(request.url)
    const segments = url.pathname.split('/').filter(Boolean)
    const experienceId = segments.at(-1)
    const clerkId = segments[segments.indexOf('users') + 1]

    if (!clerkId || !experienceId) {
      return setCorsHeaders(errorResponse('User ID and Experience ID are required', 400), origin)
    }

    // C-2: Verify token owner matches requested user
    if (token.user_id !== clerkId) {
      return setCorsHeaders(forbiddenResponse('Cannot access another user\'s data'), origin)
    }

    const result = await sql`
      DELETE FROM user_experience WHERE id = ${experienceId} AND user_id = ${clerkId}
      RETURNING id
    `

    if (result.length === 0) {
      return setCorsHeaders(notFoundResponse('Experience not found'), origin)
    }

    return setCorsHeaders(successResponse({ message: 'Experience deleted' }), origin)
  } catch (err) {
    console.error('Error deleting experience:', err)
    return setCorsHeaders(errorResponse('Failed to delete experience'), origin)
  }
})
