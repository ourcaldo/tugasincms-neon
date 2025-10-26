import { NextRequest } from 'next/server'
import { sql } from '@/lib/database'
import { getUserIdFromClerk } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse, validationErrorResponse } from '@/lib/response'
import { z } from 'zod'

const jobCategorySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(200),
  description: z.string().max(500).optional()
})

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromClerk()
    if (!userId) {
      return unauthorizedResponse('You must be logged in')
    }

    const categories = await sql`
      SELECT 
        jc.id,
        jc.name,
        jc.slug,
        jc.description,
        jc.created_at,
        jc.updated_at,
        COUNT(jpc.job_post_id) as post_count
      FROM job_categories jc
      LEFT JOIN job_post_categories jpc ON jc.id = jpc.category_id
      GROUP BY jc.id
      ORDER BY jc.name ASC
    `

    return successResponse(categories || [], false)
  } catch (error) {
    return errorResponse('Failed to fetch job categories')
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromClerk()
    if (!userId) {
      return unauthorizedResponse('You must be logged in')
    }

    const body = await request.json()
    const validation = jobCategorySchema.safeParse(body)
    
    if (!validation.success) {
      return validationErrorResponse(validation.error.issues[0].message)
    }

    const { name, slug, description } = validation.data

    const result = await sql`
      INSERT INTO job_categories (name, slug, description)
      VALUES (${name}, ${slug}, ${description || null})
      RETURNING *
    `

    return successResponse(result[0], false, 201)
  } catch (error: any) {
    if (error?.code === '23505') {
      return validationErrorResponse('A job category with this slug already exists')
    }
    return errorResponse('Failed to create job category')
  }
}
