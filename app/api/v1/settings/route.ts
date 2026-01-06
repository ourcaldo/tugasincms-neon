import { NextRequest } from 'next/server'
import { verifyApiToken, extractBearerToken } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/response'
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
    
    const settingsInfo = {
      available_endpoints: [
        '/api/v1/settings/advertisements',
        '/api/v1/settings/sitemap'
      ],
      description: 'Settings management endpoints for TugasCMS'
    }
    
    return setCorsHeaders(successResponse(settingsInfo, false), origin)
  } catch (error) {
    console.error('Error fetching settings info:', error)
    return setCorsHeaders(errorResponse('Failed to fetch settings information'), origin)
  }
}