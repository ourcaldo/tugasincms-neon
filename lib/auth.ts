import { sql } from '@/lib/database'
import { auth } from '@clerk/nextjs/server'
import { NextRequest } from 'next/server'

export interface ApiToken {
  id: string
  user_id: string
  token: string
  name: string
  expires_at: string | null
  last_used_at: string | null
  created_at: string
}

export const verifyApiToken = async (token: string): Promise<ApiToken | null> => {
  if (!token) return null
  
  try {
    const result = await sql`
      SELECT * FROM api_tokens
      WHERE token = ${token}
      LIMIT 1
    `
    
    const apiToken = result[0] as ApiToken | undefined
    
    if (!apiToken) return null
    
    if (apiToken.expires_at && new Date(apiToken.expires_at) < new Date()) {
      return null
    }
    
    await sql`
      UPDATE api_tokens
      SET last_used_at = ${new Date().toISOString()}
      WHERE id = ${apiToken.id}
    `
    
    return apiToken
  } catch (error) {
    console.error('Error verifying token:', error)
    return null
  }
}

export const getUserIdFromClerk = async (): Promise<string | null> => {
  try {
    const { userId } = await auth()
    return userId
  } catch (error) {
    console.error('Error getting user from Clerk:', error)
    return null
  }
}

export const extractBearerToken = (request: NextRequest): string | null => {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null
  return authHeader.replace('Bearer ', '')
}
