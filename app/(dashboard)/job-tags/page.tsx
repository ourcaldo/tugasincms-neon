'use client'

import { JobTagsList } from '@/components/job-posts/job-tags-list'

export const dynamic = 'force-dynamic'

export default function JobTagsPage() {
  return (
    <div className="container mx-auto py-6">
      <JobTagsList />
    </div>
  )
}
