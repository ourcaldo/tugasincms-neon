import { withApiTokenAuth, apiTokenOptions } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/response'
import { setCorsHeaders } from '@/lib/cors'
import { sql } from '@/lib/database'

export { apiTokenOptions as OPTIONS }

/**
 * GET /api/v1/webhooks/logs
 *
 * Query params:
 *   page        – page number (default 1)
 *   limit       – items per page (default 50, max 200)
 *   event_type  – filter by event type  (e.g. user.created)
 *   status      – filter by status      (success | error)
 *   source      – filter by source      (default: all)
 *   clerk_user_id – filter by Clerk user ID
 *   from        – ISO date string, created_at >= from
 *   to          – ISO date string, created_at <= to
 */
export const GET = withApiTokenAuth(async (request, _token, origin) => {
  try {
    const url = new URL(request.url)

    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
    const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10)))
    const offset = (page - 1) * limit

    const eventType = url.searchParams.get('event_type') || null
    const status = url.searchParams.get('status') || null
    const source = url.searchParams.get('source') || null
    const clerkUserId = url.searchParams.get('clerk_user_id') || null
    const from = url.searchParams.get('from') || null
    const to = url.searchParams.get('to') || null

    // Count total matching rows (using coalesce-style optional filters)
    const countResult = await sql`
      SELECT COUNT(*)::int AS total
      FROM webhook_logs
      WHERE (${eventType}::text IS NULL OR event_type = ${eventType})
        AND (${status}::text IS NULL OR status = ${status})
        AND (${source}::text IS NULL OR source = ${source})
        AND (${clerkUserId}::text IS NULL OR clerk_user_id = ${clerkUserId})
        AND (${from}::timestamptz IS NULL OR created_at >= ${from}::timestamptz)
        AND (${to}::timestamptz IS NULL OR created_at <= ${to}::timestamptz)
    ` as Array<{ total: number }>
    const total = countResult[0]?.total ?? 0

    // Fetch paginated rows
    const logs = await sql`
      SELECT id, event_type, event_id, source, status, clerk_user_id,
             payload, error_message, ip_address, processing_ms, created_at
      FROM webhook_logs
      WHERE (${eventType}::text IS NULL OR event_type = ${eventType})
        AND (${status}::text IS NULL OR status = ${status})
        AND (${source}::text IS NULL OR source = ${source})
        AND (${clerkUserId}::text IS NULL OR clerk_user_id = ${clerkUserId})
        AND (${from}::timestamptz IS NULL OR created_at >= ${from}::timestamptz)
        AND (${to}::timestamptz IS NULL OR created_at <= ${to}::timestamptz)
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `

    return setCorsHeaders(
      successResponse({
        logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      }),
      origin,
    )
  } catch (error) {
    console.error('Error fetching webhook logs:', error)
    return setCorsHeaders(errorResponse('Failed to fetch webhook logs'), origin)
  }
})
