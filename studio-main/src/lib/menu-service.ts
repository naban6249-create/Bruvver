'use client';

import type { MenuItem } from './types';
import { ApiClient } from './api-client';

function normalizeMenuItem(raw: any): MenuItem {
  if (!raw) return raw as MenuItem;
  const rawImage = raw.imageUrl ?? raw.image_url ?? undefined;
  const imageUrl = rawImage; // Cloudinary URLs are absolute, so no need to prepend API_ORIGIN
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
  if (branchId === undefined || branchId === null || `${branchId}`.length === 0 || `${branchId}` === 'undefined' || `${branchId}` === 'null') {
    // No branch selected yet; return empty list to prevent 422
    return [];
  }
  const data = await ApiClient.get(`/branches/${branchId}/menu`);
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

    const data = await ApiClient.post(`/branches/${branchId}/menu`, formData);
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

    const url = (branchId === undefined || branchId === null || `${branchId}`.length === 0 || `${branchId}` === 'undefined' || `${branchId}` === 'null')
      ? `/menu/${itemData.id}`
      : `/branches/${branchId}/menu/${itemData.id}`;
    const data = await ApiClient.put(url, formData);
    return normalizeMenuItem(data);
}

// Delete a menu item by id
export async function deleteMenuItem(itemId: string, branchId?: string | number): Promise<void> {
  const invalid = (branchId === undefined || branchId === null || `${branchId}`.length === 0 || `${branchId}` === 'undefined' || `${branchId}` === 'null');
  const url = invalid ? `/menu/${itemId}` : `/branches/${branchId}/menu/${itemId}`;
  await ApiClient.delete(url);
}
