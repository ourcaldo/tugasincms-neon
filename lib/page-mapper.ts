export interface PageFromDB {
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
  template: string | null
  parent_page_id: string | null
  menu_order: number | null
  categories?: any[]
  tags?: any[]
}

export interface MappedPage {
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
  template?: string
  parentPageId?: string
  menuOrder?: number
}

export function mapPageFromDB(page: PageFromDB): MappedPage {
  return {
    id: page.id,
    title: page.title,
    content: page.content,
    excerpt: page.excerpt || undefined,
    slug: page.slug,
    featuredImage: page.featured_image || undefined,
    publishDate: page.publish_date,
    status: page.status,
    authorId: page.author_id,
    createdAt: page.created_at,
    updatedAt: page.updated_at,
    seo: {
      title: page.seo_title || undefined,
      metaDescription: page.meta_description || undefined,
      focusKeyword: page.focus_keyword || undefined,
      slug: page.slug,
    },
    categories: Array.isArray(page.categories) ? page.categories.filter(Boolean) : [],
    tags: Array.isArray(page.tags) ? page.tags.filter(Boolean) : [],
    template: page.template || undefined,
    parentPageId: page.parent_page_id || undefined,
    menuOrder: page.menu_order !== null ? page.menu_order : undefined,
  }
}

export function mapPagesFromDB(pages: PageFromDB[]): MappedPage[] {
  return pages.map(mapPageFromDB)
}
