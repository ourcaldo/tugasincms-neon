'use client'

import { useRouter } from 'next/navigation'
import { PagesList } from '@/components/pages/pages-list'

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
    // H-19: Open in new tab for viewing, not edit
    window.open(`/pages/${page.slug || page.id}`, '_blank')
  }

  const handleDeletePage = (_pageId: string) => {
    // Handled by the list component
  }

  return (
    <PagesList
      onCreatePage={handleCreatePage}
      onEditPage={handleEditPage}
      onViewPage={handleViewPage}
      onDeletePage={handleDeletePage}
    />
  )
}
