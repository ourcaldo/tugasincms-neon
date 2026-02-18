'use client'

import { useRouter } from 'next/navigation'
import { PostEditor } from '@/components/posts/post-editor'

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
