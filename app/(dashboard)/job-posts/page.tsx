'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { JobPostsList } from '@/components/job-posts/job-posts-list'

export const dynamic = 'force-dynamic'

interface JobPost {
  id: string
  title: string
  company_name?: string
  employment_type?: string
  experience_level?: string
  location_province?: string
  location_regency?: string
  remote: boolean
  hybrid: boolean
  status: 'draft' | 'published' | 'scheduled'
  publish_date?: string
  application_deadline?: string
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
