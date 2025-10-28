import { NextRequest } from 'next/server'
import { verifyApiToken, extractBearerToken } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/response'
import { getSitemapInfo } from '@/lib/sitemap'
import { setCorsHeaders, handleCorsPreflightRequest } from '@/lib/cors'

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin')
  return handleCorsPreflightRequest(origin)
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin')
  
  try {
    const token = extractBearerToken(request)
    
    const validToken = await verifyApiToken(token || '')
    
    if (!validToken) {
      return setCorsHeaders(unauthorizedResponse('Invalid or expired API token'), origin)
    }
    
    const sitemaps = await getSitemapInfo()
    
    return setCorsHeaders(successResponse({ sitemaps }, false), origin)
  } catch (error) {
    console.error('Error fetching sitemap info:', error)
    return setCorsHeaders(errorResponse('Failed to fetch sitemap information'), origin)
  }
}
