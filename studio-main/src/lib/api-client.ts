'use client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';

/**
 * Centralized API client with improved authentication handling
 */
export class ApiClient {
  private static getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;

    // Try multiple token sources
    const tokenSources = [
      // Cookies (server-side auth)
      () => {
        const cookies = document.cookie.split(';').map(c => c.trim());
        for (const cookie of cookies) {
          if (cookie.startsWith('token=')) return cookie.split('=')[1];
          if (cookie.startsWith('authToken=')) return cookie.split('=')[1];
          if (cookie.startsWith('access_token=')) return cookie.split('=')[1];
          if (cookie.startsWith('jwt=')) return cookie.split('=')[1];
        }
        return null;
      },
      // localStorage (client-side auth)
      () => {
        try {
          return localStorage.getItem('token') ||
                 localStorage.getItem('authToken') ||
                 localStorage.getItem('access_token') ||
                 localStorage.getItem('jwt');
        } catch {
          return null;
        }
      }
    ];

    for (const source of tokenSources) {
      const token = source();
      if (token) {
        console.log('[ApiClient] Found token from source');
        return token;
      }
    }

    console.warn('[ApiClient] No auth token found');
    return null;
  }

  private static getApiKey(): string | null {
    if (typeof window === 'undefined') return null;
    return process.env.NEXT_PUBLIC_API_KEY || 
           process.env.API_KEY ||
           null;
  }

  private static getAuthHeaders(isFormData: boolean = false): HeadersInit {
    const headers: HeadersInit = {};

    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    // Try JWT token first
    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      console.log('[ApiClient] Using JWT token');
      return headers;
    }

    // Fallback to X-API-Key
    const apiKey = this.getApiKey();
    if (apiKey) {
      headers['X-API-Key'] = apiKey;
      console.log('[ApiClient] Using API Key');
      return headers;
    }

    console.warn('[ApiClient] No authentication method available');
    return headers;
  }

  private static async makeRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
    const isFormData = options.body instanceof FormData;

    console.log(`[ApiClient] ${options.method || 'GET'} ${url}`);

    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getAuthHeaders(isFormData),
        ...options.headers,
      },
      cache: 'no-store',
    });

    // Handle 401 Unauthorized
    if (response.status === 401) {
      console.error('[ApiClient] 401 Unauthorized - clearing auth and redirecting');
      
      if (typeof window !== 'undefined') {
        // Clear all auth storage
        try {
          ['token', 'authToken', 'access_token', 'jwt', 'currentUser'].forEach(key => {
            localStorage.removeItem(key);
          });
        } catch (e) {
          console.error('[ApiClient] Error clearing localStorage:', e);
        }

        // Clear auth cookies
        ['token', 'authToken', 'access_token', 'jwt'].forEach(cookieName => {
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        });

        // Redirect to login
        window.location.href = '/admin/login';
      }
      throw new Error('Authentication failed');
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[ApiClient] Error ${response.status}:`, errorText);
      throw new Error(`API call failed with status ${response.status}: ${errorText}`);
    }

    return response;
  }

  static async get(endpoint: string): Promise<any> {
    const response = await this.makeRequest(endpoint, { method: 'GET' });
    return response.json();
  }

  static async post(endpoint: string, data?: any): Promise<any> {
    const isFormData = data instanceof FormData;
    const response = await this.makeRequest(endpoint, {
      method: 'POST',
      body: isFormData ? data : JSON.stringify(data),
    });

    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  static async put(endpoint: string, data?: any): Promise<any> {
    const isFormData = data instanceof FormData;
    const response = await this.makeRequest(endpoint, {
      method: 'PUT',
      body: isFormData ? data : JSON.stringify(data),
    });

    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  static async patch(endpoint: string, data?: any): Promise<any> {
    const isFormData = data instanceof FormData;
    const response = await this.makeRequest(endpoint, {
      method: 'PATCH',
      body: isFormData ? data : JSON.stringify(data),
    });

    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  static async delete(endpoint: string): Promise<any> {
    const response = await this.makeRequest(endpoint, { method: 'DELETE' });
    return response.ok ? null : response.json();
  }

  /**
   * Set authentication token
   */
  static setAuthToken(token: string | null): void {
    if (typeof window === 'undefined') return;

    if (token) {
      try {
        localStorage.setItem('token', token);
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 7);
        document.cookie = `token=${token}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Strict`;
        console.log('[ApiClient] Auth token set');
      } catch (e) {
        console.error('[ApiClient] Error setting token:', e);
      }
    } else {
      try {
        ['token', 'authToken', 'access_token', 'jwt'].forEach(key => {
          localStorage.removeItem(key);
          document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        });
        console.log('[ApiClient] Auth token cleared');
      } catch (e) {
        console.error('[ApiClient] Error clearing token:', e);
      }
    }
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    const hasToken = Boolean(this.getAuthToken() || this.getApiKey());
    console.log('[ApiClient] Is authenticated:', hasToken);
    return hasToken;
  }
}
