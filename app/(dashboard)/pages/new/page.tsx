'use client'

import { useRouter } from 'next/navigation'
import { PageEditor } from '@/components/pages/page-editor'

export default function NewPagePage() {
  const router = useRouter()

  return (
    <PageEditor
      onSave={() => router.push('/pages')}
      onPreview={() => {}}
      onPublish={() => {}}
    />
  )
}
