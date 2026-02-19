import { z } from 'zod'

export const postSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500, 'Title is too long'),
  content: z.string().min(1, 'Content is required'),
  excerpt: z.string().max(1000, 'Excerpt is too long').optional(),
  slug: z.string().max(200, 'Slug is too long').regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase and use hyphens').optional(),
  featuredImage: z.string().url('Invalid image URL').optional().or(z.literal('')),
  publishDate: z.string().datetime('Invalid date format').optional(),
  status: z.enum(['draft', 'published', 'scheduled']).optional(),
  seo: z.object({
    title: z.string().max(200, 'SEO title is too long').optional(),
    metaDescription: z.string().max(500, 'Meta description is too long').optional(),
    focusKeyword: z.string().max(100, 'Focus keyword is too long').optional(),
  }).optional(),
  categories: z.array(z.string().uuid('Invalid category ID')).optional(),
  tags: z.array(z.string().uuid('Invalid tag ID')).optional(),
})

export const updatePostSchema = postSchema.partial()

export const categorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  slug: z.string().max(200, 'Slug is too long').regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase and use hyphens').optional(),
  description: z.string().max(500, 'Description is too long').optional(),
})

export const tagSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  slug: z.string().max(200, 'Slug is too long').regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase and use hyphens').optional(),
})

export const tokenSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  name: z.string().min(1, 'Token name is required').max(100, 'Token name is too long'),
  expiresAt: z.string().datetime('Invalid expiration date').optional(),
})

export const userProfileSchema = z.object({
  id: z.string().min(1, 'User ID is required'),
  email: z.string().email('Invalid email').optional(),
  name: z.string().max(200, 'Name is too long').optional(),
  avatar: z.string().url('Invalid avatar URL').optional(),
})

export const updateUserProfileSchema = z.object({
  name: z.string().max(200, 'Name is too long').optional(),
  bio: z.string().max(1000, 'Bio is too long').optional(),
  avatar: z.string().url('Invalid avatar URL').optional(),
  phone: z.string().max(50, 'Phone number is too long').optional(),
})

// User preferences schema
export const userPreferencesSchema = z.object({
  newsletter_jobs: z.boolean().optional(),
  newsletter_career: z.boolean().optional(),
  notify_saved_job_updates: z.boolean().optional(),
})

// User skill schema
export const userSkillSchema = z.object({
  name: z.string().min(1, 'Skill name is required').max(100, 'Skill name is too long'),
})

export const userSkillsBatchSchema = z.object({
  skills: z.array(z.string().min(1).max(100)).min(1, 'At least one skill is required').max(50, 'Maximum 50 skills'),
})

// User experience schema
export const userExperienceSchema = z.object({
  company_name: z.string().min(1, 'Company name is required').max(200, 'Company name is too long'),
  company_logo: z.string().url('Invalid logo URL').optional().or(z.literal('')),
  job_title: z.string().min(1, 'Job title is required').max(200, 'Job title is too long'),
  location: z.string().max(200, 'Location is too long').optional(),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().optional().nullable(),
  is_current: z.boolean().optional(),
  description: z.string().max(2000, 'Description is too long').optional(),
})

export const updateUserExperienceSchema = userExperienceSchema.partial()

// User education schema
export const userEducationSchema = z.object({
  institution: z.string().min(1, 'Institution is required').max(200, 'Institution name is too long'),
  degree: z.string().min(1, 'Degree is required').max(100, 'Degree is too long'),
  field_of_study: z.string().max(200, 'Field of study is too long').optional(),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().optional().nullable(),
  is_current: z.boolean().optional(),
  description: z.string().max(2000, 'Description is too long').optional(),
})

export const updateUserEducationSchema = userEducationSchema.partial()

// Saved job schema
export const savedJobSchema = z.object({
  job_post_id: z.string().uuid('Invalid job post ID'),
})

export const publicPostSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500, 'Title is too long'),
  content: z.string().min(1, 'Content is required'),
  excerpt: z.string().max(1000, 'Excerpt is too long').optional(),
  slug: z.string().min(1, 'Slug is required').max(200, 'Slug is too long'),
  featuredImage: z.string().url('Invalid image URL').optional().or(z.literal('')),
  publishDate: z.string().optional(),
  status: z.enum(['draft', 'published', 'scheduled']).optional(),
  seo: z.object({
    title: z.string().max(200, 'SEO title is too long').optional(),
    metaDescription: z.string().max(500, 'Meta description is too long').optional(),
    focusKeyword: z.string().max(100, 'Focus keyword is too long').optional(),
  }).optional(),
  categories: z.array(z.string().uuid()).optional(),
  tags: z.array(z.string().uuid()).optional(),
})

