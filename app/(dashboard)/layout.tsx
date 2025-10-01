import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/src/components/layout/dashboard-layout'
import { UserSync } from '@/src/components/user-sync'

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
