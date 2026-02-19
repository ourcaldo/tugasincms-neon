import Redis from 'ioredis'
import {
  API_CACHE_TTL,
  REDIS_CONNECT_TIMEOUT,
  REDIS_MAX_RETRIES,
  REDIS_RETRY_BASE_MS,
  REDIS_RETRY_MAX_MS,
} from './constants'

let redisClient: Redis | null = null
let redisAvailable = false

const CACHE_TTL = API_CACHE_TTL

export function getRedisClient(): Redis | null {
  if (!process.env.REDIS_URL) {
    return null
  }

  // If Redis was created but is not available (connection failed), treat as no-Redis
  if (redisClient && !redisAvailable) {
    return null
  }

  if (!redisClient) {
    try {
      const useTLS = process.env.REDIS_URL.startsWith('rediss://')
      
      redisClient = new Redis(process.env.REDIS_URL, {
        connectTimeout: REDIS_CONNECT_TIMEOUT,
        maxRetriesPerRequest: REDIS_MAX_RETRIES,
        retryStrategy: (times) => {
          if (times > REDIS_MAX_RETRIES) {
            console.error(`Redis connection failed after ${REDIS_MAX_RETRIES} retries`)
            redisAvailable = false
            return null
          }
          return Math.min(times * REDIS_RETRY_BASE_MS, REDIS_RETRY_MAX_MS)
        },
        ...(useTLS && {
          tls: {
            // C-7: Enable certificate verification for TLS connections
            rejectUnauthorized: true,
          },
        }),
        enableReadyCheck: false,
        lazyConnect: true,
      })

      redisClient.on('connect', () => {
        redisAvailable = true
        console.warn('Connected to Redis cache')
      })

      redisClient.on('ready', () => {
        redisAvailable = true
      })

      redisClient.on('error', (error) => {
        redisAvailable = false
        console.error('Redis connection error:', error.message)
      })

      redisClient.on('close', () => {
        redisAvailable = false
        console.warn('Redis connection closed')
      })

      redisClient.on('end', () => {
        redisAvailable = false
      })
    } catch (error) {
      console.error('Failed to initialize Redis client:', error)
      redisAvailable = false
      return null
    }
  }

  return redisAvailable ? redisClient : null
}

export async function getCachedData<T>(key: string): Promise<T | null> {
  const client = getRedisClient()
  if (!client) return null

  try {
    const cached = await client.get(key)
    if (cached) {
      return JSON.parse(cached)
    }
    return null
  } catch (error) {
    console.error(`Cache read error for key ${key}:`, error)
    return null
  }
}

export async function setCachedData(key: string, data: unknown, ttl: number = CACHE_TTL): Promise<boolean> {
  const client = getRedisClient()
  if (!client) return false

  try {
    if (ttl === 0) {
      await client.set(key, JSON.stringify(data))
    } else {
      await client.set(key, JSON.stringify(data), 'EX', ttl)
    }
    return true
  } catch (error) {
    console.error(`Cache write error for key ${key}:`, error)
    return false
  }
}

// H-3: Use SCAN instead of KEYS to avoid blocking Redis
// M-8: Batch DEL in chunks of 100 to avoid arg-list limits
export async function deleteCachedData(pattern: string): Promise<boolean> {
  const client = getRedisClient()
  if (!client) return false

  try {
    if (pattern.includes('*')) {
      let cursor = '0'
      do {
        const [nextCursor, keys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100)
        cursor = nextCursor
        if (keys.length > 0) {
          // Delete in batches of 100
          for (let i = 0; i < keys.length; i += 100) {
            const batch = keys.slice(i, i + 100)
            await client.del(...batch)
          }
        }
      } while (cursor !== '0')
    } else {
      await client.del(pattern)
    }
    return true
  } catch (error) {
    console.error(`Cache delete error for pattern ${pattern}:`, error)
    return false
  }
}

export function closeCacheConnection(): void {
  if (redisClient) {
    redisClient.disconnect()
    redisClient = null
  }
}

/**
 * Invalidate all job-related cache keys.
 * Call this after any job post, job tag, or job category mutation.
 */
export async function invalidateJobCaches(): Promise<void> {
  await deleteCachedData('api:v1:job-posts:*')
  await deleteCachedData('api:v1:job-posts:filters:*')
}
