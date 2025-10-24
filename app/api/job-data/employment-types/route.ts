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

    const types = await sql`
      SELECT id, name, slug, created_at
      FROM job_employment_types
      ORDER BY name ASC
    `

    return successResponse(types || [], false)
  } catch (error) {
    return errorResponse('Failed to fetch employment types')
  }
}
