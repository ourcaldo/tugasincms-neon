import { NextRequest } from 'next/server'
import { sql } from '@/lib/database'
import { getUserIdFromClerk } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse, validationErrorResponse } from '@/lib/response'
import { deleteCachedData } from '@/lib/cache'
import { z } from 'zod'

const bulkDeleteSchema = z.object({
  ids: z.array(z.string().uuid('Invalid employment type ID format')).min(1, 'ids must be a non-empty array'),
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

    await sql`UPDATE job_posts SET job_employment_type_id = NULL WHERE job_employment_type_id = ANY(${ids})`
    await sql`DELETE FROM job_employment_types WHERE id = ANY(${ids})`

    await deleteCachedData('api:job-data:employment-types:*')

    return successResponse({
      message: `${ids.length} employment type(s) deleted successfully`,
      deletedIds: ids
    }, false)
  } catch (error: unknown) {
    console.error('Error bulk deleting employment types:', error)
    return errorResponse('Failed to delete employment types')
  }
}
