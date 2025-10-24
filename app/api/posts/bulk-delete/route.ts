import { NextRequest } from 'next/server'
import { sql } from '@/lib/database'
import { getUserIdFromClerk } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse, validationErrorResponse } from '@/lib/response'
import { deleteCachedData } from '@/lib/cache'
import { invalidateSitemaps } from '@/lib/sitemap'

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromClerk()
    if (!userId) {
      return unauthorizedResponse('You must be logged in')
    }
    
    const body = await request.json()
    const { postIds } = body
    
    if (!postIds || !Array.isArray(postIds) || postIds.length === 0) {
      return validationErrorResponse('postIds must be a non-empty array')
    }
    
    const ownedPosts = await sql`
      SELECT id, status FROM posts
      WHERE id = ANY(${postIds}) AND author_id = ${userId}
    `
    
    if (!ownedPosts || ownedPosts.length === 0) {
      return validationErrorResponse('No posts found or you do not own these posts')
    }
    
    const ownedPostIds = ownedPosts.map((p: any) => p.id)
    
    await sql`DELETE FROM post_tags WHERE post_id = ANY(${ownedPostIds})`
    await sql`DELETE FROM post_categories WHERE post_id = ANY(${ownedPostIds})`
    await sql`DELETE FROM posts WHERE id = ANY(${ownedPostIds}) AND author_id = ${userId}`
    
    await deleteCachedData('api:public:posts:*')
    await deleteCachedData(`api:posts:user:${userId}`)
    
    const hadPublishedPosts = ownedPosts.some((p: any) => p.status === 'published')
    if (hadPublishedPosts) {
      await invalidateSitemaps()
    }
    
    return successResponse({ 
      message: `${ownedPostIds.length} post(s) deleted successfully`,
      deletedIds: ownedPostIds
    }, false)
  } catch (error) {
    console.error('Error bulk deleting posts:', error)
    return errorResponse('Failed to delete posts')
  }
}
