import { NextRequest } from 'next/server'
import { sql } from '@/lib/database'
import { getUserIdFromClerk } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse, validationErrorResponse } from '@/lib/response'
import { invalidateJobCaches } from '@/lib/cache'
import { z } from 'zod'

const bulkDeleteSchema = z.object({
  ids: z.array(z.string().uuid('Invalid job tag ID format')).min(1, 'ids must be a non-empty array'),
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

    const { ids } = validation.data

    await sql`DELETE FROM job_post_tags WHERE job_tag_id = ANY(${ids})`
    await sql`DELETE FROM job_tags WHERE id = ANY(${ids})`

    await invalidateJobCaches()

    return successResponse({
      message: `${ids.length} job tag(s) deleted successfully`,
      deletedIds: ids
    }, false)
  } catch (error: unknown) {
    console.error('Error bulk deleting job tags:', error)
    return errorResponse('Failed to delete job tags')
  }
}
