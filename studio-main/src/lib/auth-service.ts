
import type { User, LoginResponse } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';

// Helper to get authenticated headers
async function getAuthHeaders(): Promise<Record<string, string>> {
  let token: string | undefined;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  try {
    if (typeof window === 'undefined') {
      const { cookies } = await import('next/headers');
      const cookieStore = await cookies();
      token = cookieStore.get('token')?.value;
    } else {
      // Try localStorage first
      token = window.localStorage?.getItem('token') || undefined;
      if (!token) {
        // Fallback to reading from document.cookie
        const match = document.cookie
          .split(';')
          .map(c => c.trim())
          .find(c => c.startsWith('token='));
        if (match) token = match.split('=')[1];
      }
    }
  } catch (_) {
    // Ignore and continue without token
  }
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

// Helper to handle API responses
async function handleResponse(response: Response) {
  if (!response.ok) {
    const errorText = await response.text();
    console.error("API Error:", errorText);
    try {
      const errorJson = JSON.parse(errorText);
      if (errorJson.detail) {
        throw new Error(errorJson.detail);
      }
    } catch (e) {
      throw new Error(`API call failed with status ${response.status}: ${errorText}`);
    }
  }
  return response.json();
}

export async function loginUser(username: string, password: string): Promise<LoginResponse | null> {
  try {
    const requestBody = {
      username: username,
      password: password
    };
    
    console.log('🔐 Auth Service Debug:', {
      username: username,
      usernameLength: username?.length || 0,
      passwordLength: password?.length || 0,
      apiUrl: `${API_BASE_URL}/auth/login`,
      requestBody: { username, password: '***' },
      usernameEmpty: !username || username.trim() === '',
      passwordEmpty: !password || password.trim() === ''
    });
    
    // Validate inputs
    if (!username || username.trim() === '') {
      console.error('❌ Username is empty in auth service!');
      throw new Error('Username is required');
    }
    
    if (!password || password.trim() === '') {
      console.error('❌ Password is empty in auth service!');
      throw new Error('Password is required');
    }
    
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Login failed:', errorData);
      return null;
    }

    const data: LoginResponse = await response.json();
    
    // Persist token depending on environment
    if (typeof window === 'undefined') {
      // Server-side: set cookie via next/headers
      try {
        const { cookies } = await import('next/headers');
        const cookieStore = await cookies();
        cookieStore.set('token', data.access_token, {
          httpOnly: false,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 24 * 60 * 60,
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
        });
      } catch (e) {
        // ignore
      }
    } else {
      // Client-side: localStorage + document.cookie (AuthProvider also stores redundantly)
      try {
        window.localStorage.setItem('token', data.access_token);
        window.localStorage.setItem('currentUser', JSON.stringify(data.user));
        document.cookie = `token=${data.access_token}; max-age=${24 * 60 * 60}; path=/; samesite=${process.env.NODE_ENV === 'production' ? 'none' : 'lax'}; ${process.env.NODE_ENV === 'production' ? 'secure' : ''}`.trim();
      } catch (_) {}
    }

    console.log('Successfully logged in user:', data.user.username);
    // Return full response so client can persist token in localStorage
    return data;

  } catch (error) {
    console.error('Login error:', error);
    return null;
  }
}

export async function logoutUser(): Promise<void> {
  try {
    // Clear token
    if (typeof window === 'undefined') {
      try {
        const { cookies } = await import('next/headers');
        const cookieStore = await cookies();
        cookieStore.delete('token');
      } catch (_) {}
    }
    
    // Clear client-side storage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('currentUser');
      // Also clear cookie from client-side
      document.cookie = 'token=; max-age=0; path=/;';
    }
    
    console.log('User logged out successfully');
  } catch (error) {
    console.error('Logout error:', error);
  }
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    // First try to get from localStorage (client-side)
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('currentUser');
      if (savedUser) {
        return JSON.parse(savedUser);
      }
    }

    // If not available client-side, make API call
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers,
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    const userData = await handleResponse(response);
    
    // Store for future use
    if (typeof window !== 'undefined') {
      localStorage.setItem('currentUser', JSON.stringify(userData));
    }

    return userData;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

export async function refreshUserData(): Promise<User | null> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers,
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    const userData = await handleResponse(response);
    
    // Update stored user data
    if (typeof window !== 'undefined') {
      localStorage.setItem('currentUser', JSON.stringify(userData));
    }

    return userData;
  } catch (error) {
    console.error('Error refreshing user data:', error);
    return null;
  }
}

export async function getAuthToken(): Promise<string | null> {
  try {
    if (typeof window === 'undefined') {
      // Server-side cookies
      try {
        const { cookies } = await import('next/headers');
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;
        if (token) return token;
      } catch (_) {}
    } else {
      // Client-side storage
      const localToken = localStorage.getItem('token');
      if (localToken) return localToken;
      const match = document.cookie
        .split(';')
        .map(c => c.trim())
        .find(c => c.startsWith('token='));
      if (match) return match.split('=')[1];
    }

    return null;
  } catch (error) {
    console.error('Error getting auth token:', error);
    // Fallback to localStorage if cookies fail
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  }
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await getAuthToken();
  return !!token;
}

// Forgot Password API (Updated to use new endpoint)
export async function requestPasswordReset(email: string): Promise<{ message: string; success: boolean }> {
  try {
    console.log('🔍 Auth Service - Requesting password reset for:', email);
    console.log('🔍 Auth Service - API URL:', `${API_BASE_URL}/auth/forgot-password`);
    
    const requestBody = {
      email: email
    };
    
    console.log('🔍 Auth Service - Request body:', requestBody);
    
    const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('🔍 Auth Service - Response status:', response.status);
    
    const data = await response.json();
    console.log('🔍 Auth Service - Response data:', data);

    if (!response.ok) {
      console.error('❌ Auth Service - Request failed:', data);
      throw new Error(data.detail || 'Failed to request password reset');
    }

    console.log('✅ Auth Service - Request successful:', data);
    return data;
  } catch (error) {
    console.error('❌ Auth Service - Forgot password error:', error);
    throw error;
  }
}

// Reset Password API (Updated to use new endpoint)
export async function resetPassword(token: string, newPassword: string): Promise<{ message: string; success: boolean; username?: string }> {
  try {
    console.log('🔍 Auth Service - Resetting password with token:', token.substring(0, 8) + '...');
    
    const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        new_password: newPassword
      }),
    });

    console.log('🔍 Auth Service - Reset response status:', response.status);
    
    const data = await response.json();
    console.log('🔍 Auth Service - Reset response data:', data);

    if (!response.ok) {
      console.error('❌ Auth Service - Reset failed:', data);
      throw new Error(data.detail || 'Failed to reset password');
    }

    console.log('✅ Auth Service - Password reset successful');
    return data;
  } catch (error) {
    console.error('❌ Auth Service - Reset password error:', error);
    throw error;
  }
}

// Validate Reset Token API (New function)
export async function validateResetToken(token: string): Promise<{ valid: boolean; message?: string; email?: string; expires_in_minutes?: number }> {
  try {
    console.log('🔍 Auth Service - Validating reset token:', token.substring(0, 8) + '...');
    
    const response = await fetch(`${API_BASE_URL}/auth/validate-reset-token/${token}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    console.log('🔍 Auth Service - Token validation result:', data);

    return data;
  } catch (error) {
    console.error('❌ Auth Service - Token validation error:', error);
    return { valid: false, message: 'Failed to validate token' };
  }
}
