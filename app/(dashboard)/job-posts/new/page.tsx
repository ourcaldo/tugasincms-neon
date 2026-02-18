'use client'

import { useRouter } from 'next/navigation'
import { JobPostEditor } from '@/components/job-posts/job-post-editor'
import { toast } from 'sonner'

export default function NewJobPostPage() {
  const router = useRouter()

  const handleSave = () => {
    router.push('/job-posts')
  }

  const handlePreview = () => {
    toast.info('Preview feature coming soon!')
  }

  const handlePublish = () => {
    router.push('/job-posts')
  }

  return (
    <JobPostEditor
      onSave={handleSave}
      onPreview={handlePreview}
      onPublish={handlePublish}
    />
  )
}
