/**
 * Client-side API token management for v1 API endpoints
 * This utility helps manage API tokens for accessing the v1 API from the admin interface
 */

const API_TOKEN_STORAGE_KEY = 'cms_api_token'

export class ApiTokenClient {
  private token: string | null = null

  constructor() {
    // Load token from localStorage on initialization
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem(API_TOKEN_STORAGE_KEY)
    }
  }

  /**
   * Set the API token for v1 API requests
   */
  setToken(token: string) {
    this.token = token
    if (typeof window !== 'undefined') {
      localStorage.setItem(API_TOKEN_STORAGE_KEY, token)
    }
  }

  /**
   * Get the current API token
   */
  getToken(): string | null {
    return this.token
  }

  /**
   * Clear the stored API token
   */
  clearToken() {
    this.token = null
    if (typeof window !== 'undefined') {
      localStorage.removeItem(API_TOKEN_STORAGE_KEY)
    }
  }

  /**
   * Check if a token is available
   */
  hasToken(): boolean {
    return !!this.token
  }

  /**
   * Make a request to the v1 API with the stored token
   */
  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    const response = await fetch(`/api/v1${endpoint}`, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }))
      throw new Error(error.error || error.message || `HTTP ${response.status}`)
    }

    if (response.status === 204) {
      return {} as T
    }

    return response.json()
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint)
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async put<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    })
  }
}

// Global instance
export const apiTokenClient = new ApiTokenClient()

/**
 * Hook for using the API token client in React components
 */
export function useApiTokenClient() {
  return apiTokenClient
}