import { NextResponse } from 'next/server'
import { CORS_MAX_AGE } from './constants'

const isProduction = process.env.NODE_ENV === 'production'

function getAllowedOrigins(): string[] {
  const raw = process.env.ALLOWED_ORIGINS?.trim()

  if (!raw) {
    if (isProduction) {
      console.error(
        '[CORS] ALLOWED_ORIGINS env var is not set in production! ' +
        'All cross-origin requests will be rejected. ' +
        'Set ALLOWED_ORIGINS=https://nexjob.tech,https://www.nexjob.tech'
      )
      return []
    }
    // Allow all origins only in development
    return ['*']
  }

  const origins = raw.split(',').map(o => o.trim()).filter(Boolean)

  if (isProduction && origins.includes('*')) {
    console.error(
      '[CORS] Wildcard (*) origin is not allowed in production! ' +
      'Set specific origins in ALLOWED_ORIGINS env var.'
    )
    return origins.filter(o => o !== '*')
  }

  return origins
}

const ALLOWED_ORIGINS = getAllowedOrigins()

export function setCorsHeaders(response: NextResponse, origin?: string | null): NextResponse {
  if (ALLOWED_ORIGINS.includes('*')) {
    response.headers.set('Access-Control-Allow-Origin', '*')
  } else if (origin && ALLOWED_ORIGINS.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Vary', 'Origin')
  }
  // If origin doesn't match, no Access-Control-Allow-Origin header is set,
  // so the browser will block the cross-origin request.

  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.headers.set('Access-Control-Max-Age', String(CORS_MAX_AGE))

  return response
}

export function handleCorsPreflightRequest(origin?: string | null): NextResponse {
  const response = new NextResponse(null, { status: 204 })
  return setCorsHeaders(response, origin)
}
