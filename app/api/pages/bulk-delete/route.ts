import { NextRequest } from 'next/server'
import { sql } from '@/lib/database'
import { getUserIdFromClerk } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse, validationErrorResponse } from '@/lib/response'
import { deleteCachedData } from '@/lib/cache'
import { invalidateSitemaps } from '@/lib/sitemap'
import { z } from 'zod'

const bulkDeleteSchema = z.object({
  pageIds: z.array(z.string().uuid('Invalid page ID format')).min(1, 'pageIds must be a non-empty array'),
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

    const { pageIds } = validation.data

    const ownedPages = await sql`
      SELECT id, status FROM pages
      WHERE id = ANY(${pageIds}) AND author_id = ${userId}
    `

    if (!ownedPages || ownedPages.length === 0) {
      return validationErrorResponse('No pages found or you do not own these pages')
    }

    const ownedPageIds = ownedPages.map((p: Record<string, unknown>) => p.id)

    await sql`DELETE FROM pages WHERE id = ANY(${ownedPageIds}) AND author_id = ${userId}`

    await deleteCachedData('api:pages:*')
    await deleteCachedData('api:v1:pages:*')

    const hadPublishedPages = ownedPages.some((p: Record<string, unknown>) => p.status === 'published')
    if (hadPublishedPages) {
      await invalidateSitemaps()
    }

    return successResponse({
      message: `${ownedPageIds.length} page(s) deleted successfully`,
      deletedIds: ownedPageIds
    }, false)
  } catch (error: unknown) {
    console.error('Error bulk deleting pages:', error)
    return errorResponse('Failed to delete pages')
  }
}
