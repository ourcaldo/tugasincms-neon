import { NextRequest } from 'next/server'
import { sql } from '@/lib/database'
import { getUserIdFromClerk } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/response'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ regencyId: string }> }
) {
  try {
    const userId = await getUserIdFromClerk()
    if (!userId) {
      return unauthorizedResponse('You must be logged in')
    }

    const { regencyId } = await params

    const districts = await sql`
      SELECT id, regency_id, name
      FROM reg_districts
      WHERE regency_id = ${regencyId}
      ORDER BY name ASC
    `

    return successResponse(districts || [], false)
  } catch (error) {
    return errorResponse('Failed to fetch districts')
  }
}
