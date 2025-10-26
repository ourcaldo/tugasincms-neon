'use client'

import { useRouter, useParams } from 'next/navigation'
import { PageEditor } from '@/components/pages/page-editor'

export const dynamic = 'force-dynamic'

export default function EditPagePage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  return (
    <PageEditor
      pageId={id}
      onSave={() => router.push('/pages')}
      onPreview={() => {}}
      onPublish={() => {}}
    />
  )
}
