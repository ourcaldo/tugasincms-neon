import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/database'
import { getUserIdFromClerk } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse, validationErrorResponse, notFoundResponse } from '@/lib/response'
import { mapPageFromDB } from '@/lib/page-mapper'
import { deleteCachedData } from '@/lib/cache'
import { updatePageSchema } from '@/lib/validation'
import { invalidateSitemaps } from '@/lib/sitemap'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromClerk()
    if (!userId) {
      return unauthorizedResponse('You must be logged in')
    }
    
    const { id } = await params
    
    const pageResult = await sql`
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
      WHERE p.id = ${id} AND p.author_id = ${userId}
      GROUP BY p.id
    `
    
    if (pageResult.length === 0) {
      return notFoundResponse('Page not found')
    }
    
    return successResponse(mapPageFromDB(pageResult[0] as any))
  } catch (error) {
    console.error('Error fetching page:', error)
    return errorResponse('Failed to fetch page')
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromClerk()
    if (!userId) {
      return unauthorizedResponse('You must be logged in')
    }
    
    const { id } = await params
    const body = await request.json()
    
    const validation = updatePageSchema.safeParse(body)
    if (!validation.success) {
      return validationErrorResponse(validation.error.issues[0].message)
    }
    
    const existingPage = await sql`
      SELECT * FROM pages WHERE id = ${id} AND author_id = ${userId}
    `
    
    if (existingPage.length === 0) {
      return notFoundResponse('Page not found')
    }
    
    const { title, content, excerpt, slug, featuredImage, publishDate, status, seo, categories, tags, template, parentPageId, menuOrder } = validation.data
    
    const updateFields: any = {}
    if (title !== undefined) updateFields.title = title
    if (content !== undefined) updateFields.content = content
    if (excerpt !== undefined) updateFields.excerpt = excerpt
    if (slug !== undefined) updateFields.slug = slug
    if (featuredImage !== undefined) updateFields.featured_image = featuredImage
    if (publishDate !== undefined) updateFields.publish_date = publishDate
    if (status !== undefined) updateFields.status = status
    if (seo?.title !== undefined) updateFields.seo_title = seo.title
    if (seo?.metaDescription !== undefined) updateFields.meta_description = seo.metaDescription
    if (seo?.focusKeyword !== undefined) updateFields.focus_keyword = seo.focusKeyword
    if (template !== undefined) updateFields.template = template
    if (parentPageId !== undefined) updateFields.parent_page_id = parentPageId
    if (menuOrder !== undefined) updateFields.menu_order = menuOrder
    
    if (Object.keys(updateFields).length > 0) {
      const setClauses = Object.keys(updateFields)
        .map((key) => `${key} = $${Object.keys(updateFields).indexOf(key) + 1}`)
        .join(', ')
      
      const values = Object.values(updateFields)
      values.push(id)
      
      await sql.unsafe(`UPDATE pages SET ${setClauses} WHERE id = $${values.length}`, values)
    }
    
    if (categories !== undefined) {
      await sql`DELETE FROM page_categories WHERE page_id = ${id}`
      if (categories.length > 0) {
        for (const catId of categories) {
          await sql`INSERT INTO page_categories (page_id, category_id) VALUES (${id}, ${catId})`
        }
      }
    }
    
    if (tags !== undefined) {
      await sql`DELETE FROM page_tags WHERE page_id = ${id}`
      if (tags.length > 0) {
        for (const tagId of tags) {
          await sql`INSERT INTO page_tags (page_id, tag_id) VALUES (${id}, ${tagId})`
        }
      }
    }
    
    await deleteCachedData(`api:pages:user:${userId}`)
    await deleteCachedData('api:v1:pages:*')
    
    const oldStatus = existingPage[0].status
    const newStatus = status || oldStatus
    
    if ((oldStatus !== 'published' && newStatus === 'published') || (oldStatus === 'published' && newStatus !== 'published')) {
      await invalidateSitemaps()
    }
    
    const updatedPage = await sql`
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
      WHERE p.id = ${id}
      GROUP BY p.id
    `
    
    return successResponse(mapPageFromDB(updatedPage[0] as any))
  } catch (error) {
    console.error('Error updating page:', error)
    return errorResponse('Failed to update page')
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserIdFromClerk()
    if (!userId) {
      return unauthorizedResponse('You must be logged in')
    }
    
    const { id } = params
    
    const existingPage = await sql`
      SELECT * FROM pages WHERE id = ${id} AND author_id = ${userId}
    `
    
    if (existingPage.length === 0) {
      return notFoundResponse('Page not found')
    }
    
    await sql`DELETE FROM pages WHERE id = ${id}`
    
    await deleteCachedData(`api:pages:user:${userId}`)
    await deleteCachedData('api:v1:pages:*')
    
    if (existingPage[0].status === 'published') {
      await invalidateSitemaps()
    }
    
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error deleting page:', error)
    return errorResponse('Failed to delete page')
  }
}
