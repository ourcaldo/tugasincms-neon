import { NextRequest } from "next/server";
import { sql } from "@/lib/database";
import { verifyApiToken, extractBearerToken } from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from "@/lib/response";
import { setCorsHeaders, handleCorsPreflightRequest } from "@/lib/cors";
import { checkRateLimit } from "@/lib/rate-limit";
import { getCachedData, setCachedData } from "@/lib/cache";
import { z } from "zod";
import {
  processJobCategoriesInput,
  processJobTagsInput,
  processJobSkillsInput,
} from "@/lib/job-utils";
import { resolveLocationHierarchy } from "@/lib/location-utils";

const jobPostSchema = z.object({
  title: z.string().min(1).max(500),
  content: z.string().min(1),
  excerpt: z.string().max(1000).optional(),
  slug: z.string().min(1).max(200),
  featured_image: z.string().optional(),
  publish_date: z.string().optional(),
  status: z.enum(["draft", "published", "scheduled"]),
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
  job_tags: z.union([z.array(z.string()), z.string()]).optional(),
});

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  return handleCorsPreflightRequest(origin);
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");

  try {
    const token = extractBearerToken(request);

    const validToken = await verifyApiToken(token || "");

    if (!validToken) {
      return setCorsHeaders(
        unauthorizedResponse("Invalid or expired API token"),
        origin,
      );
    }

    const rateLimitResult = await checkRateLimit(`api_token:${validToken.id}`);
    if (!rateLimitResult.success) {
      return setCorsHeaders(
        errorResponse("Rate limit exceeded. Please try again later.", 429),
        origin,
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    
    // Helper function to get param with aliases
    const getParam = (names: string[]) => {
      for (const name of names) {
        const value = searchParams.get(name);
        if (value) return value;
      }
      return "";
    };
    
    const getIntParam = (names: string[]) => {
      for (const name of names) {
        const value = searchParams.get(name);
        if (value !== null && value !== "") {
          const parsed = parseInt(value);
          if (!isNaN(parsed)) return parsed;
        }
      }
      return null;
    };
    
    const getBoolParam = (names: string[]) => {
      for (const name of names) {
        const value = searchParams.get(name);
        if (value === "true") return true;
        if (value === "false") return false;
      }
      return null;
    };
    
    // Basic filters
    const search = getParam(["search", "q"]);
    const status = getParam(["status"]);
    
    // Company filters
    const job_company_name = getParam(["job_company_name", "company_name", "company"]);
    
    // Type/Level filters (support both with and without job_ prefix)
    const employment_type = getParam(["employment_type", "job_employment_type"]);
    const experience_level = getParam(["experience_level", "job_experience_level"]);
    const education_level = getParam(["education_level", "job_education_level"]);
    
    // Category/Tag filters
    const job_category = getParam(["job_category", "category"]);
    const job_tag = getParam(["job_tag", "tag"]);
    
    // Salary filters (support both with and without job_ prefix)
    const job_salary_min = getIntParam(["job_salary_min", "salary_min", "min_salary"]);
    const job_salary_max = getIntParam(["job_salary_max", "salary_max", "max_salary"]);
    const job_salary_currency = getParam(["job_salary_currency", "salary_currency", "currency"]);
    const job_salary_period = getParam(["job_salary_period", "salary_period", "period"]);
    const job_is_salary_negotiable = getBoolParam(["job_is_salary_negotiable", "salary_negotiable", "negotiable"]);
    
    // Location filters (support both with and without job_ prefix)
    const job_province_id = getParam(["job_province_id", "province_id", "province"]);
    const job_regency_id = getParam(["job_regency_id", "regency_id", "regency", "city_id", "city"]);
    const job_district_id = getParam(["job_district_id", "district_id", "district"]);
    const job_village_id = getParam(["job_village_id", "village_id", "village"]);
    
    // Work policy filters
    const job_is_remote = getBoolParam(["job_is_remote", "is_remote", "remote"]);
    const job_is_hybrid = getBoolParam(["job_is_hybrid", "is_hybrid", "hybrid"]);
    const work_policy = getParam(["work_policy", "policy"]);
    
    // Skills and benefits filters
    const skill = getParam(["skill", "skills"]);
    const benefit = getParam(["benefit", "benefits", "job_benefit"]);
    
    // Deadline filters
    const job_deadline_before = getParam(["job_deadline_before", "deadline_before", "deadline_max"]);
    const job_deadline_after = getParam(["job_deadline_after", "deadline_after", "deadline_min"]);

    const offset = (page - 1) * limit;
    const userId = validToken.user_id;

    const cacheKey = `api:v1:job-posts:user:${userId}:${page}:${limit}:${search}:${status}:${job_company_name}:${employment_type}:${experience_level}:${education_level}:${job_category}:${job_tag}:${job_salary_min}:${job_salary_max}:${job_salary_currency}:${job_salary_period}:${job_is_salary_negotiable}:${job_province_id}:${job_regency_id}:${job_district_id}:${job_village_id}:${job_is_remote}:${job_is_hybrid}:${work_policy}:${skill}:${benefit}:${job_deadline_before}:${job_deadline_after}`;

    const cachedData = await getCachedData(cacheKey);
    if (cachedData) {
      return setCorsHeaders(successResponse(cachedData, true), origin);
    }

    // Count total with filters
    const countResult = await sql`
      SELECT COUNT(DISTINCT jp.id)::int as count
      FROM job_posts jp
      LEFT JOIN job_employment_types jet ON jp.job_employment_type_id = jet.id
      LEFT JOIN job_experience_levels jel ON jp.job_experience_level_id = jel.id
      LEFT JOIN job_education_levels jedl ON jp.job_education_level_id = jedl.id
      WHERE jp.author_id = ${userId}
        ${search ? sql`AND (jp.title ILIKE ${`%${search}%`} OR jp.content ILIKE ${`%${search}%`} OR jp.job_requirements ILIKE ${`%${search}%`} OR jp.job_responsibilities ILIKE ${`%${search}%`})` : sql``}
        ${status ? sql`AND jp.status = ${status}` : sql`AND jp.status = 'published'`}
        ${job_company_name ? sql`AND jp.job_company_name ILIKE ${`%${job_company_name}%`}` : sql``}
        ${employment_type ? sql`AND jet.name = ${employment_type}` : sql``}
        ${experience_level ? sql`AND jel.name = ${experience_level}` : sql``}
        ${education_level ? sql`AND jedl.name = ${education_level}` : sql``}
        ${
          job_category
            ? sql`AND EXISTS (
          SELECT 1 FROM job_post_categories jpc2 
          LEFT JOIN job_categories jc2 ON jpc2.category_id = jc2.id 
          WHERE jpc2.job_post_id = jp.id 
          AND (jc2.id = ${job_category} OR jc2.slug = ${job_category})
        )`
            : sql``
        }
        ${
          job_tag
            ? sql`AND EXISTS (
          SELECT 1 FROM job_post_tags jpt2 
          LEFT JOIN job_tags jt2 ON jpt2.tag_id = jt2.id 
          WHERE jpt2.job_post_id = jp.id 
          AND (jt2.id = ${job_tag} OR jt2.slug = ${job_tag})
        )`
            : sql``
        }
        ${job_salary_min !== null ? sql`AND jp.job_salary_max >= ${job_salary_min}` : sql``}
        ${job_salary_max !== null ? sql`AND jp.job_salary_min <= ${job_salary_max}` : sql``}
        ${job_salary_currency ? sql`AND jp.job_salary_currency = ${job_salary_currency}` : sql``}
        ${job_salary_period ? sql`AND jp.job_salary_period = ${job_salary_period}` : sql``}
        ${job_is_salary_negotiable !== null ? sql`AND jp.job_is_salary_negotiable = ${job_is_salary_negotiable}` : sql``}
        ${job_province_id ? sql`AND jp.job_province_id = ${job_province_id}` : sql``}
        ${job_regency_id ? sql`AND jp.job_regency_id = ${job_regency_id}` : sql``}
        ${job_district_id ? sql`AND jp.job_district_id = ${job_district_id}` : sql``}
        ${job_village_id ? sql`AND jp.job_village_id = ${job_village_id}` : sql``}
        ${job_is_remote !== null ? sql`AND jp.job_is_remote = ${job_is_remote}` : sql``}
        ${job_is_hybrid !== null ? sql`AND jp.job_is_hybrid = ${job_is_hybrid}` : sql``}
        ${work_policy === "onsite" ? sql`AND jp.job_is_remote = false AND jp.job_is_hybrid = false` : sql``}
        ${work_policy === "remote" ? sql`AND jp.job_is_remote = true` : sql``}
        ${work_policy === "hybrid" ? sql`AND jp.job_is_hybrid = true` : sql``}
        ${skill ? sql`AND ${skill} = ANY(jp.job_skills)` : sql``}
        ${benefit ? sql`AND ${benefit} = ANY(jp.job_benefits)` : sql``}
        ${job_deadline_before ? sql`AND jp.job_deadline <= ${job_deadline_before}::timestamp` : sql``}
        ${job_deadline_after ? sql`AND jp.job_deadline >= ${job_deadline_after}::timestamp` : sql``}
    `;

    const total = countResult[0]?.count || 0;

    // Get posts with all related data and comprehensive filters
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
        ${search ? sql`AND (jp.title ILIKE ${`%${search}%`} OR jp.content ILIKE ${`%${search}%`} OR jp.job_requirements ILIKE ${`%${search}%`} OR jp.job_responsibilities ILIKE ${`%${search}%`})` : sql``}
        ${status ? sql`AND jp.status = ${status}` : sql`AND jp.status = 'published'`}
        ${job_company_name ? sql`AND jp.job_company_name ILIKE ${`%${job_company_name}%`}` : sql``}
        ${employment_type ? sql`AND jet.name = ${employment_type}` : sql``}
        ${experience_level ? sql`AND jel.name = ${experience_level}` : sql``}
        ${education_level ? sql`AND jedl.name = ${education_level}` : sql``}
        ${
          job_category
            ? sql`AND EXISTS (
          SELECT 1 FROM job_post_categories jpc2 
          LEFT JOIN job_categories jc2 ON jpc2.category_id = jc2.id 
          WHERE jpc2.job_post_id = jp.id 
          AND (jc2.id = ${job_category} OR jc2.slug = ${job_category})
        )`
            : sql``
        }
        ${
          job_tag
            ? sql`AND EXISTS (
          SELECT 1 FROM job_post_tags jpt2 
          LEFT JOIN job_tags jt2 ON jpt2.tag_id = jt2.id 
          WHERE jpt2.job_post_id = jp.id 
          AND (jt2.id = ${job_tag} OR jt2.slug = ${job_tag})
        )`
            : sql``
        }
        ${job_salary_min !== null ? sql`AND jp.job_salary_max >= ${job_salary_min}` : sql``}
        ${job_salary_max !== null ? sql`AND jp.job_salary_min <= ${job_salary_max}` : sql``}
        ${job_salary_currency ? sql`AND jp.job_salary_currency = ${job_salary_currency}` : sql``}
        ${job_salary_period ? sql`AND jp.job_salary_period = ${job_salary_period}` : sql``}
        ${job_is_salary_negotiable !== null ? sql`AND jp.job_is_salary_negotiable = ${job_is_salary_negotiable}` : sql``}
        ${job_province_id ? sql`AND jp.job_province_id = ${job_province_id}` : sql``}
        ${job_regency_id ? sql`AND jp.job_regency_id = ${job_regency_id}` : sql``}
        ${job_district_id ? sql`AND jp.job_district_id = ${job_district_id}` : sql``}
        ${job_village_id ? sql`AND jp.job_village_id = ${job_village_id}` : sql``}
        ${job_is_remote !== null ? sql`AND jp.job_is_remote = ${job_is_remote}` : sql``}
        ${job_is_hybrid !== null ? sql`AND jp.job_is_hybrid = ${job_is_hybrid}` : sql``}
        ${work_policy === "onsite" ? sql`AND jp.job_is_remote = false AND jp.job_is_hybrid = false` : sql``}
        ${work_policy === "remote" ? sql`AND jp.job_is_remote = true` : sql``}
        ${work_policy === "hybrid" ? sql`AND jp.job_is_hybrid = true` : sql``}
        ${skill ? sql`AND ${skill} = ANY(jp.job_skills)` : sql``}
        ${benefit ? sql`AND ${benefit} = ANY(jp.job_benefits)` : sql``}
        ${job_deadline_before ? sql`AND jp.job_deadline <= ${job_deadline_before}::timestamp` : sql``}
        ${job_deadline_after ? sql`AND jp.job_deadline >= ${job_deadline_after}::timestamp` : sql``}
      GROUP BY jp.id, prov.id, prov.name, reg.id, reg.name, reg.province_id, dist.id, dist.name, dist.regency_id, vill.id, vill.name, vill.district_id, jet.id, jet.name, jet.slug, jel.id, jel.name, jel.slug, jel.years_min, jel.years_max, jedl.id, jedl.name, jedl.slug
      ORDER BY jp.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const totalPages = Math.ceil(total / limit);

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
        job_company_name: job_company_name || null,
        employment_type: employment_type || null,
        experience_level: experience_level || null,
        education_level: education_level || null,
        job_category: job_category || null,
        job_tag: job_tag || null,
        job_salary_min: job_salary_min,
        job_salary_max: job_salary_max,
        job_salary_currency: job_salary_currency || null,
        job_salary_period: job_salary_period || null,
        job_is_salary_negotiable: job_is_salary_negotiable,
        job_province_id: job_province_id || null,
        job_regency_id: job_regency_id || null,
        job_district_id: job_district_id || null,
        job_village_id: job_village_id || null,
        job_is_remote: job_is_remote,
        job_is_hybrid: job_is_hybrid,
        work_policy: work_policy || null,
        skill: skill || null,
        benefit: benefit || null,
        job_deadline_before: job_deadline_before || null,
        job_deadline_after: job_deadline_after || null,
      },
    };

    await setCachedData(cacheKey, responseData, 3600);

    return setCorsHeaders(successResponse(responseData, false), origin);
  } catch (error) {
    console.error("Error fetching job posts:", error);
    return setCorsHeaders(errorResponse("Failed to fetch job posts"), origin);
  }
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");

  try {
    const token = extractBearerToken(request);

    const validToken = await verifyApiToken(token || "");

    if (!validToken) {
      return setCorsHeaders(
        unauthorizedResponse("Invalid or expired API token"),
        origin,
      );
    }

    const rateLimitResult = await checkRateLimit(`api_token:${validToken.id}`);
    if (!rateLimitResult.success) {
      return setCorsHeaders(
        errorResponse("Rate limit exceeded. Please try again later.", 429),
        origin,
      );
    }

    const userId = validToken.user_id;

    const body = await request.json();
    const validation = jobPostSchema.safeParse(body);

    if (!validation.success) {
      return setCorsHeaders(
        validationErrorResponse(validation.error.issues[0].message),
        origin,
      );
    }

    const {
      title,
      content,
      excerpt,
      slug,
      featured_image,
      publish_date,
      status,
      seo_title,
      meta_description,
      focus_keyword,
      job_company_name,
      job_company_logo,
      job_company_website,
      job_employment_type_id,
      job_experience_level_id,
      job_education_level_id,
      job_salary_min,
      job_salary_max,
      job_salary_currency,
      job_salary_period,
      job_is_salary_negotiable,
      job_province_id,
      job_regency_id,
      job_district_id,
      job_village_id,
      job_address_detail,
      job_is_remote,
      job_is_hybrid,
      job_application_email,
      job_application_url,
      job_application_deadline,
      job_skills,
      job_benefits,
      job_requirements,
      job_responsibilities,
      job_categories,
      job_tags,
    } = validation.data;

    // Process categories (accepts UUIDs, names, or comma-separated strings)
    const categoryIds = await processJobCategoriesInput(job_categories);

    // Process tags (accepts UUIDs, names, or comma-separated strings)
    const tagIds = await processJobTagsInput(job_tags);

    // Process skills (accepts array or comma-separated string)
    const processedSkills = processJobSkillsInput(job_skills);

    // Process benefits (accepts array or comma-separated string)
    const processedBenefits = processJobSkillsInput(job_benefits);

    // Resolve location hierarchy
    let resolvedLocations;
    try {
      resolvedLocations = await resolveLocationHierarchy({
        village_id: job_village_id,
        district_id: job_district_id,
        regency_id: job_regency_id,
        province_id: job_province_id,
      });
    } catch (error: any) {
      return setCorsHeaders(
        validationErrorResponse(error.message || "Invalid location data"),
        origin,
      );
    }

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
        ${job_salary_min || null}, ${job_salary_max || null}, ${job_salary_currency || "IDR"}, ${job_salary_period || "monthly"},
        ${job_is_salary_negotiable || false}, ${resolvedLocations.province_id}, ${resolvedLocations.regency_id}, ${resolvedLocations.district_id},
        ${resolvedLocations.village_id}, ${job_address_detail || null}, ${job_is_remote || false}, ${job_is_hybrid || false},
        ${job_application_email || null}, ${job_application_url || null}, ${job_application_deadline || null},
        ${processedSkills}, ${processedBenefits}, ${job_requirements || null}, ${job_responsibilities || null}
      )
      RETURNING id
    `;

    const postId = postResult[0].id;

    // Add categories
    if (categoryIds.length > 0) {
      for (const catId of categoryIds) {
        await sql`INSERT INTO job_post_categories (job_post_id, category_id) VALUES (${postId}, ${catId})`;
      }
    }

    // Add tags
    if (tagIds.length > 0) {
      for (const tagId of tagIds) {
        await sql`INSERT INTO job_post_tags (job_post_id, tag_id) VALUES (${postId}, ${tagId})`;
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
    `;

    return setCorsHeaders(successResponse(fullPost[0], false, 201), origin);
  } catch (error: any) {
    console.error("Error creating job post:", error);
    if (error?.code === "23505") {
      return setCorsHeaders(
        validationErrorResponse("A job post with this slug already exists"),
        origin,
      );
    }
    return setCorsHeaders(errorResponse("Failed to create job post"), origin);
  }
}