export const pageSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500, 'Title is too long'),
  content: z.string().min(1, 'Content is required'),
  excerpt: z.string().max(1000, 'Excerpt is too long').optional(),
  slug: z.string().max(200, 'Slug is too long').regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase and use hyphens').optional(),
  featuredImage: z.string().url('Invalid image URL').optional().or(z.literal('')),
  publishDate: z.string().datetime('Invalid date format').optional(),
  status: z.enum(['draft', 'published', 'scheduled']).optional(),
  seo: z.object({
    title: z.string().max(200, 'SEO title is too long').optional(),
    metaDescription: z.string().max(500, 'Meta description is too long').optional(),
    focusKeyword: z.string().max(100, 'Focus keyword is too long').optional(),
  }).optional(),
  categories: z.array(z.string().uuid('Invalid category ID')).optional(),
  tags: z.array(z.string().uuid('Invalid tag ID')).optional(),
  template: z.string().max(50, 'Template name is too long').optional(),
  parentPageId: z.string().uuid('Invalid parent page ID').optional().nullable(),
  menuOrder: z.number().int().min(0).optional(),
})

export const updatePageSchema = pageSchema.partial()

// Job post create schema (used by POST handlers)
export const jobPostSchema = z.object({
  title: z.string().min(1, "Title is required").max(500, "Title must not exceed 500 characters"),
  content: z.string().min(1, "Content is required"),
  excerpt: z.string().max(1000, "Excerpt must not exceed 1000 characters").optional(),
  slug: z.string().max(200, "Slug must not exceed 200 characters").optional().or(z.literal("")),
  featured_image: z.string().url("Featured image must be a valid URL").optional().or(z.literal("")),
  publish_date: z.string().datetime("Publish date must be a valid ISO datetime").optional().or(z.literal("")),
  status: z.enum(['draft', 'published', 'scheduled'], {
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
}).refine((data) => {
  if (data.job_salary_min !== undefined && data.job_salary_max !== undefined &&
      data.job_salary_min !== null && data.job_salary_max !== null) {
    return data.job_salary_max > data.job_salary_min;
  }
  return true;
}, {
  message: "Maximum salary must be greater than minimum salary",
  path: ["job_salary_max"]
})

// Job post update schema (used by PUT handlers — all fields optional)
export const updateJobPostSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  content: z.string().min(1).optional(),
  excerpt: z.string().max(1000).optional(),
  slug: z.string().max(200).optional().or(z.literal("")),
  featured_image: z.string().optional(),
  publish_date: z.string().optional(),
  status: z.enum(['draft', 'published', 'scheduled']).optional(),
  seo_title: z.string().max(200).optional(),
  meta_description: z.string().max(500).optional(),
  focus_keyword: z.string().max(100).optional(),
  // Job-specific fields
  job_company_name: z.string().max(200).optional(),
  job_company_logo: z.string().max(500).optional(),
  job_company_website: z.string().url("Company website must be a valid URL").max(500).optional().or(z.literal("")),
  job_employment_type_id: z.string().uuid().optional().nullable(),
  job_experience_level_id: z.string().uuid().optional().nullable(),
  job_education_level_id: z.string().uuid().optional().nullable(),
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
  job_application_email: z.string().email("Application email must be a valid email address").max(200).optional().nullable().or(z.literal("")),
  job_application_url: z.string().url("Application URL must be a valid URL").max(500).optional().nullable().or(z.literal("")),
  job_application_deadline: z.string().optional().nullable(),
  job_skills: z.union([z.array(z.string()), z.string()]).optional(),
  job_benefits: z.union([z.array(z.string()), z.string()]).optional(),
  job_requirements: z.string().optional().nullable(),
  job_responsibilities: z.string().optional().nullable(),
  // Relations - can be UUIDs, names, or comma-separated strings
  job_categories: z.union([z.array(z.string()), z.string()]).optional(),
  job_tags: z.union([z.array(z.string()), z.string()]).optional()
})
