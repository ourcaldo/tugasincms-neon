import { NextRequest } from 'next/server'
import { sql } from '@/lib/database'
import { getCachedData, setCachedData } from '@/lib/cache'
import { getUserIdFromClerk } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/response'
import { LOCATION_CACHE_TTL } from '@/lib/constants'

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
    const cacheKey = `location:regencies:${provinceId}`
    const cached = await getCachedData(cacheKey)
    if (cached) return successResponse(cached, true)

    const regencies = await sql`
      SELECT id, province_id, name
      FROM reg_regencies
      WHERE province_id = ${provinceId}
      ORDER BY name ASC
    `

    const data = regencies || []
    await setCachedData(cacheKey, data, LOCATION_CACHE_TTL)
    return successResponse(data, false)
  } catch (error) {
    console.error('Failed to fetch regencies:', error)
    return errorResponse('Failed to fetch regencies')
  }
}
