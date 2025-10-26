import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/database'
import { getUserIdFromClerk } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse, notFoundResponse, validationErrorResponse } from '@/lib/response'
import { invalidateSitemaps } from '@/lib/sitemap'
import { z } from 'zod'
import {
  processJobCategoriesInput,
  processJobTagsInput,
  processJobSkillsInput,
} from '@/lib/job-utils'

const updateJobPostSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  content: z.string().min(1).optional(),
  excerpt: z.string().max(1000).optional(),
  slug: z.string().min(1).max(200).optional(),
  featured_image: z.string().optional(),
  publish_date: z.string().optional(),
  status: z.enum(['draft', 'published', 'scheduled']).optional(),
  seo_title: z.string().max(200).optional(),
  meta_description: z.string().max(500).optional(),
  focus_keyword: z.string().max(100).optional(),
  
  // Job-specific fields
  job_company_name: z.string().max(200).optional(),
  job_company_logo: z.string().max(500).optional(),
  job_company_website: z.string().max(500).optional(),
  job_employment_type_id: z.string().uuid().optional().nullable(),
  job_experience_level_id: z.string().uuid().optional().nullable(),
  job_salary_min: z.number().optional().nullable(),
  job_salary_max: z.number().optional().nullable(),
  job_salary_currency: z.string().max(10).optional(),
  job_salary_period: z.string().max(50).optional(),
  job_is_salary_negotiable: z.boolean().optional(),
  job_province_id: z.string().max(2).optional().nullable(),
  job_regency_id: z.string().max(4).optional().nullable(),
  job_district_id: z.string().max(6).optional().nullable(),
  job_village_id: z.string().max(10).optional().nullable(),
  job_address_detail: z.string().optional().nullable(),
  job_is_remote: z.boolean().optional(),
  job_is_hybrid: z.boolean().optional(),
  job_application_email: z.string().max(200).optional().nullable(),
  job_application_url: z.string().max(500).optional().nullable(),
  job_application_deadline: z.string().optional().nullable(),
  job_skills: z.union([z.array(z.string()), z.string()]).optional(),
  job_benefits: z.union([z.array(z.string()), z.string()]).optional(),
  job_requirements: z.string().optional().nullable(),
  job_responsibilities: z.string().optional().nullable(),
  
  // Relations - can be UUIDs, names, or comma-separated strings
  job_categories: z.union([z.array(z.string()), z.string()]).optional(),
  job_tags: z.union([z.array(z.string()), z.string()]).optional()
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromClerk()
    if (!userId) {
      return unauthorizedResponse('You must be logged in')
    }
    
    const { id } = await params
    
    const post = await sql`
      SELECT 
        jp.*,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('id', jc.id, 'name', jc.name, 'slug', jc.slug)) 
          FILTER (WHERE jc.id IS NOT NULL),
          '[]'::json
        ) as job_categories,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('id', jt.id, 'name', jt.name, 'slug', jt.slug))
          FILTER (WHERE jt.id IS NOT NULL),
          '[]'::json
        ) as job_tags
      FROM job_posts jp
      LEFT JOIN job_post_categories jpc ON jp.id = jpc.job_post_id
      LEFT JOIN job_categories jc ON jpc.category_id = jc.id
      LEFT JOIN job_post_tags jpt ON jp.id = jpt.job_post_id
      LEFT JOIN job_tags jt ON jpt.tag_id = jt.id
      WHERE jp.id = ${id} AND jp.author_id = ${userId}
      GROUP BY jp.id
    `
    
    if (!post || post.length === 0) {
      return notFoundResponse('Job post not found')
    }
    
    return successResponse(post[0], false)
  } catch (error) {
    console.error('Error fetching job post:', error)
    return errorResponse('Failed to fetch job post')
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromClerk()
    if (!userId) {
      return unauthorizedResponse('You must be logged in')
    }
    
    const { id } = await params
    
    const existingPost = await sql`
      SELECT author_id, status FROM job_posts WHERE id = ${id}
    `
    
    if (!existingPost || existingPost.length === 0) {
      return notFoundResponse('Job post not found')
    }
    
    if (existingPost[0].author_id !== userId) {
      return forbiddenResponse('You can only edit your own job posts')
    }
    
    const body = await request.json()
    const validation = updateJobPostSchema.safeParse(body)
    
    if (!validation.success) {
      return validationErrorResponse(validation.error.issues[0].message)
    }
    
    const {
      title, content, excerpt, slug, featured_image, publish_date, status,
      seo_title, meta_description, focus_keyword,
      job_company_name, job_company_logo, job_company_website,
      job_employment_type_id, job_experience_level_id,
      job_salary_min, job_salary_max, job_salary_currency, job_salary_period,
      job_is_salary_negotiable, job_province_id, job_regency_id, job_district_id,
      job_village_id, job_address_detail, job_is_remote, job_is_hybrid,
      job_application_email, job_application_url, job_application_deadline,
      job_skills, job_benefits, job_requirements, job_responsibilities,
      job_categories, job_tags
    } = validation.data
    
    // Process categories if provided (accepts UUIDs, names, or comma-separated strings)
    let categoryIds: string[] | undefined
    if (job_categories !== undefined) {
      categoryIds = await processJobCategoriesInput(job_categories)
    }
    
    // Process tags if provided (accepts UUIDs, names, or comma-separated strings)
    let tagIds: string[] | undefined
    if (job_tags !== undefined) {
      tagIds = await processJobTagsInput(job_tags)
    }
    
    // Process skills if provided (accepts array or comma-separated string)
    let processedSkills: string[] | undefined
    if (job_skills !== undefined) {
      processedSkills = processJobSkillsInput(job_skills)
    }
    
    // Process benefits if provided (accepts array or comma-separated string)
    let processedBenefits: string[] | undefined
    if (job_benefits !== undefined) {
      processedBenefits = processJobSkillsInput(job_benefits)
    }
    
    // Update job post
    await sql`
      UPDATE job_posts
      SET 
        title = COALESCE(${title}, title),
        content = COALESCE(${content}, content),
        excerpt = COALESCE(${excerpt}, excerpt),
        slug = COALESCE(${slug}, slug),
        featured_image = COALESCE(${featured_image}, featured_image),
        publish_date = COALESCE(${publish_date}, publish_date),
        status = COALESCE(${status}, status),
        seo_title = COALESCE(${seo_title}, seo_title),
        meta_description = COALESCE(${meta_description}, meta_description),
        focus_keyword = COALESCE(${focus_keyword}, focus_keyword),
        job_company_name = COALESCE(${job_company_name}, job_company_name),
        job_company_logo = COALESCE(${job_company_logo}, job_company_logo),
        job_company_website = COALESCE(${job_company_website}, job_company_website),
        job_employment_type_id = COALESCE(${job_employment_type_id}, job_employment_type_id),
        job_experience_level_id = COALESCE(${job_experience_level_id}, job_experience_level_id),
        job_salary_min = COALESCE(${job_salary_min}, job_salary_min),
        job_salary_max = COALESCE(${job_salary_max}, job_salary_max),
        job_salary_currency = COALESCE(${job_salary_currency}, job_salary_currency),
        job_salary_period = COALESCE(${job_salary_period}, job_salary_period),
        job_is_salary_negotiable = COALESCE(${job_is_salary_negotiable}, job_is_salary_negotiable),
        job_province_id = COALESCE(${job_province_id}, job_province_id),
        job_regency_id = COALESCE(${job_regency_id}, job_regency_id),
        job_district_id = COALESCE(${job_district_id}, job_district_id),
        job_village_id = COALESCE(${job_village_id}, job_village_id),
        job_address_detail = COALESCE(${job_address_detail}, job_address_detail),
        job_is_remote = COALESCE(${job_is_remote}, job_is_remote),
        job_is_hybrid = COALESCE(${job_is_hybrid}, job_is_hybrid),
        job_application_email = COALESCE(${job_application_email}, job_application_email),
        job_application_url = COALESCE(${job_application_url}, job_application_url),
        job_deadline = COALESCE(${job_application_deadline}, job_deadline),
        job_skills = COALESCE(${processedSkills}, job_skills),
        job_benefits = COALESCE(${processedBenefits}, job_benefits),
        job_requirements = COALESCE(${job_requirements}, job_requirements),
        job_responsibilities = COALESCE(${job_responsibilities}, job_responsibilities),
        updated_at = NOW()
      WHERE id = ${id}
    `
    
    // Update categories
    if (categoryIds !== undefined) {
      await sql`DELETE FROM job_post_categories WHERE job_post_id = ${id}`
      if (categoryIds.length > 0) {
        for (const catId of categoryIds) {
          await sql`INSERT INTO job_post_categories (job_post_id, category_id) VALUES (${id}, ${catId})`
        }
      }
    }
    
    // Update tags
    if (tagIds !== undefined) {
      await sql`DELETE FROM job_post_tags WHERE job_post_id = ${id}`
      if (tagIds.length > 0) {
        for (const tagId of tagIds) {
          await sql`INSERT INTO job_post_tags (job_post_id, tag_id) VALUES (${id}, ${tagId})`
        }
      }
    }
    
    // Fetch updated job post
    const fullPost = await sql`
      SELECT 
        jp.*,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('id', jc.id, 'name', jc.name, 'slug', jc.slug)) 
          FILTER (WHERE jc.id IS NOT NULL),
          '[]'::json
        ) as job_categories,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('id', jt.id, 'name', jt.name, 'slug', jt.slug))
          FILTER (WHERE jt.id IS NOT NULL),
          '[]'::json
        ) as job_tags
      FROM job_posts jp
      LEFT JOIN job_post_categories jpc ON jp.id = jpc.job_post_id
      LEFT JOIN job_categories jc ON jpc.category_id = jc.id
      LEFT JOIN job_post_tags jpt ON jp.id = jpt.job_post_id
      LEFT JOIN job_tags jt ON jpt.tag_id = jt.id
      WHERE jp.id = ${id}
      GROUP BY jp.id
    `
    
    // Invalidate sitemaps if the job post is or was published
    if (status === 'published' || existingPost[0].status === 'published') {
      await invalidateSitemaps()
    }
    
    return successResponse(fullPost[0], false)
  } catch (error) {
    console.error('Error updating job post:', error)
    return errorResponse('Failed to update job post')
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromClerk()
    if (!userId) {
      return unauthorizedResponse('You must be logged in')
    }
    
    const { id } = await params
    
    const existingPost = await sql`
      SELECT author_id, status FROM job_posts WHERE id = ${id}
    `
    
    if (!existingPost || existingPost.length === 0) {
      return notFoundResponse('Job post not found')
    }
    
    if (existingPost[0].author_id !== userId) {
      return forbiddenResponse('You can only delete your own job posts')
    }
    
    // Delete job post (cascades will handle relations)
    await sql`DELETE FROM job_posts WHERE id = ${id}`
    
    // Invalidate sitemaps if the deleted job post was published
    if (existingPost[0].status === 'published') {
      await invalidateSitemaps()
    }
    
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error deleting job post:', error)
    return errorResponse('Failed to delete job post')
  }
}
