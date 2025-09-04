'use server';
import type { MenuItem } from './types';
import { cookies } from 'next/headers';

// The base URL will be proxied to your FastAPI backend by Next.js
const API_BASE_URL = 'http://localhost:9002/api';

// Helper function to get auth token
async function getAuthToken(): Promise<string | null> {
  // Option 1: Use environment variable for API key
  const apiKey = process.env.API_KEY || process.env.FASTAPI_API_KEY;
  if (apiKey) {
    console.log('Using API key from environment');
    return apiKey;
  }
  
  // Option 2: Get from cookies (if using session-based auth)
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('authToken')?.value || 
                  cookieStore.get('access_token')?.value ||
                  cookieStore.get('jwt')?.value;
    
    if (token) {
      console.log('Using token from cookies');
      return token;
    }
    
    console.log('No token found in cookies or environment');
    return null;
  } catch (error) {
    console.warn('Could not access cookies:', error);
    return null;
  }
}

// Helper function to create authenticated headers
async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    console.log('Added Authorization header');
  } else {
    console.warn('No auth token available - API call may fail');
  }
  
  return headers;
}

// Helper function to handle fetch responses
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text();
    
    // Handle specific authentication errors
    if (response.status === 401 || response.status === 403) {
      throw new Error(`Authentication failed: ${errorText}`);
    }
    
    throw new Error(`API call failed with status ${response.status}: ${errorText}`);
  }
  return response.json() as Promise<T>;
}

export async function getMenuItems(): Promise<MenuItem[]> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/menu`, {
    headers,
  });
  return handleResponse<MenuItem[]>(response);
}

export async function addMenuItem(item: Omit<MenuItem, 'id'>): Promise<MenuItem> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/menu`, {
    method: 'POST',
    headers,
    body: JSON.stringify(item),
  });
  return handleResponse<MenuItem>(response);
}

export async function updateMenuItem(item: MenuItem): Promise<MenuItem> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/menu/${item.id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(item),
  });
  return handleResponse<MenuItem>(response);
}

export async function deleteMenuItem(itemId: string): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/menu/${itemId}`, {
    method: 'DELETE',
    headers,
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    
    if (response.status === 401 || response.status === 403) {
      throw new Error(`Authentication failed: ${errorText}`);
    }
    
    throw new Error(`API call failed with status ${response.status}: ${errorText}`);
  }
}