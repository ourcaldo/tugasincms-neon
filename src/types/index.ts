export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SEO {
  title?: string;
  metaDescription?: string;
  focusKeyword?: string;
  slug?: string;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  excerpt?: string;
  slug: string;
  featuredImage?: string;
  publishDate: Date;
  status: 'draft' | 'published' | 'scheduled';
  categories: Category[];
  tags: Tag[];
  seo: SEO;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface APIToken {
  id: string;
  name: string;
  token: string;
  lastUsed?: Date;
  createdAt: Date;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PostFilters {
  status?: 'draft' | 'published' | 'scheduled';
  category?: string;
  tag?: string;
  search?: string;
  page?: number;
  limit?: number;
}