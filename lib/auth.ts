import { supabase } from '@/lib/supabase'
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
    const { data: apiToken, error } = await supabase
      .from('api_tokens')
      .select('*')
      .eq('token', token)
      .single()
    
    if (error || !apiToken) return null
    
    if (apiToken.expires_at && new Date(apiToken.expires_at) < new Date()) {
      return null
    }
    
    await supabase
      .from('api_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', apiToken.id)
    
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
