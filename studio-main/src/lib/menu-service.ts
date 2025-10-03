'use client';
import type { MenuItem } from './types';
import { ApiClient } from './api-client';

// Helper function to normalize API response to MenuItem type

function normalizeMenuItem(raw: any): MenuItem {
  if (!raw) return raw as MenuItem;

  const normalized: MenuItem = {
    id: String(raw.id),
    name: raw.name,
    price: Number(raw.price ?? 0),
    description: raw.description ?? '',
    imageUrl: raw.image_url ?? raw.imageUrl ?? raw.image ?? raw.photo ?? '',
    category: raw.category ?? '',
    is_available: Boolean(raw.is_available ?? raw.isAvailable ?? true),
    branchId: raw.branch_id ?? raw.branchId ?? undefined,
    ingredients: Array.isArray(raw.ingredients) ? raw.ingredients : [],
  };

  // ✅ Debug log
  console.log("🖼️ Normalized image URL:", normalized.imageUrl, "for item:", normalized.name);

  return normalized;
}



// Fetch all menu items for a specific branch
export async function getMenuItems(branchId: string): Promise<MenuItem[]> {
  if (!branchId) return [];
  const data = await ApiClient.get(`/branches/${branchId}/menu`);
  const items = Array.isArray(data) ? data.map(normalizeMenuItem) : [];

  // ✅ Debug log after normalization
  items.forEach((item) => {
    console.log("🖼️ Item:", item.name, "URL:", item.imageUrl);
  });

  return items;
}


// Add a new menu item using FormData
export async function addMenuItem(formData: FormData, branchId: string): Promise<MenuItem> {
  if (!branchId) {
    throw new Error('Branch ID is required to create a menu item.');
  }
  
  // Ensure branch_id is in FormData
  formData.set('branch_id', branchId);
  
  const data = await ApiClient.post(`/branches/${branchId}/menu`, formData);
  return normalizeMenuItem(data);
}

// Update an existing menu item using FormData and itemId
export async function updateMenuItem(formData: FormData, itemId: string, branchId: string): Promise<MenuItem> {
  if (!branchId) {
    throw new Error('Branch ID is required to update a menu item.');
  }
  
  // Ensure branch_id is in FormData - do this right before the API call
  formData.set('branch_id', branchId);
  
  const data = await ApiClient.put(`/branches/${branchId}/menu/${itemId}`, formData);
  return normalizeMenuItem(data);
}

// Delete a menu item by id
export async function deleteMenuItem(itemId: string | number, branchId: string | number): Promise<void> {
  const url = `/branches/${branchId}/menu/${itemId}`;
  await ApiClient.delete(url);
}
