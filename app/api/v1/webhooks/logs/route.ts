import { withApiTokenAuth, apiTokenOptions } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/response'
import { setCorsHeaders } from '@/lib/cors'
import { rawQuery } from '@/lib/database'

export { apiTokenOptions as OPTIONS }

/**
 * GET /api/v1/webhooks/logs
 *
 * Query params:
 *   page          – page number (default 1)
 *   limit         – items per page (default 50, max 200)
 *   event_type    – filter by event type  (e.g. user.created)
 *   status        – filter by status      (success | error)
 *   source        – filter by source      (default: all)
 *   clerk_user_id – filter by Clerk user ID
 *   from          – ISO date string, created_at >= from
 *   to            – ISO date string, created_at <= to
 */
export const GET = withApiTokenAuth(async (request, _token, origin) => {
  try {
    const url = new URL(request.url)

    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
    const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10)))
    const offset = (page - 1) * limit

    const eventType = url.searchParams.get('event_type') || null
    const statusFilter = url.searchParams.get('status') || null
    const source = url.searchParams.get('source') || null
    const clerkUserId = url.searchParams.get('clerk_user_id') || null
    const fromDate = url.searchParams.get('from') || null
    const toDate = url.searchParams.get('to') || null

    // Build WHERE clause with numbered placeholders
    const conditions: string[] = []
    const values: (string | number)[] = []
    let idx = 0

    if (eventType) {
      conditions.push('event_type = $' + String(++idx))
      values.push(eventType)
    }
    if (statusFilter) {
      conditions.push('status = $' + String(++idx))
      values.push(statusFilter)
    }
    if (source) {
      conditions.push('source = $' + String(++idx))
      values.push(source)
    }
    if (clerkUserId) {
      conditions.push('clerk_user_id = $' + String(++idx))
      values.push(clerkUserId)
    }
    if (fromDate) {
      conditions.push('created_at >= $' + String(++idx) + '::timestamptz')
      values.push(fromDate)
    }
    if (toDate) {
      conditions.push('created_at <= $' + String(++idx) + '::timestamptz')
      values.push(toDate)
    }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''

    // Count total matching rows
    const countResult = await rawQuery<{ total: number }>(
      'SELECT COUNT(*)::int AS total FROM webhook_logs ' + where,
      values,
    )
    const total = countResult[0]?.total ?? 0

    // Fetch paginated rows
    const limitIdx = ++idx
    const offsetIdx = ++idx
    const logs = await rawQuery(
      'SELECT id, event_type, event_id, source, status, clerk_user_id, ' +
        'payload, error_message, ip_address, processing_ms, created_at ' +
        'FROM webhook_logs ' +
        where +
        ' ORDER BY created_at DESC' +
        ' LIMIT $' + String(limitIdx) + ' OFFSET $' + String(offsetIdx),
      [...values, limit, offset],
    )

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
