import { NextRequest } from 'next/server'
import { getUserIdFromClerk } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/response'
import { getSitemapInfo } from '@/lib/sitemap'

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromClerk()
    if (!userId) {
      return unauthorizedResponse('You must be logged in to access sitemaps')
    }
    
    const sitemaps = await getSitemapInfo()
    
    return successResponse({ sitemaps }, false)
  } catch (error) {
    console.error('Error fetching sitemap info:', error)
    return errorResponse('Failed to fetch sitemap information')
  }
}
