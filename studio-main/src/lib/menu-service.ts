'use client';
import type { MenuItem } from './types';
import { ApiClient } from './api-client';

// Helper function to normalize API response to MenuItem type
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

// Update an existing menu item using FormData and itemId
export async function updateMenuItem(formData: FormData, itemId: string): Promise<MenuItem> {
  console.log('\n=== UPDATE MENU ITEM FUNCTION START ===');
  console.log('📍 itemId parameter:', itemId);
  
  // Log ALL FormData entries
  console.log('📦 FormData received in updateMenuItem:');
  const keys = Array.from(formData.keys());
  console.log('   Total keys:', keys.length);
  console.log('   Key names:', keys);
  
  keys.forEach(key => {
    const value = formData.get(key);
    if (value instanceof File) {
      console.log(`   ${key}: [File: ${value.name}, size: ${value.size} bytes]`);
    } else {
      console.log(`   ${key}: "${value}" (type: ${typeof value})`);
    }
  });
  
  // Try to get branch_id
  const branchId = formData.get('branch_id');
  console.log('\n🔍 Attempting to get branch_id...');
  console.log('   Result:', branchId);
  console.log('   Type:', typeof branchId);
  console.log('   Is null?', branchId === null);
  console.log('   Is empty string?', branchId === '');
  console.log('   Truthy?', !!branchId);
  
  if (!branchId) {
    console.error('\n❌ CRITICAL ERROR: No branch_id in FormData!');
    console.error('This means branch_id was either:');
    console.error('  1. Never added to FormData');
    console.error('  2. Lost during function call');
    console.error('  3. Set to null/undefined');
    console.error('\nAvailable FormData keys:', Array.from(formData.keys()));
    throw new Error('Branch ID is required to update a menu item.');
  }
  
  const url = `/branches/${branchId}/menu/${itemId}`;
  console.log('\n🌐 Constructed API URL:', url);
  console.log('   Base URL:', process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api');
  console.log('   Full URL:', `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api'}${url}`);
  
  console.log('\n📤 Calling ApiClient.put...');
  const data = await ApiClient.put(url, formData);
  
  console.log('✅ API Response received');
  console.log('=== UPDATE MENU ITEM FUNCTION END ===\n');
  
  return normalizeMenuItem(data);
}
// Delete a menu item by id
export async function deleteMenuItem(itemId: string | number, branchId: string | number): Promise<void> {
  const url = `/branches/${branchId}/menu/${itemId}`;
  await ApiClient.delete(url);
}
