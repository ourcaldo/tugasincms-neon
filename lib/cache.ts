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
            rejectUnauthorized: false,
          },
        }),
        enableReadyCheck: false,
        lazyConnect: true,
      })

      redisClient.on('connect', () => {
        redisAvailable = true
        console.log('✅ Connected to Redis cache')
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
        console.log('Redis connection closed')
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
      console.log(`✅ Cache HIT: ${key}`)
      return JSON.parse(cached)
    }
    console.log(`❌ Cache MISS: ${key}`)
    return null
  } catch (error) {
    console.error(`Cache read error for key ${key}:`, error)
    return null
  }
}

export async function setCachedData(key: string, data: any, ttl: number = CACHE_TTL): Promise<boolean> {
  const client = getRedisClient()
  if (!client) return false

  try {
    if (ttl === 0) {
      await client.set(key, JSON.stringify(data))
      console.log(`💾 Cached: ${key} (No expiration)`)
    } else {
      await client.set(key, JSON.stringify(data), 'EX', ttl)
      console.log(`💾 Cached: ${key} (TTL: ${ttl}s)`)
    }
    return true
  } catch (error) {
    console.error(`Cache write error for key ${key}:`, error)
    return false
  }
}

export async function deleteCachedData(pattern: string): Promise<boolean> {
  const client = getRedisClient()
  if (!client) return false

  try {
    if (pattern.includes('*')) {
      const keys = await client.keys(pattern)
      if (keys.length > 0) {
        await client.del(...keys)
        console.log(`🗑️  Deleted ${keys.length} cache keys matching: ${pattern}`)
      }
    } else {
      await client.del(pattern)
      console.log(`🗑️  Deleted cache key: ${pattern}`)
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
