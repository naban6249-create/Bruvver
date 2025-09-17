'use server';

import type { MenuItem } from './types';
import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:9002/api';

// Helper to get JWT token from env or cookies
async function getAuthToken(): Promise<string | null> {
  // Option 1: Env variable API key/token
  const apiKey = process.env.API_KEY || process.env.FASTAPI_API_KEY;
  if (apiKey) {
    console.log('Using API key from environment');
    return apiKey;
  }

  // Option 2: Cookies (for server-side fetch in Next.js)
  try {
    const cookieStore = await cookies();
    const token =
      cookieStore.get('token')?.value || // <-- ADD THIS LINE
      cookieStore.get('authToken')?.value ||
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

// Helper to get headers with Authorization if token present (for JSON requests)
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

// Helper to get headers for FormData requests (no Content-Type)
async function getFormDataAuthHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    console.log('Added Authorization header for FormData');
  } else {
    console.warn('No auth token available - API call may fail');
  }
  return headers;
}

// Handle fetch responses, throw on error
async function handleResponse(response: Response): Promise<any> {
  if (!response.ok) {
    const errorText = await response.text();
    if (response.status === 401 || response.status === 403) {
      throw new Error(`Authentication failed: ${errorText}`);
    }
    throw new Error(`API call failed with status ${response.status}: ${errorText}`);
  }
  return response.json() as Promise<any>;
}

// Fetch all menu items
export async function getMenuItems(): Promise<MenuItem[]> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/menu`, {
    headers,
    cache: 'no-store', // Avoid caching on server side
  });
  return handleResponse(response);
}

// ### CORRECTED VERSION ###
// Add a new menu item (with optional file upload)
export async function addMenuItem(item: Omit<MenuItem, 'id'> & { imageFile?: File }): Promise<MenuItem> {
    const { imageFile, ...itemData } = item;

    // Always use FormData because the backend endpoint expects it
    const formData = new FormData();
    formData.append('name', itemData.name);
    formData.append('price', itemData.price.toString());
    formData.append('description', itemData.description || '');
    formData.append('category', itemData.category || '');
    formData.append('is_available', String(itemData.is_available));
    formData.append('ingredients', JSON.stringify(itemData.ingredients || []));

    // Only append the image file if it exists
    if (imageFile) {
        formData.append('image', imageFile);
    }

    const headers = await getFormDataAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/menu`, {
        method: 'POST',
        headers,
        body: formData,
    });
    return handleResponse(response);
}

// ### CORRECTED VERSION ###
// Update existing menu item (with optional file upload)
export async function updateMenuItem(item: MenuItem & { imageFile?: File }): Promise<MenuItem> {
    const { imageFile, ...itemData } = item;

    // Always use FormData because the backend endpoint expects it
    const formData = new FormData();
    formData.append('name', itemData.name);
    formData.append('price', itemData.price.toString());
    formData.append('description', itemData.description || '');
    formData.append('category', itemData.category || '');
    formData.append('is_available', String(itemData.is_available));
    formData.append('ingredients', JSON.stringify(itemData.ingredients || []));

    // If a new file is being uploaded, add it to the form data.
    // Otherwise, send the existing image_url so the backend knows not to delete it.
    if (imageFile) {
        formData.append('image', imageFile);
    } else {
        formData.append('image_url', itemData.imageUrl || '');
    }

    const headers = await getFormDataAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/menu/${itemData.id}`, {
        method: 'PUT',
        headers,
        body: formData,
    });
    return handleResponse(response);
}

// Delete a menu item by id
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