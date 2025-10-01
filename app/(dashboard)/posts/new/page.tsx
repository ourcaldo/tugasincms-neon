'use client'

import { useRouter } from 'next/navigation'
import { PostEditor } from '@/components/posts/post-editor'

export const dynamic = 'force-dynamic'

export default function NewPostPage() {
  const router = useRouter()

  return (
    <PostEditor
      onSave={() => router.push('/posts')}
      onPreview={() => {}}
      onPublish={() => {}}
    />
  )
}
