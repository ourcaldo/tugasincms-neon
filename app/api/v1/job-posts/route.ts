import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/database";
import { verifyApiToken, extractBearerToken } from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from "@/lib/response";
import { setCorsHeaders, handleCorsPreflightRequest } from "@/lib/cors";
import { getCachedData, setCachedData } from "@/lib/cache";
import { z } from "zod";
import {
  processJobCategoriesInput,
  processJobTagsInput,
  processJobSkillsInput,
  findEmploymentTypeByNameOrSlug,
  findExperienceLevelByNameOrSlug,
  findEducationLevelByNameOrSlug,
  ensureSlugWithUUID,
} from "@/lib/job-utils";
import { 
  resolveLocationHierarchy,
  findProvinceByNameOrId,
  findRegencyByNameOrId,
  findDistrictByNameOrId,
  findVillageByNameOrId
} from "@/lib/location-utils";

const jobPostSchema = z.object({
  title: z.string().min(1, "Title is required").max(500, "Title must not exceed 500 characters"),
  content: z.string().min(1, "Content is required"),
  excerpt: z.string().max(1000, "Excerpt must not exceed 1000 characters").optional(),
  slug: z.string().max(200, "Slug must not exceed 200 characters").optional().or(z.literal("")),
  featured_image: z.string().url("Featured image must be a valid URL").optional().or(z.literal("")),
  publish_date: z.string().datetime("Publish date must be a valid ISO datetime").optional().or(z.literal("")),
  status: z.enum(["draft", "published", "scheduled"], {
    message: "Status must be one of: draft, published, scheduled"
  }),
  seo_title: z.string().max(200, "SEO title must not exceed 200 characters").optional(),
  meta_description: z.string().max(500, "Meta description must not exceed 500 characters").optional(),
  focus_keyword: z.string().max(100, "Focus keyword must not exceed 100 characters").optional(),

  // Job-specific fields
  job_company_name: z.string().max(200, "Company name must not exceed 200 characters").optional(),
  job_company_logo: z.string().url("Company logo must be a valid URL").optional().or(z.literal("")),
  job_company_website: z.string().url("Company website must be a valid URL").optional().or(z.literal("")),
  job_employment_type_id: z.string().uuid("job_employment_type_id must be a valid UUID").optional().or(z.literal("")),
  job_experience_level_id: z.string().uuid("job_experience_level_id must be a valid UUID").optional().or(z.literal("")),
  job_education_level_id: z.string().uuid("job_education_level_id must be a valid UUID").optional().or(z.literal("")),
  job_salary_min: z.number().int("Minimum salary must be an integer").min(10000, "Minimum salary must be at least 10,000 (5 digits)").optional(),
  job_salary_max: z.number().int("Maximum salary must be an integer").min(10000, "Maximum salary must be at least 10,000 (5 digits)").optional(),
  job_salary_currency: z.string().max(10, "Currency code must not exceed 10 characters").optional(),
  job_salary_period: z.string().max(50, "Salary period must not exceed 50 characters").optional(),
  job_is_salary_negotiable: z.boolean().optional(),
  job_province_id: z.string().max(2, "Province ID must not exceed 2 characters").optional(),
  job_regency_id: z.string().max(4, "Regency ID must not exceed 4 characters").optional(),
  job_district_id: z.string().max(6, "District ID must not exceed 6 characters").optional(),
  job_village_id: z.string().max(10, "Village ID must not exceed 10 characters").optional(),
  job_address_detail: z.string().optional(),
  job_is_remote: z.boolean().optional(),
  job_is_hybrid: z.boolean().optional(),
  job_application_email: z.string().email("Application email must be a valid email address").max(200).optional().or(z.literal("")),
  job_application_url: z.string().url("Application URL must be a valid URL").max(500).optional().or(z.literal("")),
  job_application_deadline: z.string().datetime("Application deadline must be a valid ISO datetime").optional().or(z.literal("")),
  job_skills: z.union([z.array(z.string()), z.string()]).optional(),
  job_benefits: z.union([z.array(z.string()), z.string()]).optional(),
  job_requirements: z.string().optional(),
  job_responsibilities: z.string().optional(),

  // Relations - can be UUIDs, names, or comma-separated strings
  job_categories: z.union([z.array(z.string()), z.string()]).optional(),
  job_tags: z.union([z.array(z.string()), z.string()]).optional(),
}).refine((data: any) => {
  // Validate salary range: max must be greater than min when both are provided
  if (data.job_salary_min !== undefined && data.job_salary_max !== undefined && 
      data.job_salary_min !== null && data.job_salary_max !== null) {
    return data.job_salary_max > data.job_salary_min;
  }
  return true;
}, {
  message: "Maximum salary must be greater than minimum salary",
  path: ["job_salary_max"]
});

