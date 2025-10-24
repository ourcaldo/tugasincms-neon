import { NextRequest } from 'next/server'
import { sql } from '@/lib/database'
import { getUserIdFromClerk } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/response'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provinceId: string }> }
) {
  try {
    const userId = await getUserIdFromClerk()
    if (!userId) {
      return unauthorizedResponse('You must be logged in')
    }

    const { provinceId } = await params

    const regencies = await sql`
      SELECT id, province_id, name
      FROM reg_regencies
      WHERE province_id = ${provinceId}
      ORDER BY name ASC
    `

    return successResponse(regencies || [], false)
  } catch (error) {
    return errorResponse('Failed to fetch regencies')
  }
}
