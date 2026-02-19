import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getUserRole } from '@/lib/auth'
import { SeoSettingsClient } from './seo-client'

export default async function SeoSettingsPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const role = await getUserRole(userId)
  if (role !== 'super_admin') redirect('/settings/profile')

  return <SeoSettingsClient />
}