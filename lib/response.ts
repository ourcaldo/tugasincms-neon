import { NextResponse } from 'next/server'
import { ensureTrailingSlash } from './url-utils'

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  cached?: boolean
}

export function successResponse<T>(data: T, cached: boolean = false, status: number = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data, cached }, { status })
}

export function errorResponse(error: string, status: number = 500): NextResponse<ApiResponse> {
  return NextResponse.json({ success: false, error }, { status })
}

export function notFoundResponse(message: string = 'Resource not found'): NextResponse<ApiResponse> {
  return errorResponse(message, 404)
}

export function unauthorizedResponse(message: string = 'Unauthorized'): NextResponse<ApiResponse> {
  return errorResponse(message, 401)
}

export function forbiddenResponse(message: string = 'Forbidden'): NextResponse<ApiResponse> {
  return errorResponse(message, 403)
}

export function validationErrorResponse(message: string = 'Validation error', errors?: Array<{ field: string; message: string }>): NextResponse {
  const body: Record<string, unknown> = { success: false, error: message }
  if (errors && errors.length > 0) {
    body.errors = errors
  }
  return NextResponse.json(body, { status: 400 })
}

/**
 * Creates a redirect response with proper trailing slash handling
 * @param url - The URL to redirect to
 * @param status - HTTP status code (301 for permanent, 302 for temporary)
 * @returns NextResponse redirect
 */
export function redirectResponse(url: string, status: number = 301): NextResponse {
  // M-11: Ensure absolute URL for NextResponse.redirect
  let absoluteUrl: string
  try {
    absoluteUrl = new URL(ensureTrailingSlash(url)).toString()
  } catch {
    // Relative URL — prefix with base URL from env or fallback
    const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:5000'
    absoluteUrl = new URL(ensureTrailingSlash(url), base).toString()
  }
  return NextResponse.redirect(absoluteUrl, status)
}

/**
 * Creates a response with Location header for URL normalization
 * @param url - The canonical URL
 * @param response - The response to enhance
 * @returns Enhanced response with canonical URL header
 */
export function withCanonicalUrl<T>(url: string, response: NextResponse<T>): NextResponse<T> {
  const canonicalUrl = ensureTrailingSlash(url)
  response.headers.set('Link', `<${canonicalUrl}>; rel="canonical"`)
  return response
}
