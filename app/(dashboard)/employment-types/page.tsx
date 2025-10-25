'use client'

import { EmploymentTypesList } from '@/components/job-posts/employment-types-list'

export const dynamic = 'force-dynamic'

export default function EmploymentTypesPage() {
  return (
    <div className="container mx-auto py-6">
      <EmploymentTypesList />
    </div>
  )
}
