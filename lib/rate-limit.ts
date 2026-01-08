import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'

// Rate limit configuration
const RATE_LIMIT_REQUESTS = 100  // requests per window
const RATE_LIMIT_WINDOW = '1 m'  // window duration

// Initialize rate limiter (singleton)
let ratelimit: Ratelimit | null = null

function getRateLimiter(): Ratelimit | null {
    if (ratelimit) return ratelimit

    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
        return null
    }

    const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })

    ratelimit = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(RATE_LIMIT_REQUESTS, RATE_LIMIT_WINDOW),
        analytics: true,
        prefix: 'nexjob-cms-api',
    })

    return ratelimit
}

/**
 * Get client IP from request headers
 */
export function getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')

    if (forwarded) return forwarded.split(',')[0].trim()
    if (realIp) return realIp

    return 'anonymous'
}

/**
 * Rate limit middleware - returns 429 response if rate limited, null otherwise
 */
export async function rateLimitMiddleware(request: NextRequest): Promise<NextResponse | null> {
    const limiter = getRateLimiter()

    if (!limiter) {
        // Rate limiting disabled - no Redis configured
        return null
    }

    const ip = getClientIP(request)
    const { success, limit, remaining, reset } = await limiter.limit(ip)

    if (!success) {
        const retryAfter = Math.ceil((reset - Date.now()) / 1000)

        return NextResponse.json(
            {
                success: false,
                error: 'Too many requests. Please try again later.',
                retryAfter,
            },
            {
                status: 429,
                headers: {
                    'X-RateLimit-Limit': limit.toString(),
                    'X-RateLimit-Remaining': remaining.toString(),
                    'X-RateLimit-Reset': reset.toString(),
                    'Retry-After': retryAfter.toString(),
                },
            }
        )
    }

    return null
}
