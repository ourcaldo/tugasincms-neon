'use client'

import { JobCategoriesList } from '@/components/job-posts/job-categories-list'

export const dynamic = 'force-dynamic'

export default function JobCategoriesPage() {
  return (
    <div className="container mx-auto py-6">
      <JobCategoriesList />
    </div>
  )
}
