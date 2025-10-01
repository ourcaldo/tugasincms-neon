'use client'

import { useRouter, useParams } from 'next/navigation'
import { PostEditor } from '@/src/components/posts/post-editor'

export default function EditPostPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  return (
    <PostEditor
      postId={id}
      onSave={() => router.push('/posts')}
      onPreview={() => {}}
      onPublish={() => {}}
    />
  )
}
