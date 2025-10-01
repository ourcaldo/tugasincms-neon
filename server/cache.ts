import Redis from 'ioredis';
import * as dotenv from 'dotenv';

dotenv.config();

let valkeyClient: Redis | null = null;

const CACHE_TTL = 300;

export function getValkeyClient(): Redis | null {
  if (!process.env.VALKEY_URL) {
    console.warn('Valkey URL not configured, caching disabled');
    return null;
  }

  if (!valkeyClient) {
    try {
      const useTLS = process.env.VALKEY_URL.startsWith('rediss://');
      
      valkeyClient = new Redis(process.env.VALKEY_URL, {
        connectTimeout: 10000,
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          if (times > 3) {
            console.error('Valkey connection failed after 3 retries');
            return null;
          }
          return Math.min(times * 100, 2000);
        },
        ...(useTLS && {
          tls: {
            rejectUnauthorized: false,
          },
        }),
        enableReadyCheck: false,
        lazyConnect: true,
      });

      valkeyClient.on('connect', () => {
        console.log('✅ Connected to Valkey cache');
      });

      valkeyClient.on('error', (error) => {
        console.error('Valkey connection error:', error.message);
      });

      valkeyClient.on('close', () => {
        console.log('Valkey connection closed');
      });
    } catch (error) {
      console.error('Failed to initialize Valkey client:', error);
      return null;
    }
  }

  return valkeyClient;
}

export async function getCachedData<T>(key: string): Promise<T | null> {
  const client = getValkeyClient();
  if (!client) return null;

  try {
    const cached = await client.get(key);
    if (cached) {
      console.log(`✅ Cache HIT: ${key}`);
      return JSON.parse(cached);
    }
    console.log(`❌ Cache MISS: ${key}`);
    return null;
  } catch (error) {
    console.error(`Cache read error for key ${key}:`, error);
    return null;
  }
}

export async function setCachedData(key: string, data: any, ttl: number = CACHE_TTL): Promise<boolean> {
  const client = getValkeyClient();
  if (!client) return false;

  try {
    await client.set(key, JSON.stringify(data), 'EX', ttl);
    console.log(`💾 Cached: ${key} (TTL: ${ttl}s)`);
    return true;
  } catch (error) {
    console.error(`Cache write error for key ${key}:`, error);
    return false;
  }
}

export async function deleteCachedData(pattern: string): Promise<boolean> {
  const client = getValkeyClient();
  if (!client) return false;

  try {
    if (pattern.includes('*')) {
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(...keys);
        console.log(`🗑️  Deleted ${keys.length} cache keys matching: ${pattern}`);
      }
    } else {
      await client.del(pattern);
      console.log(`🗑️  Deleted cache key: ${pattern}`);
    }
    return true;
  } catch (error) {
    console.error(`Cache delete error for pattern ${pattern}:`, error);
    return false;
  }
}

export function closeCacheConnection(): void {
  if (valkeyClient) {
    valkeyClient.disconnect();
    valkeyClient = null;
  }
}
