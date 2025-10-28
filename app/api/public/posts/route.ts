import { NextRequest } from 'next/server'
import { sql } from '@/lib/database'
import { getCachedData, setCachedData, deleteCachedData } from '@/lib/cache'
import { verifyApiToken, extractBearerToken } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse, validationErrorResponse } from '@/lib/response'
import { mapPostsFromDB } from '@/lib/post-mapper'
import { setCorsHeaders, handleCorsPreflightRequest } from '@/lib/cors'
import { publicPostSchema } from '@/lib/validation'

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
    
    const cacheKey = 'api:public:posts:all'
    
    const cachedPosts = await getCachedData(cacheKey)
    if (cachedPosts) {
      return setCorsHeaders(successResponse(cachedPosts, true), origin)
    }
    
    const publishedPosts = await sql`
      SELECT 
        p.*,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('id', c.id, 'name', c.name, 'slug', c.slug, 'description', c.description))
          FILTER (WHERE c.id IS NOT NULL),
          '[]'::json
        ) as categories,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('id', t.id, 'name', t.name, 'slug', t.slug))
          FILTER (WHERE t.id IS NOT NULL),
          '[]'::json
        ) as tags
      FROM posts p
      LEFT JOIN post_categories pc ON p.id = pc.post_id
      LEFT JOIN categories c ON pc.category_id = c.id
      LEFT JOIN post_tags pt ON p.id = pt.post_id
      LEFT JOIN tags t ON pt.tag_id = t.id
      WHERE p.status = 'published'
        AND p.post_type = 'post'
      GROUP BY p.id
      ORDER BY p.publish_date DESC
    `
    
    const postsWithRelations = mapPostsFromDB(publishedPosts as any || [])
    
    await setCachedData(cacheKey, postsWithRelations, 3600)
    
    return setCorsHeaders(successResponse(postsWithRelations, false), origin)
  } catch (error) {
    console.error('Error fetching published posts:', error)
    return setCorsHeaders(errorResponse('Failed to fetch posts'), origin)
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
    
    const body = await request.json()
    
    const validation = publicPostSchema.safeParse(body)
    if (!validation.success) {
      return setCorsHeaders(
        validationErrorResponse(validation.error.issues[0].message),
        origin
      )
    }
    
    const { title, content, excerpt, slug, featuredImage, publishDate, status, seo, categories, tags } = validation.data
    
    const postPublishDate = publishDate || new Date().toISOString()
    const isFutureDate = new Date(postPublishDate) > new Date()
    
    let postStatus = status
    if (!postStatus) {
      postStatus = isFutureDate ? 'scheduled' : 'draft'
    } else if (postStatus === 'scheduled' && !isFutureDate) {
      postStatus = 'published'
    }
    
    const newPostResult = await sql`
      INSERT INTO posts (
        title, content, excerpt, slug, featured_image, publish_date, status, author_id,
        seo_title, meta_description, focus_keyword
      )
      VALUES (
        ${title}, ${content}, ${excerpt || null}, ${slug}, ${featuredImage || null},
        ${postPublishDate}, ${postStatus}, ${validToken.user_id},
        ${seo?.title || null}, ${seo?.metaDescription || null}, ${seo?.focusKeyword || null}
      )
      RETURNING *
    `
    
    const newPost = newPostResult[0]
    
    const categoryIds: string[] = []
    
    if (categories && typeof categories === 'string' && categories.trim()) {
      const categoryNames = categories.split(',').map((name: string) => name.trim()).filter(Boolean)
      
      for (const categoryName of categoryNames) {
        const existingCategory = await sql`
          SELECT id FROM categories WHERE name = ${categoryName}
        `
        
        if (existingCategory.length > 0) {
          categoryIds.push(existingCategory[0].id)
        } else {
          const newCategory = await sql`
            INSERT INTO categories (name, slug)
            VALUES (${categoryName}, ${categoryName.toLowerCase().replace(/\s+/g, '-')})
            RETURNING id
          `
          
          if (newCategory.length > 0) {
            categoryIds.push(newCategory[0].id)
          }
        }
      }
      
      if (categoryIds.length > 0) {
        for (const catId of categoryIds) {
          await sql`INSERT INTO post_categories (post_id, category_id) VALUES (${newPost.id}, ${catId})`
        }
      }
    }
    
    if (tags && typeof tags === 'string' && tags.trim()) {
      const tagNames = tags.split(',').map((name: string) => name.trim()).filter(Boolean)
      const tagIds = []
      
      for (const tagName of tagNames) {
        const existingTag = await sql`
          SELECT id FROM tags WHERE name = ${tagName}
        `
        
        if (existingTag.length > 0) {
          tagIds.push(existingTag[0].id)
        } else {
          const newTag = await sql`
            INSERT INTO tags (name, slug)
            VALUES (${tagName}, ${tagName.toLowerCase().replace(/\s+/g, '-')})
            RETURNING id
          `
          
          if (newTag.length > 0) {
            tagIds.push(newTag[0].id)
          }
        }
      }
      
      if (tagIds.length > 0) {
        for (const tagId of tagIds) {
          await sql`INSERT INTO post_tags (post_id, tag_id) VALUES (${newPost.id}, ${tagId})`
        }
      }
    }
    
    await deleteCachedData('api:public:posts:*')
    await deleteCachedData('api:posts:*')
    
    const sitemapHost = process.env.SITEMAP_HOST || process.env.NEXT_PUBLIC_SITEMAP_HOST || 'localhost:5000'
    
    let postUrl = `https://${sitemapHost}/${newPost.slug}`
    
    if (categoryIds.length > 0) {
      const firstCategory = await sql`
        SELECT slug FROM categories WHERE id = ${categoryIds[0]}
      `
      
      if (firstCategory.length > 0 && firstCategory[0].slug) {
        postUrl = `https://${sitemapHost}/${firstCategory[0].slug}/${newPost.slug}`
      }
    }
    
    const responseData = {
      ...newPost,
      postUrl
    }
    
    return setCorsHeaders(successResponse(responseData, false, 201), origin)
  } catch (error) {
    console.error('Error creating post:', error)
    return setCorsHeaders(errorResponse('Failed to create post'), origin)
  }
}
