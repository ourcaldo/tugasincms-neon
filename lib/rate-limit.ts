import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'

// Initialize Redis client for rate limiting
// Falls back to in-memory if UPSTASH_REDIS_REST_URL is not set
let ratelimit: Ratelimit | null = null

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })

    ratelimit = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 requests per minute
        analytics: true,
        prefix: 'nexjob-api',
    })
}

export interface RateLimitResult {
    success: boolean
    limit: number
    remaining: number
    reset: number
}

/**
 * Check rate limit for a request
 * @param identifier - Unique identifier (IP address or API key)
 * @returns Rate limit result or null if rate limiting is disabled
 */
export async function checkRateLimit(identifier: string): Promise<RateLimitResult | null> {
    if (!ratelimit) {
        // Rate limiting disabled - no Redis configured
        return null
    }

    try {
        const result = await ratelimit.limit(identifier)
        return {
            success: result.success,
            limit: result.limit,
            remaining: result.remaining,
            reset: result.reset,
        }
    } catch (error) {
        console.error('Rate limit check failed:', error)
        // Allow request if rate limiting fails
        return null
    }
}

/**
 * Get client identifier from request (IP address)
 */
export function getClientIdentifier(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')

    if (forwarded) {
        return forwarded.split(',')[0].trim()
    }

    if (realIp) {
        return realIp
    }

    return 'anonymous'
}

/**
 * Rate limit middleware for API routes
 * Returns NextResponse with 429 if rate limited, null otherwise
 */
export async function rateLimitMiddleware(request: NextRequest): Promise<NextResponse | null> {
    const identifier = getClientIdentifier(request)
    const result = await checkRateLimit(identifier)

    if (result && !result.success) {
        return NextResponse.json(
            {
                success: false,
                error: 'Too many requests. Please try again later.',
                retryAfter: Math.ceil((result.reset - Date.now()) / 1000)
            },
            {
                status: 429,
                headers: {
                    'X-RateLimit-Limit': result.limit.toString(),
                    'X-RateLimit-Remaining': result.remaining.toString(),
                    'X-RateLimit-Reset': result.reset.toString(),
                    'Retry-After': Math.ceil((result.reset - Date.now()) / 1000).toString(),
                }
            }
        )
    }

    return null
}

/**
 * Apply rate limit headers to a response
 */
export function applyRateLimitHeaders(
    response: NextResponse,
    result: RateLimitResult | null
): NextResponse {
    if (result) {
        response.headers.set('X-RateLimit-Limit', result.limit.toString())
        response.headers.set('X-RateLimit-Remaining', result.remaining.toString())
        response.headers.set('X-RateLimit-Reset', result.reset.toString())
    }
    return response
}
