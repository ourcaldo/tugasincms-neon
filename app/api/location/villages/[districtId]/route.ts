import { NextRequest } from 'next/server'
import { sql } from '@/lib/database'
import { getCachedData, setCachedData } from '@/lib/cache'
import { getUserIdFromClerk } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/response'
import { LOCATION_CACHE_TTL } from '@/lib/constants'

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
    const cacheKey = `location:villages:${districtId}`
    const cached = await getCachedData(cacheKey)
    if (cached) return successResponse(cached, true)

    const villages = await sql`
      SELECT id, district_id, name
      FROM reg_villages
      WHERE district_id = ${districtId}
      ORDER BY name ASC
    `

    const data = villages || []
    await setCachedData(cacheKey, data, LOCATION_CACHE_TTL)
    return successResponse(data, false)
  } catch (error) {
    console.error('Failed to fetch villages:', error)
    return errorResponse('Failed to fetch villages')
  }
}
