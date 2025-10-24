import { neon, neonConfig } from '@neondatabase/serverless'

neonConfig.fetchConnectionCache = true

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
