import { NextRequest } from 'next/server'
import { sql } from '@/lib/database'
import { getUserIdFromClerk } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/response'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ districtId: string }> }
) {
  try {
    const userId = await getUserIdFromClerk()
    if (!userId) {
      return unauthorizedResponse('You must be logged in')
    }

    const { districtId } = await params

    const villages = await sql`
      SELECT id, district_id, name
      FROM reg_villages
      WHERE district_id = ${districtId}
      ORDER BY name ASC
    `

    return successResponse(villages || [], false)
  } catch (error) {
    return errorResponse('Failed to fetch villages')
  }
}
