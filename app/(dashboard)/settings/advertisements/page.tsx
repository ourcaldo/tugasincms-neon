import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getUserRole } from '@/lib/auth'
import { AdvertisementSettingsClient } from './advertisements-client'

export default async function AdvertisementSettingsPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const role = await getUserRole(userId)
  if (role !== 'super_admin') redirect('/settings/profile')

  return <AdvertisementSettingsClient />
}