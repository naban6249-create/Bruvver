'use client';

import type { User, LoginResponse } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';

export async function loginUser(username: string, password: string): Promise<LoginResponse | null> {
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
      throw new Error(`Login failed: ${response.status}`);
    }

    const data: LoginResponse = await response.json();
    
    // Store token in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('currentUser', JSON.stringify(data.user));
    }

    return data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

export async function logoutUser(): Promise<void> {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
  }
}

export async function getCurrentUser(): Promise<User | null> {
  if (typeof window !== 'undefined') {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('currentUser');
      }
    }
  }
  return null;
}
