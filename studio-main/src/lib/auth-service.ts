'use server';

import { cookies } from 'next/headers';
import type { User, LoginResponse } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';

// Helper to get authenticated headers
async function getAuthHeaders(): Promise<Record<string, string>> {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
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

export async function loginUser(username: string, password: string): Promise<User | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        password
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Login failed:', errorData);
      return null;
    }

    const data: LoginResponse = await response.json();
    
    // Store token in cookies (for server-side) and localStorage (for client-side)
    const cookieStore = await cookies();
    cookieStore.set('token', data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60, // 24 hours
      sameSite: 'lax'
    });

    // Also set a client-side accessible version for immediate use
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('currentUser', JSON.stringify(data.user));
    }

    console.log('Successfully logged in user:', data.user.username);
    return data.user;

  } catch (error) {
    console.error('Login error:', error);
    return null;
  }
}

export async function logoutUser(): Promise<void> {
  try {
    // Clear server-side cookies
    const cookieStore = await cookies();
    cookieStore.delete('token');
    
    // Clear client-side storage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('currentUser');
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
    // Try client-side first
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) return token;
    }

    // Try cookies
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    return token || null;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await getAuthToken();
  return !!token;
}