'use client'

import { EducationLevelsList } from '@/components/job-posts/education-levels-list'

export const dynamic = 'force-dynamic'

export default function EducationLevelsPage() {
  return (
    <div className="container mx-auto py-6">
      <EducationLevelsList />
    </div>
  )
}
