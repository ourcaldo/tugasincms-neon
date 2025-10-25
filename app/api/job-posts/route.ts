import { NextRequest } from 'next/server'
import { sql } from '@/lib/database'
import { getUserIdFromClerk } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse, validationErrorResponse } from '@/lib/response'
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

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromClerk()
    if (!userId) {
      return unauthorizedResponse('You must be logged in')
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
    
    // Build WHERE clause
    const whereConditions = [`p.author_id = ${sql`${userId}`}`, `p.post_type = 'job'`]
    const whereParams: any[] = []
    
    if (search) {
      whereConditions.push(`p.title ILIKE ${sql`${`%${search}%`}`}`)
    }
    if (status) {
      whereConditions.push(`p.status = ${sql`${status}`}`)
    }
    
    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : ''
    
    // Count total
    const countResult = await sql`
      SELECT COUNT(DISTINCT p.id)::int as count
      FROM posts p
      LEFT JOIN job_post_meta jpm ON p.id = jpm.post_id
      LEFT JOIN job_employment_types jet ON jpm.job_employment_type_id = jet.id
      LEFT JOIN job_experience_levels jel ON jpm.job_experience_level_id = jel.id
      WHERE p.author_id = ${userId}
        AND p.post_type = 'job'
        ${search ? sql`AND p.title ILIKE ${`%${search}%`}` : sql``}
        ${status ? sql`AND p.status = ${status}` : sql``}
        ${employment_type ? sql`AND jet.name = ${employment_type}` : sql``}
        ${experience_level ? sql`AND jel.name = ${experience_level}` : sql``}
        ${job_category ? sql`AND EXISTS (SELECT 1 FROM job_post_categories WHERE post_id = p.id AND category_id = ${job_category})` : sql``}
    `
    
    const total = countResult[0]?.count || 0
    
    // Get posts with all related data
    const posts = await sql`
      SELECT 
        p.*,
        jpm.job_company_name,
        jpm.job_company_logo,
        jpm.job_company_website,
        jet.name as employment_type,
        jel.name as experience_level,
        jpm.job_salary_min,
        jpm.job_salary_max,
        jpm.job_salary_currency,
        jpm.job_salary_period,
        jpm.job_is_salary_negotiable,
        prov.name as location_province,
        reg.name as location_regency,
        dist.name as location_district,
        vill.name as location_village,
        jpm.job_address_detail,
        jpm.job_is_remote as remote,
        jpm.job_is_hybrid as hybrid,
        jpm.job_application_email,
        jpm.job_application_url,
        jpm.job_application_deadline,
        jpm.job_skills,
        jpm.job_benefits,
        jpm.job_requirements,
        jpm.job_responsibilities,
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
      FROM posts p
      LEFT JOIN job_post_meta jpm ON p.id = jpm.post_id
      LEFT JOIN job_employment_types jet ON jpm.job_employment_type_id = jet.id
      LEFT JOIN job_experience_levels jel ON jpm.job_experience_level_id = jel.id
      LEFT JOIN reg_provinces prov ON jpm.job_province_id = prov.id
      LEFT JOIN reg_regencies reg ON jpm.job_regency_id = reg.id
      LEFT JOIN reg_districts dist ON jpm.job_district_id = dist.id
      LEFT JOIN reg_villages vill ON jpm.job_village_id = vill.id
      LEFT JOIN job_post_categories jpc ON p.id = jpc.post_id
      LEFT JOIN job_categories jc ON jpc.category_id = jc.id
      LEFT JOIN job_post_tags jpt ON p.id = jpt.post_id
      LEFT JOIN job_tags jt ON jpt.tag_id = jt.id
      WHERE p.author_id = ${userId}
        AND p.post_type = 'job'
        ${search ? sql`AND p.title ILIKE ${`%${search}%`}` : sql``}
        ${status ? sql`AND p.status = ${status}` : sql``}
        ${employment_type ? sql`AND jet.name = ${employment_type}` : sql``}
        ${experience_level ? sql`AND jel.name = ${experience_level}` : sql``}
        ${job_category ? sql`AND EXISTS (SELECT 1 FROM job_post_categories WHERE post_id = p.id AND category_id = ${job_category})` : sql``}
      GROUP BY p.id, jpm.post_id, jpm.job_company_name, jpm.job_company_logo, jpm.job_company_website,
        jet.name, jel.name, jpm.job_salary_min, jpm.job_salary_max, jpm.job_salary_currency,
        jpm.job_salary_period, jpm.job_is_salary_negotiable, prov.name, reg.name, dist.name, vill.name,
        jpm.job_address_detail, jpm.job_is_remote, jpm.job_is_hybrid, jpm.job_application_email,
        jpm.job_application_url, jpm.job_application_deadline, jpm.job_skills, jpm.job_benefits,
        jpm.job_requirements, jpm.job_responsibilities
      ORDER BY p.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `
    
    return successResponse({
      posts: posts || [],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }, false)
  } catch (error) {
    console.error('Error fetching job posts:', error)
    return errorResponse('Failed to fetch job posts')
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromClerk()
    if (!userId) {
      return unauthorizedResponse('You must be logged in')
    }
    
    const body = await request.json()
    const validation = jobPostSchema.safeParse(body)
    
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
    
    // Process categories (accepts UUIDs, names, or comma-separated strings)
    const categoryIds = await processJobCategoriesInput(job_categories)
    
    // Process tags (accepts UUIDs, names, or comma-separated strings)
    const tagIds = await processJobTagsInput(job_tags)
    
    // Process skills (accepts array or comma-separated string)
    const processedSkills = processJobSkillsInput(job_skills)
    
    // Process benefits (accepts array or comma-separated string)
    const processedBenefits = processJobSkillsInput(job_benefits)
    
    // Create post
    const postResult = await sql`
      INSERT INTO posts (
        title, content, excerpt, slug, featured_image, publish_date, status,
        author_id, post_type, seo_title, meta_description, focus_keyword
      )
      VALUES (
        ${title}, ${content}, ${excerpt || null}, ${slug}, ${featured_image || null},
        ${publish_date || new Date().toISOString()}, ${status}, ${userId}, 'job',
        ${seo_title || null}, ${meta_description || null}, ${focus_keyword || null}
      )
      RETURNING id
    `
    
    const postId = postResult[0].id
    
    // Create job meta
    await sql`
      INSERT INTO job_post_meta (
        post_id, job_company_name, job_company_logo, job_company_website,
        job_employment_type_id, job_experience_level_id,
        job_salary_min, job_salary_max, job_salary_currency, job_salary_period,
        job_is_salary_negotiable, job_province_id, job_regency_id, job_district_id,
        job_village_id, job_address_detail, job_is_remote, job_is_hybrid,
        job_application_email, job_application_url, job_application_deadline,
        job_skills, job_benefits, job_requirements, job_responsibilities
      )
      VALUES (
        ${postId}, ${job_company_name || null}, ${job_company_logo || null}, ${job_company_website || null},
        ${job_employment_type_id || null}, ${job_experience_level_id || null},
        ${job_salary_min || null}, ${job_salary_max || null}, ${job_salary_currency || 'IDR'}, ${job_salary_period || 'monthly'},
        ${job_is_salary_negotiable || false}, ${job_province_id || null}, ${job_regency_id || null}, ${job_district_id || null},
        ${job_village_id || null}, ${job_address_detail || null}, ${job_is_remote || false}, ${job_is_hybrid || false},
        ${job_application_email || null}, ${job_application_url || null}, ${job_application_deadline || null},
        ${processedSkills}, ${processedBenefits}, ${job_requirements || null}, ${job_responsibilities || null}
      )
    `
    
    // Add categories
    if (categoryIds.length > 0) {
      for (const catId of categoryIds) {
        await sql`INSERT INTO job_post_categories (post_id, category_id) VALUES (${postId}, ${catId})`
      }
    }
    
    // Add tags
    if (tagIds.length > 0) {
      for (const tagId of tagIds) {
        await sql`INSERT INTO job_post_tags (post_id, tag_id) VALUES (${postId}, ${tagId})`
      }
    }
    
    // Fetch the complete job post
    const fullPost = await sql`
      SELECT 
        p.*,
        jpm.*,
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
      FROM posts p
      LEFT JOIN job_post_meta jpm ON p.id = jpm.post_id
      LEFT JOIN job_post_categories jpc ON p.id = jpc.post_id
      LEFT JOIN job_categories jc ON jpc.category_id = jc.id
      LEFT JOIN job_post_tags jpt ON p.id = jpt.post_id
      LEFT JOIN job_tags jt ON jpt.tag_id = jt.id
      WHERE p.id = ${postId}
      GROUP BY p.id, jpm.id
    `
    
    return successResponse(fullPost[0], false, 201)
  } catch (error: any) {
    console.error('Error creating job post:', error)
    if (error?.code === '23505') {
      return validationErrorResponse('A job post with this slug already exists')
    }
    return errorResponse('Failed to create job post')
  }
}
