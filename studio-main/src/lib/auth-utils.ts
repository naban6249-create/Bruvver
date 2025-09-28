// lib/auth-utils.ts
'use client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_SERVER_URL || "http://localhost:8000";

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
}

export class AuthUtils {
  private static readonly TOKEN_KEY = 'token';
  
  // Check if user is authenticated
  static isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    const token = localStorage.getItem(this.TOKEN_KEY);
    return !!token;
  }

  // Get auth token
  static getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(this.TOKEN_KEY);
  }

  // Set auth token
  static setToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  // Remove auth token
  static removeToken(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.TOKEN_KEY);
  }

  // Get auth headers for API requests
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

  // Login function
  static async login(credentials: LoginCredentials): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Login failed' }));
        throw new Error(errorData.detail || 'Login failed');
      }

      const tokenData: AuthToken = await response.json();
      this.setToken(tokenData.access_token);
      
      return true;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  // Logout function
  static logout(): void {
    this.removeToken();
    // Optionally redirect to login page
    if (typeof window !== 'undefined') {
      window.location.href = '/admin/login';
    }
  }

  // Make authenticated API request
  static async authenticatedFetch(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const headers = {
      ...this.getAuthHeaders(),
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle 401 Unauthorized responses
    if (response.status === 401) {
      this.removeToken();
      throw new Error('Authentication failed - please log in again');
    }

    return response;
  }

  // Verify token is still valid
  static async verifyToken(): Promise<boolean> {
    if (!this.isAuthenticated()) return false;

    try {
      const response = await this.authenticatedFetch(`${API_BASE_URL}/api/auth/me`);
      return response.ok;
    } catch (error) {
      console.error('Token verification failed:', error);
      this.removeToken();
      return false;
    }
  }

  // Auto-login for testing (remove in production)
  static async autoLogin(): Promise<boolean> {
    try {
      // Use the default admin credentials from your backend
      return await this.login({
        username: 'admin@test.com',
        password: 'testpassword'
      });
    } catch (error) {
      console.error('Auto-login failed:', error);
      return false;
    }
  }
}
