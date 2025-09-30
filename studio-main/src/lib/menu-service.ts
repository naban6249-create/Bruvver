'use server';

import type { MenuItem } from './types';
import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000/api';
const API_ORIGIN = API_BASE_URL.replace(/\/?api\/?$/, '');

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
    const cookieStore = cookies();
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

function normalizeMenuItem(raw: any): MenuItem {
  if (!raw) return raw as MenuItem;
  const rawImage = raw.imageUrl ?? raw.image_url ?? undefined;
  const imageUrl = typeof rawImage === 'string' && rawImage.startsWith('/')
    ? `${API_ORIGIN}${rawImage}`
    : rawImage;
  return {
    id: String(raw.id),
    name: raw.name,
    price: Number(raw.price ?? 0),
    description: raw.description ?? undefined,
    imageUrl,
    category: raw.category ?? '',
    is_available: Boolean(raw.is_available),
    branchId: raw.branchId ?? raw.branch_id ?? undefined,
    ingredients: Array.isArray(raw.ingredients) ? raw.ingredients : [],
    created_at: raw.created_at ?? undefined,
    updated_at: raw.updated_at ?? undefined,
  };
}

// Fetch all menu items (optionally by branch)
export async function getMenuItems(branchId?: string | number): Promise<MenuItem[]> {
  const headers = await getAuthHeaders();
  if (branchId === undefined || branchId === null || `${branchId}`.length === 0 || `${branchId}` === 'undefined' || `${branchId}` === 'null') {
    // No branch selected yet; return empty list to prevent 422
    return [];
  }
  const response = await fetch(`${API_BASE_URL}/branches/${branchId}/menu`, {
    headers,
    cache: 'no-store', // Avoid caching on server side
  });
  const data = await handleResponse(response);
  return Array.isArray(data) ? data.map(normalizeMenuItem) : [];
}


export async function getBranchMenu(branchId: string): Promise<MenuItem[]> {
    const response = await fetch(`${API_BASE_URL}/branches/${branchId}/menu?available_only=true`, {
        headers: {
            'X-API-Key': process.env.SERVICE_API_KEY || '',
        },
        cache: 'no-store',
    });
    const data = await handleResponse(response);
    return Array.isArray(data) ? data.map(normalizeMenuItem) : [];
}


// ### CORRECTED VERSION ###
// Add a new menu item (with optional file upload)
export async function addMenuItem(item: Omit<MenuItem, 'id'> & { imageFile?: File } & { branchId?: string | number; branch_id?: string | number }): Promise<MenuItem> {
    const { imageFile, ...itemData } = item;

    // Always use FormData because the backend endpoint expects it
    const formData = new FormData();
    formData.append('name', itemData.name);
    formData.append('price', itemData.price.toString());
    formData.append('description', itemData.description || '');
    formData.append('category', itemData.category || '');
    formData.append('is_available', String(itemData.is_available));
    formData.append('ingredients', JSON.stringify(itemData.ingredients || []));
    // Include branch id if provided (support both branchId and branch_id)
    const branchId = (item as any).branch_id ?? (item as any).branchId;
    if (branchId === undefined || branchId === null || `${branchId}`.length === 0) {
      throw new Error('Branch ID is required to create a menu item');
    }

    // Only append the image file if it exists
    if (imageFile) {
        formData.append('image', imageFile);
    }

    const headers = await getFormDataAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/branches/${branchId}/menu`, {
        method: 'POST',
        headers,
        body: formData,
    });
    const data = await handleResponse(response);
    return normalizeMenuItem(data);
}

// ### CORRECTED VERSION ###
// Update existing menu item (with optional file upload)
export async function updateMenuItem(item: MenuItem & { imageFile?: File } & { branchId?: string | number; branch_id?: string | number }): Promise<MenuItem> {
    const { imageFile, ...itemData } = item;

    // Always use FormData because the backend endpoint expects it
    const formData = new FormData();
    formData.append('name', itemData.name);
    formData.append('price', itemData.price.toString());
    formData.append('description', itemData.description || '');
    formData.append('category', itemData.category || '');
    formData.append('is_available', String(itemData.is_available));
    formData.append('ingredients', JSON.stringify(itemData.ingredients || []));
    // Include branch id if provided (support both branchId and branch_id)
    const branchId = (item as any).branch_id ?? (item as any).branchId;
    if (branchId !== undefined && branchId !== null && `${branchId}`.length > 0) {
      formData.append('branch_id', String(branchId));
    }

    // If a new file is being uploaded, add it to the form data.
    // Otherwise, send the existing image_url so the backend knows not to delete it.
    if (imageFile) {
        formData.append('image', imageFile);
    } else {
        formData.append('image_url', itemData.imageUrl || '');
    }

    const headers = await getFormDataAuthHeaders();
    const url = (branchId === undefined || branchId === null || `${branchId}`.length === 0 || `${branchId}` === 'undefined' || `${branchId}` === 'null')
      ? `${API_BASE_URL}/menu/${itemData.id}`
      : `${API_BASE_URL}/branches/${branchId}/menu/${itemData.id}`;
    const response = await fetch(url, {
        method: 'PUT',
        headers,
        body: formData,
    });
    const data = await handleResponse(response);
    return normalizeMenuItem(data);
}

// Delete a menu item by id
export async function deleteMenuItem(itemId: string, branchId?: string | number): Promise<void> {
  const headers = await getAuthHeaders();
  const invalid = (branchId === undefined || branchId === null || `${branchId}`.length === 0 || `${branchId}` === 'undefined' || `${branchId}` === 'null');
  const url = invalid ? `${API_BASE_URL}/menu/${itemId}` : `${API_BASE_URL}/branches/${branchId}/menu/${itemId}`;
  const response = await fetch(url, {
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
