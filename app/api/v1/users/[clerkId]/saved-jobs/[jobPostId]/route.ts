import { NextRequest } from 'next/server'
import { sql } from '@/lib/database'
import { withApiTokenAuth, apiTokenOptions } from '@/lib/auth'
import {
  successResponse,
  errorResponse,
  notFoundResponse,
} from '@/lib/response'
import { setCorsHeaders } from '@/lib/cors'

export { apiTokenOptions as OPTIONS }

// DELETE /api/v1/users/[clerkId]/saved-jobs/[jobPostId] — Unsave a job
export const DELETE = withApiTokenAuth(async (request, _token, origin) => {
  try {
    const url = new URL(request.url)
    const segments = url.pathname.split('/').filter(Boolean)
    const jobPostId = segments.at(-1)
    const clerkId = segments[segments.indexOf('users') + 1]

    if (!clerkId || !jobPostId) {
      return setCorsHeaders(errorResponse('User ID and Job Post ID are required', 400), origin)
    }

    const result = await sql`
      DELETE FROM user_saved_jobs WHERE job_post_id = ${jobPostId} AND user_id = ${clerkId}
      RETURNING id
    `

    if (result.length === 0) {
      return setCorsHeaders(notFoundResponse('Saved job not found'), origin)
    }

    return setCorsHeaders(successResponse({ message: 'Job unsaved' }), origin)
  } catch (err) {
    console.error('Error unsaving job:', err)
    return setCorsHeaders(errorResponse('Failed to unsave job'), origin)
  }
})

// GET /api/v1/users/[clerkId]/saved-jobs/[jobPostId] — Check if a job is saved
export const GET = withApiTokenAuth(async (request, _token, origin) => {
  try {
    const url = new URL(request.url)
    const segments = url.pathname.split('/').filter(Boolean)
    const jobPostId = segments.at(-1)
    const clerkId = segments[segments.indexOf('users') + 1]

    if (!clerkId || !jobPostId) {
      return setCorsHeaders(errorResponse('User ID and Job Post ID are required', 400), origin)
    }

    const result = await sql`
      SELECT id, saved_at FROM user_saved_jobs
      WHERE user_id = ${clerkId} AND job_post_id = ${jobPostId}
      LIMIT 1
    `

    return setCorsHeaders(
      successResponse({ saved: result.length > 0, data: result[0] || null }),
      origin
    )
  } catch (err) {
    console.error('Error checking saved job:', err)
    return setCorsHeaders(errorResponse('Failed to check saved job'), origin)
  }
})
