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

      console.log('UserSync: checking if user exists in database...', user.id)

      try {
        const response = await fetch(`/api/settings/profile/${user.id}`)
        
        if (response.status === 404) {
          console.log('UserSync: user not found, creating new user...')
          
          const userData = {
            id: user.id,
            email: user.primaryEmailAddress?.emailAddress || '',
            name: user.fullName || user.firstName || 'User',
            avatar: user.imageUrl || '',
          }
          
          console.log('UserSync: creating user with data:', userData)
          
          const newUser = await apiClient.post('/settings/profile', userData)
          console.log('UserSync: ✅ User created successfully:', newUser)
        } else if (response.ok) {
          const existingUser = await response.json()
          console.log('UserSync: ✅ User already exists:', existingUser)
        } else {
          console.error('UserSync: unexpected response status:', response.status)
        }
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
