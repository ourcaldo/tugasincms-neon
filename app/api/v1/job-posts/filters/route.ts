import { NextRequest } from 'next/server'
import { sql } from '@/lib/database'
import { verifyApiToken, extractBearerToken } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/response'
import { setCorsHeaders, handleCorsPreflightRequest } from '@/lib/cors'
import { getCachedData, setCachedData } from '@/lib/cache'

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
    
    const userId = validToken.user_id
    const cacheKey = `api:v1:job-posts:filters:user:${userId}`
    
    const cachedData = await getCachedData(cacheKey)
    if (cachedData) {
      return setCorsHeaders(successResponse(cachedData, true), origin)
    }
    
    // Get all job categories with post counts (only for published posts by this user)
    const categoriesResult = await sql`
      SELECT 
        jc.id,
        jc.name,
        jc.slug,
        jc.description,
        COUNT(DISTINCT jpc.job_post_id)::int as post_count
      FROM job_categories jc
      LEFT JOIN job_post_categories jpc ON jc.id = jpc.category_id
      LEFT JOIN job_posts jp ON jpc.job_post_id = jp.id AND jp.author_id = ${userId} AND jp.status = 'published'
      GROUP BY jc.id, jc.name, jc.slug, jc.description
      ORDER BY jc.name ASC
    `
    
    // Get all job tags with post counts (only for published posts by this user)
    const tagsResult = await sql`
      SELECT 
        jt.id,
        jt.name,
        jt.slug,
        COUNT(DISTINCT jpt.job_post_id)::int as post_count
      FROM job_tags jt
      LEFT JOIN job_post_tags jpt ON jt.id = jpt.tag_id
      LEFT JOIN job_posts jp ON jpt.job_post_id = jp.id AND jp.author_id = ${userId} AND jp.status = 'published'
      GROUP BY jt.id, jt.name, jt.slug
      ORDER BY jt.name ASC
    `
    
    // Get all employment types
    const employmentTypesResult = await sql`
      SELECT 
        jet.id,
        jet.name,
        jet.slug,
        COUNT(DISTINCT jp.id)::int as post_count
      FROM job_employment_types jet
      LEFT JOIN job_posts jp ON jet.id = jp.job_employment_type_id AND jp.author_id = ${userId} AND jp.status = 'published'
      GROUP BY jet.id, jet.name, jet.slug
      ORDER BY jet.name ASC
    `
    
    // Get all experience levels
    const experienceLevelsResult = await sql`
      SELECT 
        jel.id,
        jel.name,
        jel.slug,
        jel.years_min,
        jel.years_max,
        COUNT(DISTINCT jp.id)::int as post_count
      FROM job_experience_levels jel
      LEFT JOIN job_posts jp ON jel.id = jp.job_experience_level_id AND jp.author_id = ${userId} AND jp.status = 'published'
      GROUP BY jel.id, jel.name, jel.slug, jel.years_min, jel.years_max
      ORDER BY jel.years_min ASC NULLS LAST, jel.name ASC
    `
    
    // Get all education levels
    const educationLevelsResult = await sql`
      SELECT 
        jedl.id,
        jedl.name,
        jedl.slug,
        COUNT(DISTINCT jp.id)::int as post_count
      FROM job_education_levels jedl
      LEFT JOIN job_posts jp ON jedl.id = jp.job_education_level_id AND jp.author_id = ${userId} AND jp.status = 'published'
      GROUP BY jedl.id, jedl.name, jedl.slug
      ORDER BY jedl.name ASC
    `
    
    // Get salary range (min and max from all published job posts by this user)
    const salaryRangeResult = await sql`
      SELECT 
        MIN(job_salary_min) as min_salary,
        MAX(job_salary_max) as max_salary,
        array_agg(DISTINCT job_salary_currency) FILTER (WHERE job_salary_currency IS NOT NULL) as currencies
      FROM job_posts
      WHERE author_id = ${userId} 
        AND status = 'published'
        AND (job_salary_min IS NOT NULL OR job_salary_max IS NOT NULL)
    `
    
    // Get available provinces (that have job posts by this user)
    const provincesResult = await sql`
      SELECT 
        p.id,
        p.name,
        COUNT(DISTINCT jp.id)::int as post_count
      FROM reg_provinces p
      INNER JOIN job_posts jp ON p.id = jp.job_province_id
      WHERE jp.author_id = ${userId} AND jp.status = 'published'
      GROUP BY p.id, p.name
      ORDER BY p.name ASC
    `
    
    // Get available regencies (that have job posts by this user)
    const regenciesResult = await sql`
      SELECT 
        r.id,
        r.name,
        r.province_id,
        COUNT(DISTINCT jp.id)::int as post_count
      FROM reg_regencies r
      INNER JOIN job_posts jp ON r.id = jp.job_regency_id
      WHERE jp.author_id = ${userId} AND jp.status = 'published'
      GROUP BY r.id, r.name, r.province_id
      ORDER BY r.name ASC
    `
    
    // Get available skills (aggregated from all published job posts by this user)
    const skillsResult = await sql`
      SELECT 
        DISTINCT unnest(job_skills) as skill,
        COUNT(*)::int as post_count
      FROM job_posts
      WHERE author_id = ${userId} 
        AND status = 'published'
        AND job_skills IS NOT NULL
        AND array_length(job_skills, 1) > 0
      GROUP BY skill
      ORDER BY post_count DESC, skill ASC
    `
    
    // Get work policy counts (onsite, remote, hybrid)
    const workPolicyResult = await sql`
      SELECT 
        COUNT(*) FILTER (WHERE job_is_remote = false AND job_is_hybrid = false)::int as onsite_count,
        COUNT(*) FILTER (WHERE job_is_remote = true)::int as remote_count,
        COUNT(*) FILTER (WHERE job_is_hybrid = true)::int as hybrid_count
      FROM job_posts
      WHERE author_id = ${userId} 
        AND status = 'published'
    `
    
    const filterData = {
      categories: categoriesResult || [],
      tags: tagsResult || [],
      employment_types: employmentTypesResult || [],
      experience_levels: experienceLevelsResult || [],
      education_levels: educationLevelsResult || [],
      salary_range: {
        min: salaryRangeResult[0]?.min_salary || 0,
        max: salaryRangeResult[0]?.max_salary || 0,
        currencies: salaryRangeResult[0]?.currencies || ['IDR']
      },
      work_policy: [
        { name: 'Onsite', value: 'onsite', post_count: workPolicyResult[0]?.onsite_count || 0 },
        { name: 'Remote', value: 'remote', post_count: workPolicyResult[0]?.remote_count || 0 },
        { name: 'Hybrid', value: 'hybrid', post_count: workPolicyResult[0]?.hybrid_count || 0 }
      ],
      provinces: provincesResult || [],
      regencies: regenciesResult || [],
      skills: (skillsResult || []).map(row => ({
        name: row.skill,
        post_count: row.post_count
      }))
    }
    
    await setCachedData(cacheKey, filterData, 3600)
    
    return setCorsHeaders(successResponse(filterData, false), origin)
  } catch (error) {
    console.error('Error fetching job post filters:', error)
    return setCorsHeaders(errorResponse('Failed to fetch job post filters'), origin)
  }
}
