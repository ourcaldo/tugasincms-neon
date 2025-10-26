import { NextRequest } from 'next/server'
import { sql } from '@/lib/database'
import { getUserIdFromClerk } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse, validationErrorResponse } from '@/lib/response'
import { mapPagesFromDB, mapPageFromDB } from '@/lib/page-mapper'
import { getCachedData, setCachedData, deleteCachedData } from '@/lib/cache'
import { pageSchema } from '@/lib/validation'
import { invalidateSitemaps } from '@/lib/sitemap'

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
    const category = searchParams.get('category') || ''
    
    const offset = (page - 1) * limit
    
    const cacheKey = `api:pages:user:${userId}:page:${page}:limit:${limit}:search:${search}:status:${status}:category:${category}`
    
    const cachedData = await getCachedData(cacheKey)
    if (cachedData) {
      return successResponse(cachedData, true)
    }
    
    let countQuery, pagesQuery
    
    if (category && search && status) {
      countQuery = sql`
        SELECT COUNT(DISTINCT p.id)::int as count
        FROM pages p
        WHERE p.author_id = ${userId}
          AND p.title ILIKE ${`%${search}%`}
          AND p.status = ${status}
          AND EXISTS (SELECT 1 FROM page_categories WHERE page_id = p.id AND category_id = ${category})
      `
      pagesQuery = sql`
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
        FROM pages p
        LEFT JOIN page_categories pc ON p.id = pc.page_id
        LEFT JOIN categories c ON pc.category_id = c.id
        LEFT JOIN page_tags pt ON p.id = pt.page_id
        LEFT JOIN tags t ON pt.tag_id = t.id
        WHERE p.author_id = ${userId}
          AND p.title ILIKE ${`%${search}%`}
          AND p.status = ${status}
          AND EXISTS (SELECT 1 FROM page_categories WHERE page_id = p.id AND category_id = ${category})
        GROUP BY p.id
        ORDER BY p.menu_order ASC, p.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else if (category && search) {
      countQuery = sql`
        SELECT COUNT(DISTINCT p.id)::int as count
        FROM pages p
        WHERE p.author_id = ${userId}
          AND p.title ILIKE ${`%${search}%`}
          AND EXISTS (SELECT 1 FROM page_categories WHERE page_id = p.id AND category_id = ${category})
      `
      pagesQuery = sql`
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
        FROM pages p
        LEFT JOIN page_categories pc ON p.id = pc.page_id
        LEFT JOIN categories c ON pc.category_id = c.id
        LEFT JOIN page_tags pt ON p.id = pt.page_id
        LEFT JOIN tags t ON pt.tag_id = t.id
        WHERE p.author_id = ${userId}
          AND p.title ILIKE ${`%${search}%`}
          AND EXISTS (SELECT 1 FROM page_categories WHERE page_id = p.id AND category_id = ${category})
        GROUP BY p.id
        ORDER BY p.menu_order ASC, p.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else if (category && status) {
      countQuery = sql`
        SELECT COUNT(DISTINCT p.id)::int as count
        FROM pages p
        WHERE p.author_id = ${userId}
          AND p.status = ${status}
          AND EXISTS (SELECT 1 FROM page_categories WHERE page_id = p.id AND category_id = ${category})
      `
      pagesQuery = sql`
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
        FROM pages p
        LEFT JOIN page_categories pc ON p.id = pc.page_id
        LEFT JOIN categories c ON pc.category_id = c.id
        LEFT JOIN page_tags pt ON p.id = pt.page_id
        LEFT JOIN tags t ON pt.tag_id = t.id
        WHERE p.author_id = ${userId}
          AND p.status = ${status}
          AND EXISTS (SELECT 1 FROM page_categories WHERE page_id = p.id AND category_id = ${category})
        GROUP BY p.id
        ORDER BY p.menu_order ASC, p.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else if (search && status) {
      countQuery = sql`
        SELECT COUNT(DISTINCT p.id)::int as count
        FROM pages p
        WHERE p.author_id = ${userId}
          AND p.title ILIKE ${`%${search}%`}
          AND p.status = ${status}
      `
      pagesQuery = sql`
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
        FROM pages p
        LEFT JOIN page_categories pc ON p.id = pc.page_id
        LEFT JOIN categories c ON pc.category_id = c.id
        LEFT JOIN page_tags pt ON p.id = pt.page_id
        LEFT JOIN tags t ON pt.tag_id = t.id
        WHERE p.author_id = ${userId}
          AND p.title ILIKE ${`%${search}%`}
          AND p.status = ${status}
        GROUP BY p.id
        ORDER BY p.menu_order ASC, p.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else if (category) {
      countQuery = sql`
        SELECT COUNT(DISTINCT p.id)::int as count
        FROM pages p
        WHERE p.author_id = ${userId}
          AND EXISTS (SELECT 1 FROM page_categories WHERE page_id = p.id AND category_id = ${category})
      `
      pagesQuery = sql`
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
        FROM pages p
        LEFT JOIN page_categories pc ON p.id = pc.page_id
        LEFT JOIN categories c ON pc.category_id = c.id
        LEFT JOIN page_tags pt ON p.id = pt.page_id
        LEFT JOIN tags t ON pt.tag_id = t.id
        WHERE p.author_id = ${userId}
          AND EXISTS (SELECT 1 FROM page_categories WHERE page_id = p.id AND category_id = ${category})
        GROUP BY p.id
        ORDER BY p.menu_order ASC, p.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else if (search) {
      countQuery = sql`
        SELECT COUNT(DISTINCT p.id)::int as count
        FROM pages p
        WHERE p.author_id = ${userId}
          AND p.title ILIKE ${`%${search}%`}
      `
      pagesQuery = sql`
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
        FROM pages p
        LEFT JOIN page_categories pc ON p.id = pc.page_id
        LEFT JOIN categories c ON pc.category_id = c.id
        LEFT JOIN page_tags pt ON p.id = pt.page_id
        LEFT JOIN tags t ON pt.tag_id = t.id
        WHERE p.author_id = ${userId}
          AND p.title ILIKE ${`%${search}%`}
        GROUP BY p.id
        ORDER BY p.menu_order ASC, p.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else if (status) {
      countQuery = sql`
        SELECT COUNT(DISTINCT p.id)::int as count
        FROM pages p
        WHERE p.author_id = ${userId}
          AND p.status = ${status}
      `
      pagesQuery = sql`
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
        FROM pages p
        LEFT JOIN page_categories pc ON p.id = pc.page_id
        LEFT JOIN categories c ON pc.category_id = c.id
        LEFT JOIN page_tags pt ON p.id = pt.page_id
        LEFT JOIN tags t ON pt.tag_id = t.id
        WHERE p.author_id = ${userId}
          AND p.status = ${status}
        GROUP BY p.id
        ORDER BY p.menu_order ASC, p.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else {
      countQuery = sql`
        SELECT COUNT(DISTINCT p.id)::int as count
        FROM pages p
        WHERE p.author_id = ${userId}
      `
      pagesQuery = sql`
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
        FROM pages p
        LEFT JOIN page_categories pc ON p.id = pc.page_id
        LEFT JOIN categories c ON pc.category_id = c.id
        LEFT JOIN page_tags pt ON p.id = pt.page_id
        LEFT JOIN tags t ON pt.tag_id = t.id
        WHERE p.author_id = ${userId}
        GROUP BY p.id
        ORDER BY p.menu_order ASC, p.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    }
    
    const countResult = await countQuery
    const total = countResult[0].count
    
    const pages = await pagesQuery
    
    const pagesWithRelations = mapPagesFromDB((pages || []) as any)
    
    const responseData = {
      pages: pagesWithRelations,
      total,
      page,
      limit
    }
    
    await setCachedData(cacheKey, responseData, 300)
    
    return successResponse(responseData, false)
  } catch (error) {
    console.error('Error fetching pages:', error)
    return errorResponse('Failed to fetch pages')
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromClerk()
    if (!userId) {
      return unauthorizedResponse('You must be logged in')
    }
    
    const body = await request.json()
    
    const validation = pageSchema.safeParse(body)
    if (!validation.success) {
      return validationErrorResponse(validation.error.issues[0].message)
    }
    
    const { title, content, excerpt, slug, featuredImage, publishDate, status, seo, categories, tags, template, parentPageId, menuOrder } = validation.data
    
    const pageResult = await sql`
      INSERT INTO pages (
        title, content, excerpt, slug, featured_image, publish_date, status, author_id,
        seo_title, meta_description, focus_keyword, template, parent_page_id, menu_order
      )
      VALUES (
        ${title}, ${content}, ${excerpt || null}, ${slug}, ${featuredImage || null},
        ${publishDate || new Date().toISOString()}, ${status || 'draft'}, ${userId},
        ${seo?.title || null}, ${seo?.metaDescription || null}, ${seo?.focusKeyword || null},
        ${template || 'default'}, ${parentPageId || null}, ${menuOrder || 0}
      )
      RETURNING *
    `
    
    const newPage = pageResult[0]
    
    if (categories && categories.length > 0) {
      for (const catId of categories) {
        await sql`INSERT INTO page_categories (page_id, category_id) VALUES (${newPage.id}, ${catId})`
      }
    }
    
    if (tags && tags.length > 0) {
      for (const tagId of tags) {
        await sql`INSERT INTO page_tags (page_id, tag_id) VALUES (${newPage.id}, ${tagId})`
      }
    }
    
    await deleteCachedData(`api:pages:user:${userId}`)
    await deleteCachedData('api:v1:pages:*')
    
    if (status === 'published') {
      await invalidateSitemaps()
    }
    
    const fullPage = await sql`
      SELECT 
        p.*,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('id', c.id, 'name', c.name, 'slug', c.slug))
          FILTER (WHERE c.id IS NOT NULL),
          '[]'::json
        ) as categories,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('id', t.id, 'name', t.name, 'slug', t.slug))
          FILTER (WHERE t.id IS NOT NULL),
          '[]'::json
        ) as tags
      FROM pages p
      LEFT JOIN page_categories pc ON p.id = pc.page_id
      LEFT JOIN categories c ON pc.category_id = c.id
      LEFT JOIN page_tags pt ON p.id = pt.page_id
      LEFT JOIN tags t ON pt.tag_id = t.id
      WHERE p.id = ${newPage.id}
      GROUP BY p.id
    `
    
    return successResponse(mapPageFromDB(fullPage[0] as any), false, 201)
  } catch (error) {
    console.error('Error creating page:', error)
    return errorResponse('Failed to create page')
  }
}
