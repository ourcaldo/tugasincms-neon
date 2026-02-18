import { NextRequest } from 'next/server'
import { sql } from '@/lib/database'
import { getCachedData, setCachedData } from '@/lib/cache'
import { getUserIdFromClerk } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/response'
import { LOCATION_CACHE_TTL } from '@/lib/constants'

export async function GET(_request: NextRequest) {
  try {
    const userId = await getUserIdFromClerk()
    if (!userId) {
      return unauthorizedResponse('You must be logged in')
    }

    const cacheKey = 'api:location:provinces'
    const cached = await getCachedData(cacheKey)
    if (cached) return successResponse(cached, false)

    const provinces = await sql`
      SELECT id, name
      FROM reg_provinces
      ORDER BY name ASC
    `

    const data = provinces || []
    await setCachedData(cacheKey, data, LOCATION_CACHE_TTL)
    return successResponse(data, false)
  } catch (error) {
    console.error('Failed to fetch provinces:', error)
    return errorResponse('Failed to fetch provinces')
  }
}
