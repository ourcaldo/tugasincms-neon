import { NextRequest } from 'next/server'
import { sql } from '@/lib/database'
import { getUserIdFromClerk } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse, validationErrorResponse } from '@/lib/response'
import { invalidateSitemaps } from '@/lib/sitemap'
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
  job_education_level_id: z.string().uuid().optional(),
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
    const education_level = searchParams.get('education_level') || ''
    const job_category = searchParams.get('job_category') || ''
    
    const offset = (page - 1) * limit
    
    // Count total with proper JOINs
    const countResult = await sql`
      SELECT COUNT(DISTINCT jp.id)::int as count
      FROM job_posts jp
      LEFT JOIN job_employment_types jet ON jp.job_employment_type_id = jet.id
      LEFT JOIN job_experience_levels jel ON jp.job_experience_level_id = jel.id
      LEFT JOIN job_education_levels jedl ON jp.job_education_level_id = jedl.id
      WHERE jp.author_id = ${userId}
        ${search ? sql`AND jp.title ILIKE ${`%${search}%`}` : sql``}
        ${status ? sql`AND jp.status = ${status}` : sql``}
        ${employment_type ? sql`AND jet.name = ${employment_type}` : sql``}
        ${experience_level ? sql`AND jel.name = ${experience_level}` : sql``}
        ${education_level ? sql`AND jedl.name = ${education_level}` : sql``}
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
      WHERE jp.author_id = ${userId}
        ${search ? sql`AND jp.title ILIKE ${`%${search}%`}` : sql``}
        ${status ? sql`AND jp.status = ${status}` : sql``}
        ${employment_type ? sql`AND jet.name = ${employment_type}` : sql``}
        ${experience_level ? sql`AND jel.name = ${experience_level}` : sql``}
        ${education_level ? sql`AND jedl.name = ${education_level}` : sql``}
        ${job_category ? sql`AND EXISTS (SELECT 1 FROM job_post_categories WHERE job_post_id = jp.id AND category_id = ${job_category})` : sql``}
      GROUP BY jp.id, prov.id, prov.name, reg.id, reg.name, reg.province_id, dist.id, dist.name, dist.regency_id, vill.id, vill.name, vill.district_id, jet.id, jet.name, jet.slug, jel.id, jel.name, jel.slug, jel.years_min, jel.years_max, jedl.id, jedl.name, jedl.slug
      ORDER BY jp.created_at DESC
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
      job_employment_type_id, job_experience_level_id, job_education_level_id,
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
        job_employment_type_id, job_experience_level_id, job_education_level_id,
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
        ${job_employment_type_id || null}, ${job_experience_level_id || null}, ${job_education_level_id || null},
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
      WHERE jp.id = ${postId}
      GROUP BY jp.id, prov.id, prov.name, reg.id, reg.name, reg.province_id, dist.id, dist.name, dist.regency_id, vill.id, vill.name, vill.district_id, jet.id, jet.name, jet.slug, jel.id, jel.name, jel.slug, jel.years_min, jel.years_max, jedl.id, jedl.name, jedl.slug
    `
    
    // Invalidate sitemaps if published
    if (status === 'published') {
      await invalidateSitemaps()
    }
    
    return successResponse(fullPost[0], false, 201)
  } catch (error: any) {
    console.error('Error creating job post:', error)
    if (error?.code === '23505') {
      return validationErrorResponse('A job post with this slug already exists')
    }
    return errorResponse('Failed to create job post')
  }
}
