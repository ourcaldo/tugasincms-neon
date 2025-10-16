import { useAuth } from '@clerk/nextjs';

const API_BASE_URL = '/api';

class ApiClient {
  private getToken: (() => Promise<string | null>) | null = null;

  setAuth(getToken: () => Promise<string | null>) {
    this.getToken = getToken;
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

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

  async post<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string, data?: any): Promise<T> {
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

export function useApiClient() {
  const { getToken } = useAuth();
  
  if (getToken) {
    apiClient.setAuth(() => getToken());
  }

  return apiClient;
}
