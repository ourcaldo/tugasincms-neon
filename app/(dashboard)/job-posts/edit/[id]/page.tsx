'use client'

import { useRouter, useParams } from 'next/navigation'
import { JobPostEditor } from '@/components/job-posts/job-post-editor'
import { toast } from 'sonner'

export const dynamic = 'force-dynamic'

export default function EditJobPostPage() {
  const router = useRouter()
  const params = useParams()
  const postId = params.id as string

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
    <div className="container mx-auto py-6">
      <JobPostEditor
        postId={postId}
        onSave={handleSave}
        onPreview={handlePreview}
        onPublish={handlePublish}
      />
    </div>
  )
}
