'use server';

import type { DailySale } from './types';
import { cookies } from 'next/headers';

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

export async function getDailySales(branchId?: string, date?: string): Promise<DailySale[]> {
  try {
    const headers = await getAuthHeaders();
    let url = `${API_BASE_URL}/sales`;
    const params = new URLSearchParams();
    
    if (branchId) params.append('branch_id', branchId);
    if (date) params.append('date_filter', date);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    const response = await fetch(url, {
      headers,
      cache: 'no-store',
    });
    
    return await handleResponse(response);
  } catch (error) {
    console.error("Failed to get daily sales:", error);
    return [];
  }
}

export async function recordSale(saleData: {
  menu_item_id: string;
  quantity: number;
  branch_id: number;
}): Promise<any> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/sales`, {
    method: 'POST',
    headers,
    body: JSON.stringify(saleData),
  });
  return handleResponse(response);
}

export async function getSalesSummary(branchId?: string, date?: string): Promise<any> {
  try {
    const headers = await getAuthHeaders();
    let url = `${API_BASE_URL}/sales/summary`;
    const params = new URLSearchParams();
    
    if (branchId) params.append('branch_id', branchId);
    if (date) params.append('date_filter', date);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    const response = await fetch(url, {
      headers,
      cache: 'no-store',
    });
    
    return await handleResponse(response);
  } catch (error) {
    console.error("Failed to get sales summary:", error);
    return { total_items_sold: 0, total_revenue: 0, sales_by_item: [] };
  }
}

export async function updateDailySale(branchId: string, itemId: string, newQuantity: number): Promise<void> {
  // This would typically record a new sale rather than update existing
  await recordSale({
    menu_item_id: itemId,
    quantity: newQuantity,
    branch_id: parseInt(branchId)
  });
}

export async function resetDailySales(branchId: string): Promise<void> {
  // This would trigger the daily reset endpoint
  const headers = await getAuthHeaders();
  await fetch(`${API_BASE_URL}/admin/daily-reset`, {
    method: 'POST',
    headers,
  });
}