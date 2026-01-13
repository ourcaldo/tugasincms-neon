import { NextRequest, NextResponse } from 'next/server'
import { getRedisClient } from './cache'

// Rate limit configuration from environment variables (with defaults)
const RATE_LIMIT_REQUESTS = parseInt(process.env.RATE_LIMIT_REQUESTS || '1000', 10)
const RATE_LIMIT_WINDOW_SECONDS = parseInt(process.env.RATE_LIMIT_WINDOW_SECONDS || '60', 10)

// In-memory fallback when Redis is not available
const inMemoryStore = new Map<string, { count: number; resetTime: number }>()

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
 * Check rate limit using Redis
 */
async function checkRateLimitRedis(ip: string): Promise<{ success: boolean; remaining: number; reset: number }> {
    const redis = getRedisClient()
    if (!redis) {
        return checkRateLimitMemory(ip)
    }

    const key = `ratelimit:${ip}`
    const now = Date.now()
    const windowStart = now - (RATE_LIMIT_WINDOW_SECONDS * 1000)

    try {
        // Use Redis sorted set for sliding window
        const pipeline = redis.pipeline()

        // Remove old entries outside the window
        pipeline.zremrangebyscore(key, 0, windowStart)

        // Count current requests in window
        pipeline.zcard(key)

        // Add current request
        pipeline.zadd(key, now, `${now}-${Math.random()}`)

        // Set expiry on the key
        pipeline.expire(key, RATE_LIMIT_WINDOW_SECONDS)

        const results = await pipeline.exec()

        // Get count from zcard result (index 1)
        const count = (results?.[1]?.[1] as number) || 0

        const remaining = Math.max(0, RATE_LIMIT_REQUESTS - count - 1)
        const reset = now + (RATE_LIMIT_WINDOW_SECONDS * 1000)

        return {
            success: count < RATE_LIMIT_REQUESTS,
            remaining,
            reset
        }
    } catch (error) {
        console.error('Rate limit Redis error:', error)
        // Fallback to in-memory on Redis error
        return checkRateLimitMemory(ip)
    }
}

/**
 * Check rate limit using in-memory store (fallback)
 */
function checkRateLimitMemory(ip: string): { success: boolean; remaining: number; reset: number } {
    const now = Date.now()
    const record = inMemoryStore.get(ip)

    // Clean up expired entries periodically
    if (Math.random() < 0.01) {
        for (const [key, value] of inMemoryStore.entries()) {
            if (value.resetTime < now) {
                inMemoryStore.delete(key)
            }
        }
    }

    if (!record || record.resetTime < now) {
        // New window
        const resetTime = now + (RATE_LIMIT_WINDOW_SECONDS * 1000)
        inMemoryStore.set(ip, { count: 1, resetTime })
        return {
            success: true,
            remaining: RATE_LIMIT_REQUESTS - 1,
            reset: resetTime
        }
    }

    // Existing window
    record.count++
    const remaining = Math.max(0, RATE_LIMIT_REQUESTS - record.count)

    return {
        success: record.count <= RATE_LIMIT_REQUESTS,
        remaining,
        reset: record.resetTime
    }
}

/**
 * Rate limit middleware - returns 429 response if rate limited, null otherwise
 */
export async function rateLimitMiddleware(request: NextRequest): Promise<NextResponse | null> {
    const ip = getClientIP(request)
    const { success, remaining, reset } = await checkRateLimitRedis(ip)

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
                    'X-RateLimit-Limit': RATE_LIMIT_REQUESTS.toString(),
                    'X-RateLimit-Remaining': remaining.toString(),
                    'X-RateLimit-Reset': reset.toString(),
                    'Retry-After': retryAfter.toString(),
                },
            }
        )
    }

    return null
}
