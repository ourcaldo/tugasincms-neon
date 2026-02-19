import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/database'
import { verifyApiToken, extractBearerToken } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse, notFoundResponse, validationErrorResponse } from '@/lib/response'
import { setCorsHeaders, handleCorsPreflightRequest } from '@/lib/cors'
import { getCachedData, setCachedData, invalidateJobCaches } from '@/lib/cache'
import { API_CACHE_TTL } from '@/lib/constants'
import { invalidateSitemaps } from '@/lib/sitemap'
import { updateJobPostSchema } from '@/lib/validation'
import {
  processJobCategoriesInput,
  processJobTagsInput,
  processJobSkillsInput,
} from '@/lib/job-utils'
import { resolveLocationHierarchy } from '@/lib/location-utils'

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin')
  return handleCorsPreflightRequest(origin)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const origin = request.headers.get('origin')
  
  try {
    const token = extractBearerToken(request)
    
    const validToken = await verifyApiToken(token || '')
    
    if (!validToken) {
      return setCorsHeaders(unauthorizedResponse('Invalid or expired API token'), origin)
    }
    
    const { id } = await params
    const userId = validToken.user_id
    
    const cacheKey = `api:v1:job-posts:user:${userId}:${id}`
    
    const cachedData = await getCachedData(cacheKey)
    if (cachedData) {
      return setCorsHeaders(successResponse(cachedData, true), origin)
    }
    
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
        ) as job_tags,
        CASE WHEN prov.id IS NOT NULL THEN jsonb_build_object('id', prov.id, 'name', prov.name) ELSE NULL END as province,
        CASE WHEN reg.id IS NOT NULL THEN jsonb_build_object('id', reg.id, 'name', reg.name, 'province_id', reg.province_id) ELSE NULL END as regency,
        CASE WHEN dist.id IS NOT NULL THEN jsonb_build_object('id', dist.id, 'name', dist.name, 'regency_id', dist.regency_id) ELSE NULL END as district,
        CASE WHEN vill.id IS NOT NULL THEN jsonb_build_object('id', vill.id, 'name', vill.name, 'district_id', vill.district_id) ELSE NULL END as village,
        CASE WHEN jet.id IS NOT NULL THEN jsonb_build_object('id', jet.id, 'name', jet.name, 'slug', jet.slug) ELSE NULL END as employment_type,
        CASE WHEN jel.id IS NOT NULL THEN jsonb_build_object('id', jel.id, 'name', jel.name, 'slug', jel.slug, 'years_min', jel.years_min, 'years_max', jel.years_max) ELSE NULL END as experience_level,
        CASE WHEN jedl.id IS NOT NULL THEN jsonb_build_object('id', jedl.id, 'name', jedl.name, 'slug', jedl.slug) ELSE NULL END as education_level
      FROM job_posts jp
      LEFT JOIN job_post_categories jpc ON jp.id = jpc.job_post_id
      LEFT JOIN job_categories jc ON jpc.category_id = jc.id
      LEFT JOIN job_post_tags jpt ON jp.id = jpt.job_post_id
      LEFT JOIN job_tags jt ON jpt.tag_id = jt.id
      LEFT JOIN reg_provinces prov ON jp.job_province_id = prov.id
      LEFT JOIN reg_regencies reg ON jp.job_regency_id = reg.id
      LEFT JOIN reg_districts dist ON jp.job_district_id = dist.id
      LEFT JOIN reg_villages vill ON jp.job_village_id = vill.id
      LEFT JOIN job_employment_types jet ON jp.job_employment_type_id = jet.id
      LEFT JOIN job_experience_levels jel ON jp.job_experience_level_id = jel.id
      LEFT JOIN job_education_levels jedl ON jp.job_education_level_id = jedl.id
      WHERE jp.id = ${id} AND jp.author_id = ${userId}
      GROUP BY jp.id, prov.id, reg.id, dist.id, vill.id, jet.id, jel.id, jedl.id
    `
    
    if (!post || post.length === 0) {
      return setCorsHeaders(notFoundResponse('Job post not found'), origin)
    }
    
    await setCachedData(cacheKey, post[0], API_CACHE_TTL)
    
    return setCorsHeaders(successResponse(post[0], false), origin)
  } catch (error) {
    console.error('Error fetching job post:', error)
    return setCorsHeaders(errorResponse('Failed to fetch job post'), origin)
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const origin = request.headers.get('origin')
  
  try {
    const token = extractBearerToken(request)
    
    const validToken = await verifyApiToken(token || '')
    
    if (!validToken) {
      return setCorsHeaders(unauthorizedResponse('Invalid or expired API token'), origin)
    }
    
    const userId = validToken.user_id
    
    const { id } = await params
    
    const existingPost = await sql`
      SELECT author_id FROM job_posts WHERE id = ${id} AND author_id = ${userId}
    `
    
    if (!existingPost || existingPost.length === 0) {
      return setCorsHeaders(notFoundResponse('Job post not found'), origin)
    }
    
    const body = await request.json()
    const validation = updateJobPostSchema.safeParse(body)
    
    if (!validation.success) {
      return setCorsHeaders(validationErrorResponse(validation.error.issues[0].message), origin)
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
    
    // Resolve location hierarchy if any location field is provided
    let resolvedLocations
    const hasLocationFields = 
      job_village_id !== undefined || 
      job_district_id !== undefined || 
      job_regency_id !== undefined || 
      job_province_id !== undefined
    
    if (hasLocationFields) {
      try {
        resolvedLocations = await resolveLocationHierarchy({
          village_id: job_village_id,
          district_id: job_district_id,
          regency_id: job_regency_id,
          province_id: job_province_id,
        })
      } catch (error: unknown) {
        return setCorsHeaders(
          validationErrorResponse(error instanceof Error ? error.message : 'Invalid location data'),
          origin
        )
      }
    }
    
    // H-6: Use CASE WHEN for nullable fields so explicit null clears the value
    const n = {
      featImg: 'featured_image' in body ? 1 : 0,
      seoTitle: 'seo_title' in body ? 1 : 0,
      metaDesc: 'meta_description' in body ? 1 : 0,
      focusKw: 'focus_keyword' in body ? 1 : 0,
      compName: 'job_company_name' in body ? 1 : 0,
      compLogo: 'job_company_logo' in body ? 1 : 0,
      compWeb: 'job_company_website' in body ? 1 : 0,
      empType: 'job_employment_type_id' in body ? 1 : 0,
      expLevel: 'job_experience_level_id' in body ? 1 : 0,
      eduLevel: 'job_education_level_id' in body ? 1 : 0,
      salMin: 'job_salary_min' in body ? 1 : 0,
      salMax: 'job_salary_max' in body ? 1 : 0,
      salCur: 'job_salary_currency' in body ? 1 : 0,
      salPer: 'job_salary_period' in body ? 1 : 0,
      addr: 'job_address_detail' in body ? 1 : 0,
      appEmail: 'job_application_email' in body ? 1 : 0,
      appUrl: 'job_application_url' in body ? 1 : 0,
      appDeadline: 'job_application_deadline' in body ? 1 : 0,
      reqs: 'job_requirements' in body ? 1 : 0,
      resps: 'job_responsibilities' in body ? 1 : 0,
      hasLoc: hasLocationFields ? 1 : 0,
    }
    
    // Update job post
    await sql`
      UPDATE job_posts
      SET 
        title = COALESCE(${title}, title),
        content = COALESCE(${content}, content),
        excerpt = COALESCE(${excerpt}, excerpt),
        slug = COALESCE(${slug}, slug),
        featured_image = CASE WHEN ${n.featImg} = 1 THEN ${featured_image} ELSE featured_image END,
        publish_date = COALESCE(${publish_date}, publish_date),
        status = COALESCE(${status}, status),
        seo_title = CASE WHEN ${n.seoTitle} = 1 THEN ${seo_title} ELSE seo_title END,
        meta_description = CASE WHEN ${n.metaDesc} = 1 THEN ${meta_description} ELSE meta_description END,
        focus_keyword = CASE WHEN ${n.focusKw} = 1 THEN ${focus_keyword} ELSE focus_keyword END,
        job_company_name = CASE WHEN ${n.compName} = 1 THEN ${job_company_name} ELSE job_company_name END,
        job_company_logo = CASE WHEN ${n.compLogo} = 1 THEN ${job_company_logo} ELSE job_company_logo END,
        job_company_website = CASE WHEN ${n.compWeb} = 1 THEN ${job_company_website} ELSE job_company_website END,
        job_employment_type_id = CASE WHEN ${n.empType} = 1 THEN ${job_employment_type_id} ELSE job_employment_type_id END,
        job_experience_level_id = CASE WHEN ${n.expLevel} = 1 THEN ${job_experience_level_id} ELSE job_experience_level_id END,
        job_education_level_id = CASE WHEN ${n.eduLevel} = 1 THEN ${job_education_level_id} ELSE job_education_level_id END,
        job_salary_min = CASE WHEN ${n.salMin} = 1 THEN ${job_salary_min} ELSE job_salary_min END,
        job_salary_max = CASE WHEN ${n.salMax} = 1 THEN ${job_salary_max} ELSE job_salary_max END,
        job_salary_currency = CASE WHEN ${n.salCur} = 1 THEN ${job_salary_currency} ELSE job_salary_currency END,
        job_salary_period = CASE WHEN ${n.salPer} = 1 THEN ${job_salary_period} ELSE job_salary_period END,
        job_is_salary_negotiable = COALESCE(${job_is_salary_negotiable}, job_is_salary_negotiable),
        job_province_id = CASE WHEN ${n.hasLoc} = 1 THEN ${resolvedLocations?.province_id ?? null} ELSE job_province_id END,
        job_regency_id = CASE WHEN ${n.hasLoc} = 1 THEN ${resolvedLocations?.regency_id ?? null} ELSE job_regency_id END,
        job_district_id = CASE WHEN ${n.hasLoc} = 1 THEN ${resolvedLocations?.district_id ?? null} ELSE job_district_id END,
        job_village_id = CASE WHEN ${n.hasLoc} = 1 THEN ${resolvedLocations?.village_id ?? null} ELSE job_village_id END,
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
      WHERE id = ${id} AND author_id = ${userId}
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
    await invalidateJobCaches()
    await invalidateSitemaps()
    
    return setCorsHeaders(successResponse(fullPost[0], false), origin)
  } catch (error) {
    console.error('Error updating job post:', error)
    return setCorsHeaders(errorResponse('Failed to update job post'), origin)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const origin = request.headers.get('origin')
  
  try {
    const token = extractBearerToken(request)
    
    const validToken = await verifyApiToken(token || '')
    
    if (!validToken) {
      return setCorsHeaders(unauthorizedResponse('Invalid or expired API token'), origin)
    }
    
    const userId = validToken.user_id
    
    const { id } = await params
    
    const existingPost = await sql`
      SELECT author_id FROM job_posts WHERE id = ${id}
    `
    
    if (!existingPost || existingPost.length === 0) {
      return setCorsHeaders(notFoundResponse('Job post not found'), origin)
    }
    
    if (existingPost[0].author_id !== userId) {
      return setCorsHeaders(forbiddenResponse('You can only delete your own job posts'), origin)
    }
    
    // Delete job post (cascades will handle relations)
    await sql`DELETE FROM job_posts WHERE id = ${id}`
    await invalidateJobCaches()
    await invalidateSitemaps()
    
    const response = new NextResponse(null, { status: 204 })
    return setCorsHeaders(response, origin)
  } catch (error) {
    console.error('Error deleting job post:', error)
    return setCorsHeaders(errorResponse('Failed to delete job post'), origin)
  }
}
