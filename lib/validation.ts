import { z } from 'zod'

export const postSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500, 'Title is too long'),
  content: z.string().min(1, 'Content is required'),
  excerpt: z.string().max(1000, 'Excerpt is too long').optional(),
  slug: z.string().max(200, 'Slug is too long').regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase and use hyphens').optional(),
  featuredImage: z.string().optional(),
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
})

export const publicPostSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500, 'Title is too long'),
  content: z.string().min(1, 'Content is required'),
  excerpt: z.string().max(1000, 'Excerpt is too long').optional(),
  slug: z.string().min(1, 'Slug is required').max(200, 'Slug is too long'),
  featuredImage: z.string().optional(),
  publishDate: z.string().optional(),
  status: z.enum(['draft', 'published', 'scheduled']).optional(),
  seo: z.object({
    title: z.string().max(200, 'SEO title is too long').optional(),
    metaDescription: z.string().max(500, 'Meta description is too long').optional(),
    focusKeyword: z.string().max(100, 'Focus keyword is too long').optional(),
  }).optional(),
  categories: z.string().optional(),
  tags: z.string().optional(),
})

export const pageSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500, 'Title is too long'),
  content: z.string().min(1, 'Content is required'),
  excerpt: z.string().max(1000, 'Excerpt is too long').optional(),
  slug: z.string().max(200, 'Slug is too long').regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase and use hyphens').optional(),
  featuredImage: z.string().optional(),
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