async function normalizeJobPostPayload(body: any): Promise<any> {
  const normalized = { ...body };

  const originalProvinceInput = normalized.job_province_id;
  const originalRegencyInput = normalized.job_regency_id;
  const originalDistrictInput = normalized.job_district_id;

  if (normalized.job_salary_min !== undefined && normalized.job_salary_min !== null && normalized.job_salary_min !== '') {
    if (typeof normalized.job_salary_min === 'string') {
      const trimmed = normalized.job_salary_min.trim();
      if (!/^\d+$/.test(trimmed)) {
        throw new Error('job_salary_min must be a valid integer (no decimals or non-numeric characters allowed)');
      }
      const parsed = Number(trimmed);
      if (!Number.isInteger(parsed)) {
        throw new Error('job_salary_min must be an integer');
      }
      normalized.job_salary_min = parsed;
    } else if (typeof normalized.job_salary_min === 'number') {
      if (!Number.isInteger(normalized.job_salary_min)) {
        throw new Error('job_salary_min must be an integer');
      }
    } else {
      throw new Error('job_salary_min must be a number or numeric string');
    }
  }

  if (normalized.job_salary_max !== undefined && normalized.job_salary_max !== null && normalized.job_salary_max !== '') {
    if (typeof normalized.job_salary_max === 'string') {
      const trimmed = normalized.job_salary_max.trim();
      if (!/^\d+$/.test(trimmed)) {
        throw new Error('job_salary_max must be a valid integer (no decimals or non-numeric characters allowed)');
      }
      const parsed = Number(trimmed);
      if (!Number.isInteger(parsed)) {
        throw new Error('job_salary_max must be an integer');
      }
      normalized.job_salary_max = parsed;
    } else if (typeof normalized.job_salary_max === 'number') {
      if (!Number.isInteger(normalized.job_salary_max)) {
        throw new Error('job_salary_max must be an integer');
      }
    } else {
      throw new Error('job_salary_max must be a number or numeric string');
    }
  }

  // Validate salary range after normalization
  if (normalized.job_salary_min !== undefined && normalized.job_salary_max !== undefined && 
      normalized.job_salary_min !== null && normalized.job_salary_max !== null &&
      normalized.job_salary_min !== '' && normalized.job_salary_max !== '') {
    if (normalized.job_salary_max <= normalized.job_salary_min) {
      throw new Error('Maximum salary must be greater than minimum salary');
    }
  }

  const booleanFields = ['job_is_salary_negotiable', 'job_is_remote', 'job_is_hybrid'];
  for (const field of booleanFields) {
    if (normalized[field] !== undefined && normalized[field] !== null && normalized[field] !== '') {
      if (typeof normalized[field] === 'string') {
        const lowerValue = normalized[field].toLowerCase().trim();
        if (lowerValue === 'true') {
          normalized[field] = true;
        } else if (lowerValue === 'false') {
          normalized[field] = false;
        } else {
          throw new Error(`${field} must be "true" or "false", got "${normalized[field]}"`);
        }
      } else if (typeof normalized[field] !== 'boolean') {
        throw new Error(`${field} must be a boolean or string "true"/"false"`);
      }
    }
  }

  if (!normalized.publish_date || normalized.publish_date === '' || normalized.publish_date === null) {
    normalized.publish_date = new Date().toISOString();
  }

  if (normalized.job_employment_type_id && normalized.job_employment_type_id !== '') {
    normalized.job_employment_type_id = await findEmploymentTypeByNameOrSlug(normalized.job_employment_type_id);
  }

  if (normalized.job_experience_level_id && normalized.job_experience_level_id !== '') {
    normalized.job_experience_level_id = await findExperienceLevelByNameOrSlug(normalized.job_experience_level_id);
  }

  if (normalized.job_education_level_id && normalized.job_education_level_id !== '') {
    normalized.job_education_level_id = await findEducationLevelByNameOrSlug(normalized.job_education_level_id);
  }

  if (normalized.job_province_id && normalized.job_province_id !== '') {
    normalized.job_province_id = await findProvinceByNameOrId(normalized.job_province_id);
  }

  if (normalized.job_regency_id && normalized.job_regency_id !== '') {
    normalized.job_regency_id = await findRegencyByNameOrId(normalized.job_regency_id, originalProvinceInput);
  }

  if (normalized.job_district_id && normalized.job_district_id !== '') {
    normalized.job_district_id = await findDistrictByNameOrId(normalized.job_district_id, originalRegencyInput, originalProvinceInput);
  }

  if (normalized.job_village_id && normalized.job_village_id !== '') {
    normalized.job_village_id = await findVillageByNameOrId(normalized.job_village_id, originalDistrictInput, originalRegencyInput, originalProvinceInput);
  }

  if (normalized.job_province_id || normalized.job_regency_id || normalized.job_district_id || normalized.job_village_id) {
    const resolvedLocation = await resolveLocationHierarchy({
      province_id: normalized.job_province_id || null,
      regency_id: normalized.job_regency_id || null,
      district_id: normalized.job_district_id || null,
      village_id: normalized.job_village_id || null,
    });

    normalized.job_province_id = resolvedLocation.province_id || normalized.job_province_id;
    normalized.job_regency_id = resolvedLocation.regency_id || normalized.job_regency_id;
    normalized.job_district_id = resolvedLocation.district_id || normalized.job_district_id;
    normalized.job_village_id = resolvedLocation.village_id || normalized.job_village_id;
  }

  return normalized;
}

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
        ${employment_type ? sql`AND (jet.id::text = ${employment_type} OR jet.slug = ${employment_type} OR jet.name = ${employment_type})` : sql``}
        ${experience_level ? sql`AND (jel.id::text = ${experience_level} OR jel.slug = ${experience_level} OR jel.name = ${experience_level})` : sql``}
        ${education_level ? sql`AND (jedl.id::text = ${education_level} OR jedl.slug = ${education_level} OR jedl.name = ${education_level})` : sql``}
        ${
          job_category
            ? sql`AND EXISTS (
          SELECT 1 FROM job_post_categories jpc2 
          LEFT JOIN job_categories jc2 ON jpc2.category_id = jc2.id 
          WHERE jpc2.job_post_id = jp.id 
          AND (jc2.id::text = ${job_category} OR jc2.slug = ${job_category} OR jc2.name = ${job_category})
        )`
            : sql``
        }
        ${
          job_tag
            ? sql`AND EXISTS (
          SELECT 1 FROM job_post_tags jpt2 
          LEFT JOIN job_tags jt2 ON jpt2.tag_id = jt2.id 
          WHERE jpt2.job_post_id = jp.id 
          AND (jt2.id::text = ${job_tag} OR jt2.slug = ${job_tag} OR jt2.name = ${job_tag})
        )`
            : sql``
        }
        ${job_salary_min !== null ? sql`AND jp.job_salary_min >= ${job_salary_min}` : sql``}
        ${job_salary_max !== null ? sql`AND jp.job_salary_max <= ${job_salary_max}` : sql``}
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
        ${employment_type ? sql`AND (jet.id::text = ${employment_type} OR jet.slug = ${employment_type} OR jet.name = ${employment_type})` : sql``}
        ${experience_level ? sql`AND (jel.id::text = ${experience_level} OR jel.slug = ${experience_level} OR jel.name = ${experience_level})` : sql``}
        ${education_level ? sql`AND (jedl.id::text = ${education_level} OR jedl.slug = ${education_level} OR jedl.name = ${education_level})` : sql``}
        ${
          job_category
            ? sql`AND EXISTS (
          SELECT 1 FROM job_post_categories jpc2 
          LEFT JOIN job_categories jc2 ON jpc2.category_id = jc2.id 
          WHERE jpc2.job_post_id = jp.id 
          AND (jc2.id::text = ${job_category} OR jc2.slug = ${job_category} OR jc2.name = ${job_category})
        )`
            : sql``
        }
        ${
          job_tag
            ? sql`AND EXISTS (
          SELECT 1 FROM job_post_tags jpt2 
          LEFT JOIN job_tags jt2 ON jpt2.tag_id = jt2.id 
          WHERE jpt2.job_post_id = jp.id 
          AND (jt2.id::text = ${job_tag} OR jt2.slug = ${job_tag} OR jt2.name = ${job_tag})
        )`
            : sql``
        }
        ${job_salary_min !== null ? sql`AND jp.job_salary_min >= ${job_salary_min}` : sql``}
        ${job_salary_max !== null ? sql`AND jp.job_salary_max <= ${job_salary_max}` : sql``}
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

    const userId = validToken.user_id;

    const body = await request.json();
    
    let normalizedBody;
    try {
      normalizedBody = await normalizeJobPostPayload(body);
    } catch (error: any) {
      return setCorsHeaders(
        validationErrorResponse(error.message || "Invalid request data"),
        origin,
      );
    }
    
    const validation = jobPostSchema.safeParse(normalizedBody);

    if (!validation.success) {
      const errors = validation.error.issues.map((issue: any) => ({
        field: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
        received: issue.code === 'invalid_type' ? (issue as any).received : undefined
      }));
      
      return setCorsHeaders(
        NextResponse.json({
          success: false,
          error: "Validation failed",
          message: `Validation failed: ${errors[0].field} - ${errors[0].message}`,
          errors: errors
        }, { status: 400 }),
        origin,
      );
    }

    const {
      title,
      content,
      excerpt,
      slug: rawSlug,
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

    const { id: postId, slug } = ensureSlugWithUUID(rawSlug);

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
    await sql`
      INSERT INTO job_posts (
        id, title, content, excerpt, slug, featured_image, publish_date, status,
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
        ${postId}, ${title}, ${content}, ${excerpt || null}, ${slug}, ${featured_image || null},
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
    `;

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
