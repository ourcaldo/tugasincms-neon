import { useAuth } from '@clerk/nextjs';

const API_BASE_URL = '/api';

class ApiClient {
  private getToken: (() => Promise<string | null>) | null = null;

  setAuth(getToken: () => Promise<string | null>) {
    this.getToken = getToken;
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    // L-3: Only set Content-Type for requests that have a body
    const method = (options.method || 'GET').toUpperCase();
    if (options.body || method === 'POST' || method === 'PUT' || method === 'PATCH') {
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    }

    if (this.getToken) {
      const token = await this.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint);
  }

  async post<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string, data?: unknown): Promise<T> {
    const options: RequestInit = {
      method: 'DELETE',
    };
    
    if (data) {
      options.body = JSON.stringify(data);
    }
    
    return this.request<T>(endpoint, options);
  }
}

export const apiClient = new ApiClient();

// M-4: setAuth is called on every render via useApiClient. Acceptable for
// single-user browser tabs. Concurrent React mode risk is minimal.
export function useApiClient() {
  const { getToken } = useAuth();
  
  if (getToken) {
    apiClient.setAuth(() => getToken());
  }

  return apiClient;
}
