// src/lib/unified-auth.ts
'use client';

// Use the same base as other services; expected to include '/api'
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000/api";

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
}

export class UnifiedAuth {
  private static readonly TOKEN_KEY = 'token';
  
  private static isValidJWT(token: string): boolean {
    if (!token || typeof token !== 'string') return false;
    const parts = token.split('.');
    return parts.length === 3 && parts.every(part => part.length > 0);
  }

  static isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    const token = localStorage.getItem(this.TOKEN_KEY);
    return !!token && this.isValidJWT(token);
  }

  static getToken(): string | null {
    if (typeof window === 'undefined') return null;
    const token = localStorage.getItem(this.TOKEN_KEY);
    
    if (!token) return null;
    
    if (!this.isValidJWT(token)) {
      console.warn('Invalid token format found, removing...');
      this.removeToken();
      return null;
    }
    
    return token;
  }

  static setToken(token: string): void {
    if (typeof window === 'undefined') return;
    
    if (!this.isValidJWT(token)) {
      console.error('Attempted to store invalid JWT token');
      return;
    }
    
    localStorage.setItem(this.TOKEN_KEY, token);
    console.log('Token stored successfully');
  }

  static removeToken(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.TOKEN_KEY);
    console.log('Token removed');
  }

  static getAuthHeaders(): HeadersInit {
    const token = this.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  }

  static async login(credentials: LoginCredentials): Promise<boolean> {
    try {
      console.log('Attempting login...');
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Login failed' }));
        throw new Error(errorData.detail || `Login failed with status ${response.status}`);
      }

      const tokenData: AuthToken = await response.json();
      
      if (!tokenData.access_token || !this.isValidJWT(tokenData.access_token)) {
        throw new Error('Invalid token received from server');
      }

      this.setToken(tokenData.access_token);
      console.log('Login successful');
      return true;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  static logout(): void {
    this.removeToken();
    console.log('Logged out successfully');
  }

  static async authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const token = this.getToken();
    
    if (!token) {
      throw new Error('No authentication token available. Please log in.');
    }

    const headers = {
      ...this.getAuthHeaders(),
      ...options.headers,
    };

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
      console.warn('Token expired or invalid, removing...');
      this.removeToken();
      throw new Error('Authentication failed. Please log in again.');
    }

    return response;
  }
  
  static async uploadImage(file: File): Promise<string> {
    try {
      const token = this.getToken();
      if (!token) {
        throw new Error('Authentication required for upload');
      }

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE}/upload-image`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }, // No Content-Type for FormData
        body: formData,
      });

      if (response.status === 401) {
        this.removeToken();
        throw new Error('Session expired. Please log in again.');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Upload failed' }));
        throw new Error(errorData.detail || 'Failed to upload image');
      }

      const result = await response.json();
      return result.url;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  }
}