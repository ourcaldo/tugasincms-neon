import { NextRequest } from 'next/server'
import { sql } from '@/lib/database'
import { getUserIdFromClerk } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/response'

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromClerk()
    if (!userId) {
      return unauthorizedResponse('You must be logged in')
    }

    const levels = await sql`
      SELECT id, name, slug, years_min, years_max, created_at
      FROM job_experience_levels
      ORDER BY years_min ASC NULLS LAST, name ASC
    `

    return successResponse(levels || [], false)
  } catch (error) {
    return errorResponse('Failed to fetch experience levels')
  }
}
