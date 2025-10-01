import { Post, PostFilters, ApiResponse } from '../types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api';

export class ApiClient {
  private static instance: ApiClient;
  private token: string | null = null;

  private constructor() {
    // Load token from localStorage in browser environment
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('api_token');
    }
  }

  static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  setToken(token: string): void {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('api_token', token);
    }
  }

  clearToken(): void {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('api_token');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || 'Request failed',
        };
      }

      return {
        success: true,
        data: data.data || data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // Posts API
  async getPosts(filters?: PostFilters): Promise<ApiResponse<{ posts: Post[]; total: number }>> {
    const queryParams = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
    }

    const endpoint = `/posts${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request(endpoint);
  }

  async getPost(id: string): Promise<ApiResponse<Post>> {
    return this.request(`/posts/${id}`);
  }

  async createPost(post: Omit<Post, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Post>> {
    return this.request('/posts', {
      method: 'POST',
      body: JSON.stringify(post),
    });
  }

  async updatePost(id: string, post: Partial<Post>): Promise<ApiResponse<Post>> {
    return this.request(`/posts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(post),
    });
  }

  async deletePost(id: string): Promise<ApiResponse<void>> {
    return this.request(`/posts/${id}`, {
      method: 'DELETE',
    });
  }

  async publishPost(id: string): Promise<ApiResponse<Post>> {
    return this.request(`/posts/${id}/publish`, {
      method: 'POST',
    });
  }
}

export const apiClient = ApiClient.getInstance();