import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/database'
import { getUserIdFromClerk } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse, notFoundResponse, validationErrorResponse } from '@/lib/response'
import { invalidateSitemaps } from '@/lib/sitemap'
import { invalidateJobCaches } from '@/lib/cache'
import { z } from 'zod'
import { updateJobPostSchema } from '@/lib/validation'
import {
  processJobCategoriesInput,
  processJobTagsInput,
  processJobSkillsInput,
} from '@/lib/job-utils'

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
      title, content, excerpt, slug: rawSlug, featured_image, publish_date, status,
      seo_title, meta_description, focus_keyword,
      job_company_name, job_company_logo, job_company_website,
      job_employment_type_id, job_experience_level_id, job_education_level_id,
      job_salary_min, job_salary_max, job_salary_currency, job_salary_period,
      job_is_salary_negotiable, job_province_id, job_regency_id, job_district_id,
      job_village_id, job_address_detail, job_is_remote, job_is_hybrid,
      job_application_email, job_application_url, job_application_deadline,
      job_skills, job_benefits, job_requirements, job_responsibilities,
      job_categories, job_tags
    } = validation.data
    
    let slug = rawSlug
    if (rawSlug !== undefined && (!rawSlug || rawSlug.trim() === '')) {
      slug = id
    }
    
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
    
    // H-6: Use CASE WHEN for nullable fields so explicit null clears the value
    // COALESCE treats both undefined and null as SQL NULL, keeping the old value
    const n = {
      empType: 'job_employment_type_id' in body ? 1 : 0,
      expLevel: 'job_experience_level_id' in body ? 1 : 0,
      eduLevel: 'job_education_level_id' in body ? 1 : 0,
      salMin: 'job_salary_min' in body ? 1 : 0,
      salMax: 'job_salary_max' in body ? 1 : 0,
      provId: 'job_province_id' in body ? 1 : 0,
      regId: 'job_regency_id' in body ? 1 : 0,
      distId: 'job_district_id' in body ? 1 : 0,
      villId: 'job_village_id' in body ? 1 : 0,
      addr: 'job_address_detail' in body ? 1 : 0,
      appEmail: 'job_application_email' in body ? 1 : 0,
      appUrl: 'job_application_url' in body ? 1 : 0,
      appDeadline: 'job_application_deadline' in body ? 1 : 0,
      reqs: 'job_requirements' in body ? 1 : 0,
      resps: 'job_responsibilities' in body ? 1 : 0,
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
        job_employment_type_id = CASE WHEN ${n.empType} = 1 THEN ${job_employment_type_id} ELSE job_employment_type_id END,
        job_experience_level_id = CASE WHEN ${n.expLevel} = 1 THEN ${job_experience_level_id} ELSE job_experience_level_id END,
        job_education_level_id = CASE WHEN ${n.eduLevel} = 1 THEN ${job_education_level_id} ELSE job_education_level_id END,
        job_salary_min = CASE WHEN ${n.salMin} = 1 THEN ${job_salary_min} ELSE job_salary_min END,
        job_salary_max = CASE WHEN ${n.salMax} = 1 THEN ${job_salary_max} ELSE job_salary_max END,
        job_salary_currency = COALESCE(${job_salary_currency}, job_salary_currency),
        job_salary_period = COALESCE(${job_salary_period}, job_salary_period),
        job_is_salary_negotiable = COALESCE(${job_is_salary_negotiable}, job_is_salary_negotiable),
        job_province_id = CASE WHEN ${n.provId} = 1 THEN ${job_province_id} ELSE job_province_id END,
        job_regency_id = CASE WHEN ${n.regId} = 1 THEN ${job_regency_id} ELSE job_regency_id END,
        job_district_id = CASE WHEN ${n.distId} = 1 THEN ${job_district_id} ELSE job_district_id END,
        job_village_id = CASE WHEN ${n.villId} = 1 THEN ${job_village_id} ELSE job_village_id END,
        job_address_detail = CASE WHEN ${n.addr} = 1 THEN ${job_address_detail} ELSE job_address_detail END,
        job_is_remote = COALESCE(${job_is_remote}, job_is_remote),
        job_is_hybrid = COALESCE(${job_is_hybrid}, job_is_hybrid),
        job_application_email = CASE WHEN ${n.appEmail} = 1 THEN ${job_application_email} ELSE job_application_email END,
        job_application_url = CASE WHEN ${n.appUrl} = 1 THEN ${job_application_url} ELSE job_application_url END,
        job_deadline = CASE WHEN ${n.appDeadline} = 1 THEN ${job_application_deadline} ELSE job_deadline END,
        job_skills = COALESCE(${processedSkills}, job_skills),
        job_benefits = COALESCE(${processedBenefits}, job_benefits),
        job_requirements = CASE WHEN ${n.reqs} = 1 THEN ${job_requirements} ELSE job_requirements END,
        job_responsibilities = CASE WHEN ${n.resps} = 1 THEN ${job_responsibilities} ELSE job_responsibilities END,
        updated_at = NOW()
      WHERE id = ${id}
    `
    
    // Update categories (batch)
    if (categoryIds !== undefined) {
      await sql`DELETE FROM job_post_categories WHERE job_post_id = ${id}`
      if (categoryIds.length > 0) {
        await sql`INSERT INTO job_post_categories (job_post_id, category_id)
          SELECT ${id}, unnest(${categoryIds}::uuid[])`
      }
    }
    
    // Update tags (batch)
    if (tagIds !== undefined) {
      await sql`DELETE FROM job_post_tags WHERE job_post_id = ${id}`
      if (tagIds.length > 0) {
        await sql`INSERT INTO job_post_tags (job_post_id, tag_id)
          SELECT ${id}, unnest(${tagIds}::uuid[])`
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
    await invalidateJobCaches()
    
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
    await invalidateJobCaches()
    
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error deleting job post:', error)
    return errorResponse('Failed to delete job post')
  }
}
