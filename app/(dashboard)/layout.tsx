import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { ErrorBoundary } from '@/components/error-boundary'
import { getUserRole } from '@/lib/auth'
import { RoleProvider } from '@/components/role-provider'

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

  // Only super_admin and admin can access the dashboard
  const role = await getUserRole(userId)
  if (role === 'user' || !role) {
    redirect('/access-denied')
  }

  return (
    <div className="min-h-screen bg-background">
      <RoleProvider role={role}>
        <DashboardLayout>
          <ErrorBoundary>{children}</ErrorBoundary>
        </DashboardLayout>
      </RoleProvider>
    </div>
  )
}
