import { NextRequest } from 'next/server'
import { sql } from '@/lib/database'
import { getCachedData, setCachedData } from '@/lib/cache'
import { getUserIdFromClerk } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/response'
import { LOCATION_CACHE_TTL } from '@/lib/constants'

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
    const cacheKey = `location:districts:${regencyId}`
    const cached = await getCachedData(cacheKey)
    if (cached) return successResponse(cached, true)

    const districts = await sql`
      SELECT id, regency_id, name
      FROM reg_districts
      WHERE regency_id = ${regencyId}
      ORDER BY name ASC
    `

    const data = districts || []
    await setCachedData(cacheKey, data, LOCATION_CACHE_TTL)
    return successResponse(data, false)
  } catch (error) {
    console.error('Failed to fetch districts:', error)
    return errorResponse('Failed to fetch districts')
  }
}
