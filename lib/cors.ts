import { NextResponse } from 'next/server'

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || ['*']

export function setCorsHeaders(response: NextResponse, origin?: string | null): NextResponse {
  if (ALLOWED_ORIGINS.includes('*')) {
    response.headers.set('Access-Control-Allow-Origin', '*')
  } else if (origin && ALLOWED_ORIGINS.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin)
  }

  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.headers.set('Access-Control-Max-Age', '86400')

  return response
}

export function handleCorsPreflightRequest(origin?: string | null): NextResponse {
  const response = new NextResponse(null, { status: 204 })
  return setCorsHeaders(response, origin)
}
