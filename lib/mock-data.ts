import { Post, Category, Tag, APIToken } from '../types';

export const mockCategories: Category[] = [
  {
    id: '1',
    name: 'Technology',
    slug: 'technology',
    description: 'Latest tech news and tutorials',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: '2',
    name: 'Design',
    slug: 'design',
    description: 'UI/UX and design trends',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: '3',
    name: 'Business',
    slug: 'business',
    description: 'Business strategies and insights',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
];

export const mockTags: Tag[] = [
  {
    id: '1',
    name: 'React',
    slug: 'react',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: '2',
    name: 'TypeScript',
    slug: 'typescript',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: '3',
    name: 'CSS',
    slug: 'css',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: '4',
    name: 'JavaScript',
    slug: 'javascript',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
];

export const mockPosts: Post[] = [
  {
    id: '1',
    title: 'Getting Started with React and TypeScript',
    content: '<p>This is a comprehensive guide to building modern web applications with React and TypeScript...</p>',
    excerpt: 'Learn how to build type-safe React applications with TypeScript in this comprehensive guide.',
    slug: 'getting-started-react-typescript',
    featuredImage: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&h=400&fit=crop',
    publishDate: new Date('2024-01-15'),
    status: 'published',
    categories: [mockCategories[0]],
    tags: [mockTags[0], mockTags[1]],
    seo: {
      title: 'Getting Started with React and TypeScript - Complete Guide',
      metaDescription: 'Learn how to build type-safe React applications with TypeScript in this comprehensive guide.',
      focusKeyword: 'react typescript',
      slug: 'getting-started-react-typescript',
    },
    authorId: 'user_1',
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: '2',
    title: 'Modern CSS Techniques for 2024',
    content: '<p>Explore the latest CSS features and techniques that will make your websites stand out...</p>',
    excerpt: 'Discover the cutting-edge CSS techniques that will revolutionize your web design workflow.',
    slug: 'modern-css-techniques-2024',
    featuredImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=400&fit=crop',
    publishDate: new Date('2024-02-01'),
    status: 'scheduled',
    categories: [mockCategories[1]],
    tags: [mockTags[2]],
    seo: {
      title: 'Modern CSS Techniques for 2024 - Design Trends',
      metaDescription: 'Discover the cutting-edge CSS techniques that will revolutionize your web design workflow.',
      focusKeyword: 'modern css',
      slug: 'modern-css-techniques-2024',
    },
    authorId: 'user_1',
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-25'),
  },
  {
    id: '3',
    title: 'Building Scalable Business Applications',
    content: '<p>Draft content for business application development strategies...</p>',
    excerpt: 'Learn the key principles for building applications that scale with your business.',
    slug: 'building-scalable-business-applications',
    publishDate: new Date('2024-01-05'),
    status: 'draft',
    categories: [mockCategories[2]],
    tags: [mockTags[3]],
    seo: {
      title: 'Building Scalable Business Applications',
      metaDescription: 'Learn the key principles for building applications that scale with your business.',
      focusKeyword: 'scalable applications',
      slug: 'building-scalable-business-applications',
    },
    authorId: 'user_1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-05'),
  },
];

export const mockApiTokens: APIToken[] = [
  {
    id: '1',
    name: 'Production API',
    token: 'tk_prod_1234567890abcdef',
    userId: 'user_1',
    lastUsed: new Date('2024-01-20'),
    createdAt: new Date('2024-01-01'),
  },
  {
    id: '2',
    name: 'Development API',
    token: 'tk_dev_0987654321fedcba',
    userId: 'user_1',
    createdAt: new Date('2024-01-15'),
  },
];