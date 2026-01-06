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

export function validationErrorResponse(message: string = 'Validation error'): NextResponse<ApiResponse> {
  return errorResponse(message, 400)
}

/**
 * Creates a redirect response with proper trailing slash handling
 * @param url - The URL to redirect to
 * @param status - HTTP status code (301 for permanent, 302 for temporary)
 * @returns NextResponse redirect
 */
export function redirectResponse(url: string, status: number = 301): NextResponse {
  const normalizedUrl = ensureTrailingSlash(url)
  return NextResponse.redirect(normalizedUrl, status)
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
