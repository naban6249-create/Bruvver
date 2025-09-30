// lib/api-client.ts
'use client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';

export class ApiClient {
  private static getAuthHeaders(isFormData: boolean = false): HeadersInit {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    
    const headers: HeadersInit = {};

    // Do not set Content-Type for FormData, browser does it automatically with boundary
    if (!isFormData) {
        headers['Content-Type'] = 'application/json';
    }
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  }

  static async fetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
    
    const isFormData = options.body instanceof FormData;

    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getAuthHeaders(isFormData),
        ...options.headers,
      },
      cache: 'no-store', // Ensure fresh data for authenticated requests
    });

    // Handle 401 Unauthorized errors by redirecting to login
    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('currentUser');
        window.location.href = '/admin/login';
      }
      throw new Error('Authentication failed');
    }

    return response;
  }

  static async get(endpoint: string): Promise<any> {
    const response = await this.fetch(endpoint);
    return response.json();
  }

  static async post(endpoint: string, data: any): Promise<any> {
    const isFormData = data instanceof FormData;
    const response = await this.fetch(endpoint, {
      method: 'POST',
      body: isFormData ? data : JSON.stringify(data),
    });
    // Handle empty response for 204 No Content etc.
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  static async put(endpoint: string, data: any): Promise<any> {
    const isFormData = data instanceof FormData;
    const response = await this.fetch(endpoint, {
      method: 'PUT',
      body: isFormData ? data : JSON.stringify(data),
    });
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  static async delete(endpoint: string): Promise<any> {
    const response = await this.fetch(endpoint, {
      method: 'DELETE',
    });
    // Delete often returns 204 No Content, so we don't expect a body
    return response.ok ? null : response.json();
  }
}
