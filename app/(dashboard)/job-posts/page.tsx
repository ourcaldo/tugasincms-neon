'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { JobPostsList } from '@/components/job-posts/job-posts-list'

export const dynamic = 'force-dynamic'

interface JobPost {
  id: string
  title: string
  job_company_name?: string
  employment_type?: { id: string; name: string; slug: string } | null
  experience_level?: { id: string; name: string; slug: string; years_min?: number; years_max?: number } | null
  province?: { id: string; name: string } | null
  regency?: { id: string; name: string; province_id: string } | null
  job_is_remote?: boolean
  job_is_hybrid?: boolean
  status: 'draft' | 'published' | 'scheduled'
  publish_date?: string
  job_deadline?: string
  created_at?: string
  updated_at?: string
  job_categories?: Array<{ id: string; name: string }>
  job_tags?: Array<{ id: string; name: string }>
}

export default function JobPostsPage() {
  const router = useRouter()

  const handleCreatePost = () => {
    router.push('/job-posts/new')
  }

  const handleEditPost = (post: JobPost) => {
    router.push(`/job-posts/edit/${post.id}`)
  }

  const handleViewPost = (post: JobPost) => {
    // For now, redirect to edit - can add preview later
    router.push(`/job-posts/edit/${post.id}`)
  }

  const handleDeletePost = (postId: string) => {
    // Handled by the list component
  }

  return (
    <div className="max-w-7xl mx-auto">
      <JobPostsList
        onCreatePost={handleCreatePost}
        onEditPost={handleEditPost}
        onViewPost={handleViewPost}
        onDeletePost={handleDeletePost}
      />
    </div>
  )
}
