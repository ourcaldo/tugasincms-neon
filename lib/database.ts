import { neon } from '@neondatabase/serverless'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

// Force load .env file to override system environment variables
const envPath = path.resolve(process.cwd(), '.env')
if (fs.existsSync(envPath)) {
  const envConfig = dotenv.parse(fs.readFileSync(envPath))
  
  // Override system env vars with .env file values
  if (envConfig.PGHOST) process.env.PGHOST = envConfig.PGHOST
  if (envConfig.PGDATABASE) process.env.PGDATABASE = envConfig.PGDATABASE
  if (envConfig.PGUSER) process.env.PGUSER = envConfig.PGUSER
  if (envConfig.PGPASSWORD) process.env.PGPASSWORD = envConfig.PGPASSWORD
  if (envConfig.PGSSLMODE) process.env.PGSSLMODE = envConfig.PGSSLMODE
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
