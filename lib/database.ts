import { neon } from '@neondatabase/serverless'
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

export const sql = neon(connectionString)
