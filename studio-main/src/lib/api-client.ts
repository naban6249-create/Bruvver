'use client';

import Cookies from 'js-cookie';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';

/**
 * Centralized API client with improved authentication handling
 */
export class ApiClient {
  private static getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;

    // Prioritize the cookie, as it's the primary source for server-side auth
    const token = Cookies.get('token');
    if (token) {
      console.log('[ApiClient] Found token from cookie');
      return token;
    }

    // Fallback to localStorage for any legacy client-side sessions
    try {
      const localToken = localStorage.getItem('token');
      if (localToken) {
        console.log('[ApiClient] Found token from localStorage');
        return localToken;
      }
    } catch {
      // Ignore localStorage errors (e.g., in private browsing)
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

    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      return headers;
    }

    const apiKey = this.getApiKey();
    if (apiKey) {
      headers['X-API-Key'] = apiKey;
      return headers;
    }

    return headers;
  }

  private static async makeRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
    const isFormData = options.body instanceof FormData;

    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getAuthHeaders(isFormData),
        ...options.headers,
      },
      cache: 'no-store',
    });

    if (response.status === 401) {
      console.error('[ApiClient] 401 Unauthorized - clearing auth and redirecting');
      this.setAuthToken(null); // Clear tokens
      if (typeof window !== 'undefined') {
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
  console.log('\n=== API CLIENT PUT METHOD START ===');
  console.log('🎯 Endpoint:', endpoint);
  console.log('📊 Data type:', data?.constructor?.name);
  
  const isFormData = data instanceof FormData;
  console.log('📋 Is FormData?', isFormData);
  
  if (isFormData && data instanceof FormData) {
    console.log('📦 FormData entries in ApiClient.put:');
    const keys = Array.from(data.keys());
    console.log('   Keys:', keys);
    keys.forEach(key => {
      const value = data.get(key);
      if (value instanceof File) {
        console.log(`   ${key}: [File: ${value.name}]`);
      } else {
        console.log(`   ${key}: ${value}`);
      }
    });
  }
  
  console.log('📤 Calling makeRequest...');
  const response = await this.makeRequest(endpoint, {
    method: 'PUT',
    body: isFormData ? data : JSON.stringify(data),
  });
  
  console.log('✅ Response status:', response.status);
  const text = await response.text();
  console.log('📥 Response length:', text.length, 'characters');
  console.log('=== API CLIENT PUT METHOD END ===\n');
  
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
   * Set authentication token using js-cookie for server-side compatibility
   */
  static setAuthToken(token: string | null): void {
    if (typeof window === 'undefined') return;

    if (token) {
      try {
        // Use js-cookie to set a cookie that's accessible server-side
        Cookies.set('token', token, { expires: 7, path: '/', sameSite: 'Strict' });
        // Also set in localStorage for any client-side logic that might need it
        localStorage.setItem('token', token);
        console.log('[ApiClient] Auth token set via js-cookie');
      } catch (e) {
        console.error('[ApiClient] Error setting token:', e);
      }
    } else {
      try {
        // Use js-cookie to remove the cookie
        Cookies.remove('token', { path: '/' });
        // Also clear from localStorage and other legacy keys
        ['token', 'authToken', 'access_token', 'jwt'].forEach(key => {
          localStorage.removeItem(key);
          Cookies.remove(key, { path: '/' });
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
    // Check for the presence of the cookie as the primary method
    const hasToken = !!Cookies.get('token');
    console.log('[ApiClient] Is authenticated:', hasToken);
    return hasToken;
  }
}
