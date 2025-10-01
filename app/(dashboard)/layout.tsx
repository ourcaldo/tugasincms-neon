import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { UserSync } from '@/components/user-sync'

export const dynamic = 'force-dynamic'

export default async function DashboardLayoutWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/sign-in')
  }

  return (
    <div className="min-h-screen bg-background">
      <UserSync />
      <DashboardLayout>{children}</DashboardLayout>
    </div>
  )
}
