'use server';
import { cookies } from 'next/headers';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:9002';

export async function loginAndGetToken(): Promise<string | null> {
  try {
    const username = process.env.FASTAPI_ADMIN_USERNAME;
    const password = process.env.FASTAPI_ADMIN_PASSWORD;
    
    if (!username || !password) {
      console.error('Missing FASTAPI_ADMIN_USERNAME or FASTAPI_ADMIN_PASSWORD in environment');
      return null;
    }
    
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
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
      console.error('Login failed:', await response.text());
      return null;
    }
    
    const data = await response.json();
    const token = data.access_token;
    
    // Store token in cookies
    const cookieStore = await cookies();
    cookieStore.set('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 60, // 30 minutes
      sameSite: 'lax'
    });
    
    console.log('Successfully logged in and stored token');
    return token;
    
  } catch (error) {
    console.error('Login error:', error);
    return null;
  }
}

export async function saveAuthToken(token: string): Promise<void> {
  console.log("Token saved (simulated on server, but would be in localStorage).");
}

export async function getAuthHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}

export async function getAuthToken(): Promise<string | null> {
  try {
    // First try to get token from cookies
    const cookieStore = await cookies();
    const existingToken = cookieStore.get('authToken')?.value;
    
    if (existingToken) {
      console.log('Using existing token from cookies');
      return existingToken;
    }
    
    // If no token, try to login and get a new one
    console.log('No token found, attempting to login...');
    const newToken = await loginAndGetToken();
    
    return newToken;
    
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
}