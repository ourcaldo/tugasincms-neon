'use client'

import { useUser } from '@clerk/nextjs'
import { useEffect } from 'react'
import { useApiClient } from '@/lib/api-client'

export function UserSync() {
  const { user, isLoaded } = useUser()
  const apiClient = useApiClient()

  useEffect(() => {
    async function syncUser() {
      if (!isLoaded || !user) {
        console.log('UserSync: waiting for user to load...')
        return
      }

      console.log('UserSync: syncing user to database...', user.id)

      try {
        const userData = {
          id: user.id,
          email: user.primaryEmailAddress?.emailAddress || '',
          name: user.fullName || user.firstName || 'User',
          avatar: user.imageUrl || '',
        }
        
        console.log('UserSync: upserting user with data:', userData)
        
        const syncedUser = await apiClient.post('/settings/profile', userData)
        console.log('UserSync: ✅ User synced successfully:', syncedUser)
      } catch (error) {
        console.error('UserSync: ❌ Error syncing user:', error)
        setTimeout(() => {
          console.log('UserSync: retrying sync...')
          syncUser()
        }, 2000)
      }
    }

    syncUser()
  }, [user, isLoaded, apiClient])

  return null
}
