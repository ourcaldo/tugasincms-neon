import { NextRequest } from 'next/server'
import { sql } from '@/lib/database'
import { verifyApiToken, extractBearerToken } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse, validationErrorResponse } from '@/lib/response'
import { setCorsHeaders, handleCorsPreflightRequest } from '@/lib/cors'
import { checkRateLimit } from '@/lib/rate-limit'
import { getCachedData, setCachedData } from '@/lib/cache'
import { z } from 'zod'
import {
  processJobCategoriesInput,
  processJobTagsInput,
  processJobSkillsInput,
} from '@/lib/job-utils'

const jobPostSchema = z.object({
  title: z.string().min(1).max(500),
  content: z.string().min(1),
  excerpt: z.string().max(1000).optional(),
  slug: z.string().min(1).max(200),
  featured_image: z.string().optional(),
  publish_date: z.string().optional(),
  status: z.enum(['draft', 'published', 'scheduled']),
  seo_title: z.string().max(200).optional(),
  meta_description: z.string().max(500).optional(),
  focus_keyword: z.string().max(100).optional(),
  
  // Job-specific fields
  job_company_name: z.string().max(200).optional(),
  job_company_logo: z.string().max(500).optional(),
  job_company_website: z.string().max(500).optional(),
  job_employment_type_id: z.string().uuid().optional(),
  job_experience_level_id: z.string().uuid().optional(),
  job_salary_min: z.number().optional(),
  job_salary_max: z.number().optional(),
  job_salary_currency: z.string().max(10).optional(),
  job_salary_period: z.string().max(50).optional(),
  job_is_salary_negotiable: z.boolean().optional(),
  job_province_id: z.string().max(2).optional(),
  job_regency_id: z.string().max(4).optional(),
  job_district_id: z.string().max(6).optional(),
  job_village_id: z.string().max(10).optional(),
  job_address_detail: z.string().optional(),
  job_is_remote: z.boolean().optional(),
  job_is_hybrid: z.boolean().optional(),
  job_application_email: z.string().max(200).optional(),
  job_application_url: z.string().max(500).optional(),
  job_application_deadline: z.string().optional(),
  job_skills: z.union([z.array(z.string()), z.string()]).optional(),
  job_benefits: z.union([z.array(z.string()), z.string()]).optional(),
  job_requirements: z.string().optional(),
  job_responsibilities: z.string().optional(),
  
  // Relations - can be UUIDs, names, or comma-separated strings
  job_categories: z.union([z.array(z.string()), z.string()]).optional(),
  job_tags: z.union([z.array(z.string()), z.string()]).optional()
})

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin')
  return handleCorsPreflightRequest(origin)
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin')
  
  try {
    const token = extractBearerToken(request)
    
    const validToken = await verifyApiToken(token || '')
    
    if (!validToken) {
      return setCorsHeaders(unauthorizedResponse('Invalid or expired API token'), origin)
    }
    
    const rateLimitResult = await checkRateLimit(`api_token:${validToken.id}`)
    if (!rateLimitResult.success) {
      return setCorsHeaders(
        errorResponse('Rate limit exceeded. Please try again later.', 429),
        origin
      )
    }
    
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const employment_type = searchParams.get('employment_type') || ''
    const experience_level = searchParams.get('experience_level') || ''
    const job_category = searchParams.get('job_category') || ''
    
    const offset = (page - 1) * limit
    const userId = validToken.user_id
    
    const cacheKey = `api:v1:job-posts:user:${userId}:${page}:${limit}:${search}:${status}:${employment_type}:${experience_level}:${job_category}`
    
    const cachedData = await getCachedData(cacheKey)
    if (cachedData) {
      return setCorsHeaders(successResponse(cachedData, true), origin)
    }
    
    // Count total
    const countResult = await sql`
      SELECT COUNT(DISTINCT jp.id)::int as count
      FROM job_posts jp
      WHERE jp.author_id = ${userId}
        ${search ? sql`AND jp.title ILIKE ${`%${search}%`}` : sql``}
        ${status ? sql`AND jp.status = ${status}` : sql`AND jp.status = 'published'`}
        ${employment_type ? sql`AND jp.employment_type = ${employment_type}` : sql``}
        ${experience_level ? sql`AND jp.experience_level = ${experience_level}` : sql``}
        ${job_category ? sql`AND EXISTS (SELECT 1 FROM job_post_categories WHERE job_post_id = jp.id AND category_id = ${job_category})` : sql``}
    `
    
    const total = countResult[0]?.count || 0
    
    // Get posts with all related data
    const posts = await sql`
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
      WHERE jp.author_id = ${userId}
        ${search ? sql`AND jp.title ILIKE ${`%${search}%`}` : sql``}
        ${status ? sql`AND jp.status = ${status}` : sql`AND jp.status = 'published'`}
        ${employment_type ? sql`AND jp.employment_type = ${employment_type}` : sql``}
        ${experience_level ? sql`AND jp.experience_level = ${experience_level}` : sql``}
        ${job_category ? sql`AND EXISTS (SELECT 1 FROM job_post_categories WHERE job_post_id = jp.id AND category_id = ${job_category})` : sql``}
      GROUP BY jp.id
      ORDER BY jp.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `
    
    const totalPages = Math.ceil(total / limit)
    
    const responseData = {
      posts: posts || [],
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      filters: {
        search: search || null,
        status: status || null,
        employment_type: employment_type || null,
        experience_level: experience_level || null,
        job_category: job_category || null,
      }
    }
    
    await setCachedData(cacheKey, responseData, 3600)
    
    return setCorsHeaders(successResponse(responseData, false), origin)
  } catch (error) {
    console.error('Error fetching job posts:', error)
    return setCorsHeaders(errorResponse('Failed to fetch job posts'), origin)
  }
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin')
  
  try {
    const token = extractBearerToken(request)
    
    const validToken = await verifyApiToken(token || '')
    
    if (!validToken) {
      return setCorsHeaders(unauthorizedResponse('Invalid or expired API token'), origin)
    }
    
    const rateLimitResult = await checkRateLimit(`api_token:${validToken.id}`)
    if (!rateLimitResult.success) {
      return setCorsHeaders(
        errorResponse('Rate limit exceeded. Please try again later.', 429),
        origin
      )
    }
    
    const userId = validToken.user_id
    
    const body = await request.json()
    const validation = jobPostSchema.safeParse(body)
    
    if (!validation.success) {
      return setCorsHeaders(validationErrorResponse(validation.error.issues[0].message), origin)
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
    
    // Process categories (accepts UUIDs, names, or comma-separated strings)
    const categoryIds = await processJobCategoriesInput(job_categories)
    
    // Process tags (accepts UUIDs, names, or comma-separated strings)
    const tagIds = await processJobTagsInput(job_tags)
    
    // Process skills (accepts array or comma-separated string)
    const processedSkills = processJobSkillsInput(job_skills)
    
    // Process benefits (accepts array or comma-separated string)
    const processedBenefits = processJobSkillsInput(job_benefits)
    
    // Create job post
    const postResult = await sql`
      INSERT INTO job_posts (
        title, content, excerpt, slug, featured_image, publish_date, status,
        author_id, seo_title, meta_description, focus_keyword,
        job_company_name, job_company_logo, job_company_website,
        job_employment_type_id, job_experience_level_id,
        job_salary_min, job_salary_max, job_salary_currency, job_salary_period,
        job_is_salary_negotiable, job_province_id, job_regency_id, job_district_id,
        job_village_id, job_address_detail, job_is_remote, job_is_hybrid,
        job_application_email, job_application_url, job_deadline,
        job_skills, job_benefits, job_requirements, job_responsibilities
      )
      VALUES (
        ${title}, ${content}, ${excerpt || null}, ${slug}, ${featured_image || null},
        ${publish_date || new Date().toISOString()}, ${status}, ${userId},
        ${seo_title || null}, ${meta_description || null}, ${focus_keyword || null},
        ${job_company_name || null}, ${job_company_logo || null}, ${job_company_website || null},
        ${job_employment_type_id || null}, ${job_experience_level_id || null},
        ${job_salary_min || null}, ${job_salary_max || null}, ${job_salary_currency || 'IDR'}, ${job_salary_period || 'monthly'},
        ${job_is_salary_negotiable || false}, ${job_province_id || null}, ${job_regency_id || null}, ${job_district_id || null},
        ${job_village_id || null}, ${job_address_detail || null}, ${job_is_remote || false}, ${job_is_hybrid || false},
        ${job_application_email || null}, ${job_application_url || null}, ${job_application_deadline || null},
        ${processedSkills}, ${processedBenefits}, ${job_requirements || null}, ${job_responsibilities || null}
      )
      RETURNING id
    `
    
    const postId = postResult[0].id
    
    // Add categories
    if (categoryIds.length > 0) {
      for (const catId of categoryIds) {
        await sql`INSERT INTO job_post_categories (job_post_id, category_id) VALUES (${postId}, ${catId})`
      }
    }
    
    // Add tags
    if (tagIds.length > 0) {
      for (const tagId of tagIds) {
        await sql`INSERT INTO job_post_tags (job_post_id, tag_id) VALUES (${postId}, ${tagId})`
      }
    }
    
    // Fetch the complete job post
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
      WHERE jp.id = ${postId}
      GROUP BY jp.id
    `
    
    return setCorsHeaders(successResponse(fullPost[0], false, 201), origin)
  } catch (error: any) {
    console.error('Error creating job post:', error)
    if (error?.code === '23505') {
      return setCorsHeaders(validationErrorResponse('A job post with this slug already exists'), origin)
    }
    return setCorsHeaders(errorResponse('Failed to create job post'), origin)
  }
}
