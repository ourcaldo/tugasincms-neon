'use client'

import { useUser } from '@clerk/nextjs'
import { useEffect, useRef } from 'react'
import { useApiClient } from '@/lib/api-client'

const MAX_RETRIES = 5

export function UserSync() {
  const { user, isLoaded } = useUser()
  const apiClient = useApiClient()
  const retriesRef = useRef(0)

  useEffect(() => {
    async function syncUser() {
      if (!isLoaded || !user) {
        return
      }

      try {
        const userData = {
          id: user.id,
          email: user.primaryEmailAddress?.emailAddress || '',
          name: user.fullName || user.firstName || 'User',
          avatar: user.imageUrl || '',
        }
        
        await apiClient.post('/settings/profile', userData)
        retriesRef.current = 0
      } catch (error) {
        console.error('UserSync: Error syncing user:', error)
        // C-11: Exponential backoff with max retries
        if (retriesRef.current < MAX_RETRIES) {
          const delay = Math.min(2000 * Math.pow(2, retriesRef.current), 30000)
          retriesRef.current++
          setTimeout(syncUser, delay)
        }
      }
    }

    syncUser()
  }, [user, isLoaded, apiClient])

  return null
}
