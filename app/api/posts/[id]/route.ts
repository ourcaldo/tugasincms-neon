import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { deleteCachedData } from '@/lib/cache'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: post, error } = await supabase
      .from('posts')
      .select(`
        *,
        categories:post_categories(category:categories(*)),
        tags:post_tags(tag:tags(*))
      `)
      .eq('id', params.id)
      .single()
    
    if (error) throw error
    if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    
    const postWithRelations = {
      id: post.id,
      title: post.title,
      content: post.content,
      excerpt: post.excerpt,
      slug: post.slug,
      featuredImage: post.featured_image,
      publishDate: post.publish_date,
      status: post.status,
      authorId: post.author_id,
      createdAt: post.created_at,
      updatedAt: post.updated_at,
      seo: {
        title: post.seo_title,
        metaDescription: post.meta_description,
        focusKeyword: post.focus_keyword,
        slug: post.slug,
      },
      categories: post.categories?.map((pc: any) => pc.category).filter(Boolean) || [],
      tags: post.tags?.map((pt: any) => pt.tag).filter(Boolean) || [],
    }
    
    return NextResponse.json(postWithRelations)
  } catch (error) {
    console.error('Error fetching post:', error)
    return NextResponse.json({ error: 'Failed to fetch post' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { title, content, excerpt, slug, featuredImage, publishDate, status, seo, categories, tags } = body
    
    const { data: updatedPost, error } = await supabase
      .from('posts')
      .update({
        title,
        content,
        excerpt,
        slug,
        featured_image: featuredImage,
        publish_date: publishDate,
        status,
        seo_title: seo?.title,
        meta_description: seo?.metaDescription,
        focus_keyword: seo?.focusKeyword,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single()
    
    if (error) throw error
    
    await supabase.from('post_categories').delete().eq('post_id', params.id)
    await supabase.from('post_tags').delete().eq('post_id', params.id)
    
    if (categories && categories.length > 0) {
      const categoryInserts = categories.map((catId: string) => ({
        post_id: params.id,
        category_id: catId,
      }))
      await supabase.from('post_categories').insert(categoryInserts)
    }
    
    if (tags && tags.length > 0) {
      const tagInserts = tags.map((tagId: string) => ({
        post_id: params.id,
        tag_id: tagId,
      }))
      await supabase.from('post_tags').insert(tagInserts)
    }
    
    await deleteCachedData('api:public:posts:*')
    
    return NextResponse.json({
      id: updatedPost.id,
      title: updatedPost.title,
      content: updatedPost.content,
      excerpt: updatedPost.excerpt,
      slug: updatedPost.slug,
      featuredImage: updatedPost.featured_image,
      publishDate: updatedPost.publish_date,
      status: updatedPost.status,
      authorId: updatedPost.author_id,
      createdAt: updatedPost.created_at,
      updatedAt: updatedPost.updated_at,
      seo: {
        title: updatedPost.seo_title,
        metaDescription: updatedPost.meta_description,
        focusKeyword: updatedPost.focus_keyword,
        slug: updatedPost.slug,
      },
      categories: categories || [],
      tags: tags || [],
    })
  } catch (error) {
    console.error('Error updating post:', error)
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', params.id)
    
    if (error) throw error
    
    await deleteCachedData('api:public:posts:*')
    
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error deleting post:', error)
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 })
  }
}
