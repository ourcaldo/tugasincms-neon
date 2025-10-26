export interface PostFromDB {
  id: string
  title: string
  content: string
  excerpt: string | null
  slug: string
  featured_image: string | null
  publish_date: string
  status: string
  author_id: string
  created_at: string
  updated_at: string
  seo_title: string | null
  meta_description: string | null
  focus_keyword: string | null
  categories?: any[]
  tags?: any[]
}

export interface MappedPost {
  id: string
  title: string
  content: string
  excerpt?: string
  slug: string
  featuredImage?: string
  publishDate: string
  status: string
  authorId: string
  createdAt: string
  updatedAt: string
  seo: {
    title?: string
    metaDescription?: string
    focusKeyword?: string
    slug: string
  }
  categories: any[]
  tags: any[]
}

export function mapPostFromDB(post: PostFromDB): MappedPost {
  return {
    id: post.id,
    title: post.title,
    content: post.content,
    excerpt: post.excerpt || undefined,
    slug: post.slug,
    featuredImage: post.featured_image || undefined,
    publishDate: post.publish_date,
    status: post.status,
    authorId: post.author_id,
    createdAt: post.created_at,
    updatedAt: post.updated_at,
    seo: {
      title: post.seo_title || undefined,
      metaDescription: post.meta_description || undefined,
      focusKeyword: post.focus_keyword || undefined,
      slug: post.slug,
    },
    categories: Array.isArray(post.categories) ? post.categories.filter(Boolean) : [],
    tags: Array.isArray(post.tags) ? post.tags.filter(Boolean) : [],
  }
}

export function mapPostsFromDB(posts: PostFromDB[]): MappedPost[] {
  return posts.map(mapPostFromDB)
}
