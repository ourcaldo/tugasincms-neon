import { NextResponse } from 'next/server'

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
