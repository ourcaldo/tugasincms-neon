import { NextRequest } from 'next/server'
import { getUserIdFromClerk } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/response'
import { generateAllSitemaps } from '@/lib/sitemap'

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromClerk()
    if (!userId) {
      return unauthorizedResponse('You must be logged in to generate sitemaps')
    }
    
    await generateAllSitemaps()
    
    return successResponse({ 
      message: 'Sitemaps generated successfully' 
    }, false)
  } catch (error) {
    console.error('Error generating sitemaps:', error)
    return errorResponse('Failed to generate sitemaps')
  }
}
