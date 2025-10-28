import { NextRequest } from 'next/server'
import { verifyApiToken, extractBearerToken } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/response'
import { generateAllSitemaps } from '@/lib/sitemap'
import { setCorsHeaders, handleCorsPreflightRequest } from '@/lib/cors'

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin')
  return handleCorsPreflightRequest(origin)
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin')
  
  try {
    const token = extractBearerToken(request)
    
    const validToken = await verifyApiToken(token || '')
    
    if (!validToken) {
      return setCorsHeaders(unauthorizedResponse('Invalid or expired API token'), origin)
    }
    
    await generateAllSitemaps()
    
    return setCorsHeaders(successResponse({ 
      message: 'Sitemaps generated successfully' 
    }, false), origin)
  } catch (error) {
    console.error('Error generating sitemaps:', error)
    return setCorsHeaders(errorResponse('Failed to generate sitemaps'), origin)
  }
}
