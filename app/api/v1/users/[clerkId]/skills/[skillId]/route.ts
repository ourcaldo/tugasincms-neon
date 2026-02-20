import { sql } from '@/lib/database'
import { withApiTokenAuth, apiTokenOptions } from '@/lib/auth'
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  forbiddenResponse,
} from '@/lib/response'
import { setCorsHeaders } from '@/lib/cors'

export { apiTokenOptions as OPTIONS }

// DELETE /api/v1/users/[clerkId]/skills/[skillId] — Delete a single skill
export const DELETE = withApiTokenAuth(async (request, token, origin) => {
  try {
    const url = new URL(request.url)
    const segments = url.pathname.split('/').filter(Boolean)
    const skillId = segments.at(-1)
    const clerkId = segments[segments.indexOf('users') + 1]

    if (!clerkId || !skillId) {
      return setCorsHeaders(errorResponse('User ID and Skill ID are required', 400), origin)
    }

    // C-2: Verify token owner matches requested user
    if (token.user_id !== clerkId) {
      return setCorsHeaders(forbiddenResponse('Cannot access another user\'s data'), origin)
    }

    const result = await sql`
      DELETE FROM user_skills WHERE id = ${skillId} AND user_id = ${clerkId}
      RETURNING id
    `

    if (result.length === 0) {
      return setCorsHeaders(notFoundResponse('Skill not found'), origin)
    }

    return setCorsHeaders(successResponse({ message: 'Skill deleted' }), origin)
  } catch (err) {
    console.error('Error deleting skill:', err)
    return setCorsHeaders(errorResponse('Failed to delete skill'), origin)
  }
})
