import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getUserRole } from '@/lib/auth'
import { CustomPostTypesSettings } from '@/components/settings/custom-post-types-settings'

export default async function CustomPostTypesPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const role = await getUserRole(userId)
  if (role !== 'super_admin') redirect('/settings/profile')

  return <CustomPostTypesSettings />
}
