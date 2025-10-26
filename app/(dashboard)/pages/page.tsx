'use client'

import { useRouter } from 'next/navigation'
import { PagesList } from '@/components/pages/pages-list'

export const dynamic = 'force-dynamic'

interface Page {
  id: string
  title: string
  slug: string
  status: 'draft' | 'published' | 'scheduled'
}

export default function PagesPage() {
  const router = useRouter()

  const handleCreatePage = () => {
    router.push('/pages/new')
  }

  const handleEditPage = (page: Page) => {
    router.push(`/pages/edit/${page.id}`)
  }

  const handleViewPage = (page: Page) => {
    router.push(`/pages/edit/${page.id}`)
  }

  const handleDeletePage = (pageId: string) => {
    // Handled by the list component
  }

  return (
    <div className="max-w-7xl mx-auto">
      <PagesList
        onCreatePage={handleCreatePage}
        onEditPage={handleEditPage}
        onViewPage={handleViewPage}
        onDeletePage={handleDeletePage}
      />
    </div>
  )
}
