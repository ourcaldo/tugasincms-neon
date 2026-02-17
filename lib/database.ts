import { neon, type NeonQueryFunction } from '@neondatabase/serverless'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

// Load .env file only in development (don't override system env vars in production)
if (process.env.NODE_ENV !== 'production') {
  const envPath = path.resolve(process.cwd(), '.env')
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath })
  }
}

function createSqlClient(): NeonQueryFunction<false, false> {
  const PGHOST = process.env.PGHOST
  const PGDATABASE = process.env.PGDATABASE  
  const PGUSER = process.env.PGUSER
  const PGPASSWORD = process.env.PGPASSWORD
  const PGSSLMODE = process.env.PGSSLMODE || 'require'

  if (!PGHOST || !PGDATABASE || !PGUSER || !PGPASSWORD) {
    throw new Error(
      'Missing database environment variables. Please set PGHOST, PGDATABASE, PGUSER, and PGPASSWORD in your .env file.'
    )
  }

  const connectionString = `postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}/${PGDATABASE}?sslmode=${PGSSLMODE}`
  return neon(connectionString)
}

let _sql: NeonQueryFunction<false, false> | null = null

function getSql(): NeonQueryFunction<false, false> {
  if (!_sql) _sql = createSqlClient()
  return _sql
}

// Proxy target must be a function for the `apply` trap to work (tagged template literals)
export const sql: NeonQueryFunction<false, false> = new Proxy(function () {} as unknown as NeonQueryFunction<false, false>, {
  apply(_target, thisArg, args) {
    return Reflect.apply(getSql(), thisArg, args)
  },
  get(_target, prop, receiver) {
    return Reflect.get(getSql(), prop, receiver)
  },
})
