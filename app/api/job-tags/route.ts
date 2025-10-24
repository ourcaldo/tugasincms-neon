import { NextRequest } from 'next/server'
import { sql } from '@/lib/database'
import { getUserIdFromClerk } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse, validationErrorResponse } from '@/lib/response'
import { z } from 'zod'

const jobTagSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(200)
})

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromClerk()
    if (!userId) {
      return unauthorizedResponse('You must be logged in')
    }

    const tags = await sql`
      SELECT 
        jt.id,
        jt.name,
        jt.slug,
        jt.created_at,
        jt.updated_at,
        COUNT(jpt.post_id) as post_count
      FROM job_tags jt
      LEFT JOIN job_post_tags jpt ON jt.id = jpt.tag_id
      GROUP BY jt.id
      ORDER BY jt.name ASC
    `

    return successResponse(tags || [], false)
  } catch (error) {
    return errorResponse('Failed to fetch job tags')
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromClerk()
    if (!userId) {
      return unauthorizedResponse('You must be logged in')
    }

    const body = await request.json()
    const validation = jobTagSchema.safeParse(body)
    
    if (!validation.success) {
      return validationErrorResponse(validation.error.issues[0].message)
    }

    const { name, slug } = validation.data

    const result = await sql`
      INSERT INTO job_tags (name, slug)
      VALUES (${name}, ${slug})
      RETURNING *
    `

    return successResponse(result[0], false, 201)
  } catch (error: any) {
    if (error?.code === '23505') {
      return validationErrorResponse('A job tag with this slug already exists')
    }
    return errorResponse('Failed to create job tag')
  }
}
