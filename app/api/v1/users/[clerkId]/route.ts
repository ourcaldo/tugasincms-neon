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
import { updateUserProfileSchema } from '@/lib/validation'

export { apiTokenOptions as OPTIONS }

// GET /api/v1/users/[clerkId] — Get full user profile (user + skills + experience + education)
export const GET = withApiTokenAuth(async (request, token, origin) => {
  try {
    const url = new URL(request.url)
    const clerkId = url.pathname.split('/').filter(Boolean).at(-1)

    if (!clerkId) {
      return setCorsHeaders(errorResponse('User ID is required', 400), origin)
    }

    // C-2: Verify token owner matches requested user
    if (token.user_id !== clerkId) {
      return setCorsHeaders(forbiddenResponse('Cannot access another user\'s data'), origin)
    }

    // Fetch user, skills, experience, education in parallel
    const [userResult, skillsResult, experienceResult, educationResult] = await Promise.all([
      sql`SELECT id, email, name, bio, avatar, phone, preferences, role, created_at, updated_at
          FROM users WHERE id = ${clerkId} LIMIT 1`,
      sql`SELECT id, name, created_at FROM user_skills
          WHERE user_id = ${clerkId} ORDER BY name ASC`,
      sql`SELECT id, company_name, company_logo, job_title, location, start_date, end_date, is_current, description, created_at, updated_at
          FROM user_experience WHERE user_id = ${clerkId} ORDER BY start_date DESC`,
      sql`SELECT id, institution, degree, field_of_study, start_date, end_date, is_current, description, created_at, updated_at
          FROM user_education WHERE user_id = ${clerkId} ORDER BY start_date DESC`,
    ])

    if (userResult.length === 0) {
      return setCorsHeaders(notFoundResponse('User not found'), origin)
    }

    const user = userResult[0]

    return setCorsHeaders(
      successResponse({
        ...user,
        skills: skillsResult,
        experience: experienceResult,
        education: educationResult,
      }),
      origin
    )
  } catch (err) {
    console.error('Error fetching user profile:', err)
    return setCorsHeaders(errorResponse('Failed to fetch user profile'), origin)
  }
})

// PUT /api/v1/users/[clerkId] — Update basic profile fields
export const PUT = withApiTokenAuth(async (request, token, origin) => {
  try {
    const url = new URL(request.url)
    const clerkId = url.pathname.split('/').filter(Boolean).at(-1)

    if (!clerkId) {
      return setCorsHeaders(errorResponse('User ID is required', 400), origin)
    }

    // C-2: Verify token owner matches requested user
    if (token.user_id !== clerkId) {
      return setCorsHeaders(forbiddenResponse('Cannot access another user\'s data'), origin)
    }

    const body = await request.json()
    const validation = updateUserProfileSchema.safeParse(body)

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

    const { name, bio, avatar, phone } = validation.data

    // Check user exists
    const existing = await sql`SELECT id FROM users WHERE id = ${clerkId} LIMIT 1`
    if (existing.length === 0) {
      return setCorsHeaders(notFoundResponse('User not found'), origin)
    }

    const result = await sql`
      UPDATE users SET
        name = COALESCE(${name ?? null}, name),
        bio = COALESCE(${bio ?? null}, bio),
        avatar = COALESCE(${avatar ?? null}, avatar),
        phone = COALESCE(${phone ?? null}, phone)
      WHERE id = ${clerkId}
      RETURNING id, email, name, bio, avatar, phone, preferences, role, created_at, updated_at
    `

    return setCorsHeaders(successResponse(result[0]), origin)
  } catch (err) {
    console.error('Error updating user profile:', err)
    return setCorsHeaders(errorResponse('Failed to update user profile'), origin)
  }
})
