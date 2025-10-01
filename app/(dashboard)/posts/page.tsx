'use client'

import { useRouter } from 'next/navigation'
import { PostsList } from '@/src/components/posts/posts-list'

export default function PostsPage() {
  const router = useRouter()

  return (
    <PostsList
      onCreatePost={() => router.push('/posts/new')}
      onEditPost={(post) => router.push(`/posts/edit/${post.id}`)}
      onViewPost={(post) => window.open(`/posts/${post.id}`, '_blank')}
      onDeletePost={() => {}}
    />
  )
}
