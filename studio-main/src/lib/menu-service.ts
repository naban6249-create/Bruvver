'use client';

import type { MenuItem } from './types';
import { ApiClient } from './api-client';

// This is a helper function to ensure the data from the API matches your MenuItem type.
// In your src/lib/menu-service.ts file, update the normalizeMenuItem function:

function normalizeMenuItem(raw: any): MenuItem {
  if (!raw) return raw as MenuItem;
  return {
    id: String(raw.id),
    name: raw.name,
    price: Number(raw.price ?? 0),
    description: raw.description ?? '',
    imageUrl: raw.image_url ?? raw.imageUrl ?? '',
    category: raw.category ?? '',
    is_available: Boolean(raw.is_available ?? raw.isAvailable ?? true),
    branchId: raw.branch_id ?? raw.branchId ?? undefined,
    ingredients: Array.isArray(raw.ingredients) ? raw.ingredients : [],
  };
}

// Fetch all menu items for a specific branch
export async function getMenuItems(branchId: string): Promise<MenuItem[]> {
  if (!branchId) return [];
  const data = await ApiClient.get(`/branches/${branchId}/menu`);
  return Array.isArray(data) ? data.map(normalizeMenuItem) : [];
}

// Add a new menu item using FormData
export async function addMenuItem(formData: FormData): Promise<MenuItem> {
  const branchId = formData.get('branch_id');
  if (!branchId) {
    throw new Error('Branch ID is required to create a menu item.');
  }
  const data = await ApiClient.post(`/branches/${branchId}/menu`, formData);
  return normalizeMenuItem(data);
}

// ✅ CORRECTED: Update an existing menu item. Now accepts FormData and itemId.
export async function updateMenuItem(formData: FormData, itemId: string): Promise<MenuItem> {
  const branchId = formData.get('branch_id');
  if (!branchId) {
    throw new Error('Branch ID is required to update a menu item.');
  }
  // The backend endpoint requires the item ID in the URL.
  const data = await ApiClient.put(`/branches/${branchId}/menu/${itemId}`, formData);
  return normalizeMenuItem(data);
}

// Delete a menu item by id
export async function deleteMenuItem(itemId: string | number, branchId: string | number): Promise<void> {
  const url = `/branches/${branchId}/menu/${itemId}`;
  await ApiClient.delete(url);
}
