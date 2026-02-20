import { sql } from '@/lib/database'
import { withApiTokenAuth, apiTokenOptions } from '@/lib/auth'
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  validationErrorResponse,
} from '@/lib/response'
import { setCorsHeaders } from '@/lib/cors'
import { userPreferencesSchema } from '@/lib/validation'

export { apiTokenOptions as OPTIONS }

// PUT /api/v1/users/[clerkId]/preferences — Update user notification preferences
export const PUT = withApiTokenAuth(async (request, _token, origin) => {
  try {
    const url = new URL(request.url)
    const segments = url.pathname.split('/').filter(Boolean)
    // URL: /api/v1/users/<clerkId>/preferences
    const clerkId = segments[segments.indexOf('users') + 1]

    if (!clerkId) {
      return setCorsHeaders(errorResponse('User ID is required', 400), origin)
    }

    const body = await request.json()
    const validation = userPreferencesSchema.safeParse(body)

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

    // Check user exists
    const existing = await sql`SELECT id, preferences FROM users WHERE id = ${clerkId} LIMIT 1`
    if (existing.length === 0) {
      return setCorsHeaders(notFoundResponse('User not found'), origin)
    }

    // Merge incoming preferences with existing ones
    const currentPrefs = existing[0].preferences || {}
    const mergedPrefs = { ...currentPrefs, ...validation.data }

    const result = await sql`
      UPDATE users SET preferences = ${JSON.stringify(mergedPrefs)}::jsonb
      WHERE id = ${clerkId}
      RETURNING id, preferences
    `

    return setCorsHeaders(successResponse(result[0]), origin)
  } catch (err) {
    console.error('Error updating user preferences:', err)
    return setCorsHeaders(errorResponse('Failed to update preferences'), origin)
  }
})
