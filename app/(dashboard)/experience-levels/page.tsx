'use client'

import { ExperienceLevelsList } from '@/components/job-posts/experience-levels-list'

export const dynamic = 'force-dynamic'

export default function ExperienceLevelsPage() {
  return (
    <div className="container mx-auto py-6">
      <ExperienceLevelsList />
    </div>
  )
}
