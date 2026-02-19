'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { UserRole } from '@/lib/auth'

interface RoleContextValue {
  role: UserRole
}

const RoleContext = createContext<RoleContextValue | null>(null)

export function RoleProvider({
  role,
  children,
}: {
  role: UserRole
  children: ReactNode
}) {
  return (
    <RoleContext.Provider value={{ role }}>
      {children}
    </RoleContext.Provider>
  )
}

/**
 * Returns the current user's role.
 * Must be used within a <RoleProvider>.
 */
export function useRole(): UserRole {
  const ctx = useContext(RoleContext)
  if (!ctx) {
    throw new Error('useRole must be used within a <RoleProvider>')
  }
  return ctx.role
}
