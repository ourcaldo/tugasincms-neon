import { getRedisClient } from './cache'

const RATE_LIMIT_WINDOW = 60
const MAX_REQUESTS = 1000

interface RateLimitResult {
  success: boolean
  remaining: number
  reset: number
}

export async function checkRateLimit(identifier: string): Promise<RateLimitResult> {
  const client = getRedisClient()
  
  if (!client) {
    return { success: true, remaining: MAX_REQUESTS, reset: Date.now() + RATE_LIMIT_WINDOW * 1000 }
  }

  try {
    const key = `rate_limit:${identifier}`
    const now = Date.now()
    const windowStart = now - RATE_LIMIT_WINDOW * 1000

    await client.zremrangebyscore(key, 0, windowStart)

    const requestCount = await client.zcard(key)

    if (requestCount >= MAX_REQUESTS) {
      const oldestRequest = await client.zrange(key, 0, 0, 'WITHSCORES')
      const resetTime = oldestRequest.length > 0 
        ? parseInt(oldestRequest[1]) + RATE_LIMIT_WINDOW * 1000 
        : now + RATE_LIMIT_WINDOW * 1000

      return {
        success: false,
        remaining: 0,
        reset: resetTime,
      }
    }

    await client.zadd(key, now, `${now}:${Math.random()}`)
    await client.expire(key, RATE_LIMIT_WINDOW * 2)

    return {
      success: true,
      remaining: MAX_REQUESTS - requestCount - 1,
      reset: now + RATE_LIMIT_WINDOW * 1000,
    }
  } catch (error) {
    console.error('Rate limit check error:', error)
    return { success: true, remaining: MAX_REQUESTS, reset: Date.now() + RATE_LIMIT_WINDOW * 1000 }
  }
}
