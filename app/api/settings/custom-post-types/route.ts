import { NextRequest } from 'next/server'
import { sql } from '@/lib/database'
import { getUserIdFromClerk } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/response'

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromClerk()
    if (!userId) {
      return unauthorizedResponse('You must be logged in')
    }

    const customPostTypes = await sql`
      SELECT 
        id,
        slug,
        name,
        singular_name,
        plural_name,
        description,
        icon,
        is_enabled,
        menu_position,
        created_at,
        updated_at
      FROM custom_post_types
      ORDER BY menu_position ASC, name ASC
    `

    return successResponse(customPostTypes || [], false)
  } catch (error) {
    return errorResponse('Failed to fetch custom post types')
  }
}
