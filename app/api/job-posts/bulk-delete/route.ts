import { NextRequest } from 'next/server'
import { sql } from '@/lib/database'
import { getUserIdFromClerk } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse, validationErrorResponse } from '@/lib/response'
import { z } from 'zod'

const bulkDeleteSchema = z.object({
  postIds: z.array(z.string().uuid()).min(1)
})

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromClerk()
    if (!userId) {
      return unauthorizedResponse('You must be logged in')
    }
    
    const body = await request.json()
    const validation = bulkDeleteSchema.safeParse(body)
    
    if (!validation.success) {
      return validationErrorResponse(validation.error.issues[0].message)
    }
    
    const { postIds } = validation.data
    
    // Verify ownership
    const posts = await sql`
      SELECT id, author_id
      FROM job_posts
      WHERE id = ANY(${postIds})
    `
    
    if (posts.length !== postIds.length) {
      return errorResponse('One or more job posts not found')
    }
    
    const unauthorizedPosts = posts.filter(p => p.author_id !== userId)
    if (unauthorizedPosts.length > 0) {
      return forbiddenResponse('You can only delete your own job posts')
    }
    
    // Delete all posts (cascades will handle relations)
    await sql`
      DELETE FROM job_posts
      WHERE id = ANY(${postIds})
        AND author_id = ${userId}
    `
    
    return successResponse({
      message: `${postIds.length} job post(s) deleted successfully`,
      deletedCount: postIds.length
    }, false)
  } catch (error) {
    console.error('Error bulk deleting job posts:', error)
    return errorResponse('Failed to delete job posts')
  }
}
