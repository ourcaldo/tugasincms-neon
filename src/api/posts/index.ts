// Mock API endpoint for posts
// In a real implementation, this would be a server-side API

import { Post, PostFilters, ApiResponse } from '../../types';
import { mockPosts } from '../../lib/mock-data';

/**
 * GET /api/posts
 * Retrieve all posts with optional filtering
 * 
 * Query Parameters:
 * - status: filter by post status (draft, published, scheduled)
 * - category: filter by category ID
 * - tag: filter by tag ID
 * - search: search in title and excerpt
 * - page: pagination page number (default: 1)
 * - limit: posts per page (default: 10)
 * 
 * Headers:
 * - Authorization: Bearer <token>
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "posts": Post[],
 *     "total": number,
 *     "page": number,
 *     "limit": number
 *   }
 * }
 */
export async function getPosts(filters?: PostFilters): Promise<ApiResponse<{ posts: Post[]; total: number; page: number; limit: number }>> {
  try {
    let filteredPosts = [...mockPosts];

    // Apply filters
    if (filters?.status) {
      filteredPosts = filteredPosts.filter(post => post.status === filters.status);
    }

    if (filters?.category) {
      filteredPosts = filteredPosts.filter(post => 
        post.categories.some(cat => cat.id === filters.category)
      );
    }

    if (filters?.tag) {
      filteredPosts = filteredPosts.filter(post => 
        post.tags.some(tag => tag.id === filters.tag)
      );
    }

    if (filters?.search) {
      const searchTerm = filters.search.toLowerCase();
      filteredPosts = filteredPosts.filter(post => 
        post.title.toLowerCase().includes(searchTerm) ||
        (post.excerpt && post.excerpt.toLowerCase().includes(searchTerm))
      );
    }

    // Pagination
    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedPosts = filteredPosts.slice(startIndex, endIndex);

    return {
      success: true,
      data: {
        posts: paginatedPosts,
        total: filteredPosts.length,
        page,
        limit
      }
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to retrieve posts'
    };
  }
}

/**
 * POST /api/posts
 * Create a new post
 * 
 * Headers:
 * - Authorization: Bearer <token>
 * - Content-Type: application/json
 * 
 * Body:
 * {
 *   "title": string,
 *   "content": string,
 *   "excerpt": string,
 *   "slug": string,
 *   "featuredImage": string,
 *   "publishDate": string (ISO date),
 *   "status": "draft" | "published" | "scheduled",
 *   "categories": Category[],
 *   "tags": Tag[],
 *   "seo": SEO
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": Post
 * }
 */
export async function createPost(postData: Omit<Post, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Post>> {
  try {
    const newPost: Post = {
      id: `post_${Date.now()}`,
      ...postData,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // In a real implementation, this would save to the database
    console.log('Creating post:', newPost);

    return {
      success: true,
      data: newPost
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to create post'
    };
  }
}

/**
 * POST /api/posts/:id/publish
 * Publish a post
 * 
 * Headers:
 * - Authorization: Bearer <token>
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": Post
 * }
 */
export async function publishPost(postId: string): Promise<ApiResponse<Post>> {
  try {
    // In a real implementation, this would update the post in the database
    const post = mockPosts.find(p => p.id === postId);
    
    if (!post) {
      return {
        success: false,
        error: 'Post not found'
      };
    }

    const publishedPost: Post = {
      ...post,
      status: 'published',
      publishDate: new Date(),
      updatedAt: new Date()
    };

    console.log('Publishing post:', publishedPost);

    return {
      success: true,
      data: publishedPost
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to publish post'
    };
  }
}

/**
 * Example usage with fetch:
 * 
 * // Get all posts
 * const response = await fetch('/api/posts', {
 *   headers: {
 *     'Authorization': 'Bearer your-api-token'
 *   }
 * });
 * 
 * // Create a post
 * const response = await fetch('/api/posts', {
 *   method: 'POST',
 *   headers: {
 *     'Authorization': 'Bearer your-api-token',
 *     'Content-Type': 'application/json'
 *   },
 *   body: JSON.stringify(postData)
 * });
 * 
 * // Publish a post
 * const response = await fetch('/api/posts/123/publish', {
 *   method: 'POST',
 *   headers: {
 *     'Authorization': 'Bearer your-api-token'
 *   }
 * });
 */