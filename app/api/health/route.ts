import { NextResponse } from 'next/server'
import { sql } from '@/lib/database'
import { getRedisClient } from '@/lib/cache'

export async function GET() {
  const start = Date.now()
  const checks: Record<string, { status: string; latency?: number }> = {}

  // Check PostgreSQL
  try {
    const dbStart = Date.now()
    await sql`SELECT 1`
    checks.database = { status: 'ok', latency: Date.now() - dbStart }
  } catch {
    checks.database = { status: 'error' }
  }

  // Check Redis
  try {
    const redis = getRedisClient()
    if (redis) {
      const redisStart = Date.now()
      await redis.ping()
      checks.redis = { status: 'ok', latency: Date.now() - redisStart }
    } else {
      checks.redis = { status: 'not_configured' }
    }
  } catch {
    checks.redis = { status: 'error' }
  }

  const allOk = Object.values(checks).every(c => c.status === 'ok' || c.status === 'not_configured')

  return NextResponse.json({
    status: allOk ? 'healthy' : 'degraded',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    latency: Date.now() - start,
    checks,
  }, { status: allOk ? 200 : 503 })
}
