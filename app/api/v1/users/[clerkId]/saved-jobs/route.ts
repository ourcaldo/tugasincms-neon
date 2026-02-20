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
import { savedJobSchema } from '@/lib/validation'

export { apiTokenOptions as OPTIONS }

// GET /api/v1/users/[clerkId]/saved-jobs — List saved jobs with job post details
export const GET = withApiTokenAuth(async (request, token, origin) => {
  try {
    const url = new URL(request.url)
    const segments = url.pathname.split('/').filter(Boolean)
    const clerkId = segments[segments.indexOf('users') + 1]

    if (!clerkId) {
      return setCorsHeaders(errorResponse('User ID is required', 400), origin)
    }

    // C-2: Verify token owner matches requested user
    if (token.user_id !== clerkId) {
      return setCorsHeaders(forbiddenResponse('Cannot access another user\'s data'), origin)
    }

    // Pagination
    const page = parseInt(url.searchParams.get('page') || '1', 10)
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 100)
    const offset = (page - 1) * limit

    // Get saved jobs with job post details
    const [savedJobs, countResult] = await Promise.all([
      sql`
        SELECT
          sj.id AS saved_id,
          sj.saved_at,
          jp.id,
          jp.title,
          jp.slug,
          jp.excerpt,
          jp.featured_image,
          jp.status,
          jp.publish_date,
          jp.job_company_name,
          jp.job_company_logo,
          jp.job_salary_min,
          jp.job_salary_max,
          jp.job_salary_currency,
          jp.job_salary_period,
          jp.job_is_remote,
          jp.job_is_hybrid,
          jp.job_deadline,
          jp.job_province_id,
          jp.job_regency_id,
          rp.name AS province_name,
          rr.name AS regency_name,
          et.name AS employment_type_name,
          el.name AS experience_level_name
        FROM user_saved_jobs sj
        JOIN job_posts jp ON sj.job_post_id = jp.id
        LEFT JOIN reg_provinces rp ON jp.job_province_id = rp.id
        LEFT JOIN reg_regencies rr ON jp.job_regency_id = rr.id
        LEFT JOIN job_employment_types et ON jp.job_employment_type_id = et.id
        LEFT JOIN job_experience_levels el ON jp.job_experience_level_id = el.id
        WHERE sj.user_id = ${clerkId}
        ORDER BY sj.saved_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `,
      sql`SELECT COUNT(*) AS total FROM user_saved_jobs WHERE user_id = ${clerkId}`,
    ])

    const total = parseInt(countResult[0]?.total || '0', 10)

    return setCorsHeaders(
      successResponse({
        items: savedJobs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      }),
      origin
    )
  } catch (err) {
    console.error('Error fetching saved jobs:', err)
    return setCorsHeaders(errorResponse('Failed to fetch saved jobs'), origin)
  }
})

// POST /api/v1/users/[clerkId]/saved-jobs — Save a job
export const POST = withApiTokenAuth(async (request, token, origin) => {
  try {
    const url = new URL(request.url)
    const segments = url.pathname.split('/').filter(Boolean)
    const clerkId = segments[segments.indexOf('users') + 1]

    if (!clerkId) {
      return setCorsHeaders(errorResponse('User ID is required', 400), origin)
    }

    // C-2: Verify token owner matches requested user
    if (token.user_id !== clerkId) {
      return setCorsHeaders(forbiddenResponse('Cannot access another user\'s data'), origin)
    }

    const body = await request.json()
    const validation = savedJobSchema.safeParse(body)

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

    const { job_post_id } = validation.data

    // Check user exists
    const userExists = await sql`SELECT id FROM users WHERE id = ${clerkId} LIMIT 1`
    if (userExists.length === 0) {
      return setCorsHeaders(notFoundResponse('User not found'), origin)
    }

    // Check job post exists
    const jobExists = await sql`SELECT id FROM job_posts WHERE id = ${job_post_id} LIMIT 1`
    if (jobExists.length === 0) {
      return setCorsHeaders(notFoundResponse('Job post not found'), origin)
    }

    const result = await sql`
      INSERT INTO user_saved_jobs (user_id, job_post_id)
      VALUES (${clerkId}, ${job_post_id})
      ON CONFLICT (user_id, job_post_id) DO NOTHING
      RETURNING id, job_post_id, saved_at
    `

    if (result.length === 0) {
      return setCorsHeaders(errorResponse('Job already saved', 409), origin)
    }

    return setCorsHeaders(successResponse(result[0], false, 201), origin)
  } catch (err) {
    console.error('Error saving job:', err)
    return setCorsHeaders(errorResponse('Failed to save job'), origin)
  }
})
