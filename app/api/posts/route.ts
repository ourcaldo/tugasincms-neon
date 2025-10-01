import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { deleteCachedData } from '@/lib/cache'

export async function GET() {
  try {
    const { data: posts, error } = await supabase
      .from('posts')
      .select(`
        *,
        categories:post_categories(category:categories(*)),
        tags:post_tags(tag:tags(*))
      `)
    
    if (error) throw error
    
    const postsWithRelations = posts?.map(post => ({
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
    }))
    
    return NextResponse.json(postsWithRelations || [])
  } catch (error) {
    console.error('Error fetching posts:', error)
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, content, excerpt, slug, featuredImage, publishDate, status, authorId, seo, categories, tags } = body
    
    const { data: newPost, error } = await supabase
      .from('posts')
      .insert({
        title,
        content,
        excerpt,
        slug,
        featured_image: featuredImage,
        publish_date: publishDate,
        status,
        author_id: authorId,
        seo_title: seo?.title,
        meta_description: seo?.metaDescription,
        focus_keyword: seo?.focusKeyword,
      })
      .select()
      .single()
    
    if (error) throw error
    
    if (categories && categories.length > 0) {
      const categoryInserts = categories.map((catId: string) => ({
        post_id: newPost.id,
        category_id: catId,
      }))
      await supabase.from('post_categories').insert(categoryInserts)
    }
    
    if (tags && tags.length > 0) {
      const tagInserts = tags.map((tagId: string) => ({
        post_id: newPost.id,
        tag_id: tagId,
      }))
      await supabase.from('post_tags').insert(tagInserts)
    }
    
    await deleteCachedData('api:public:posts:*')
    
    return NextResponse.json({
      id: newPost.id,
      title: newPost.title,
      content: newPost.content,
      excerpt: newPost.excerpt,
      slug: newPost.slug,
      featuredImage: newPost.featured_image,
      publishDate: newPost.publish_date,
      status: newPost.status,
      authorId: newPost.author_id,
      createdAt: newPost.created_at,
      updatedAt: newPost.updated_at,
      seo: {
        title: newPost.seo_title,
        metaDescription: newPost.meta_description,
        focusKeyword: newPost.focus_keyword,
        slug: newPost.slug,
      },
      categories: categories || [],
      tags: tags || [],
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating post:', error)
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 })
  }
}
