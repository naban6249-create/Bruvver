"use server";

import type { DailyExpense } from './types';
import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';

// Helper to get authenticated headers
async function getAuthHeaders(): Promise<Record<string, string>> {
  const cookieStore = cookies(); // Correct: No 'await'
  const token = cookieStore.get('token')?.value;

  // --- Debugging ---
  console.log('[Expenses Service] All cookies received:', cookieStore.getAll());
  if (token) {
    console.log('[Expenses Service] Auth token FOUND.');
  } else {
    console.log('[Expenses Service] Auth token NOT FOUND.');
  }
  // --- End Debugging ---

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// Helper to handle API responses (supports 204 and empty bodies)
async function handleResponse(response: Response) {
  if (!response.ok) {
    const errorText = await response.text();
    console.error("API Error:", errorText);
    try {
      const errorJson = errorText ? JSON.parse(errorText) : null;
      if (errorJson?.detail) {
        throw new Error(errorJson.detail);
      }
    } catch (e) {
      // fall through to generic error
    }
    throw new Error(`API call failed with status ${response.status}: ${errorText}`);
  }
  if (response.status === 204) return null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

// ... (rest of the functions: getRealExpenseSummary, getDailyExpenses, etc.)
// No changes needed in the functions below, as they all use getAuthHeaders()

export interface RealExpenseBucket { total_expenses: number; expense_count: number }
export interface RealExpenseSummary {
  branch_id: number | null;
  day: RealExpenseBucket;
  week: RealExpenseBucket;
  month: RealExpenseBucket;
}

export async function getRealExpenseSummary(branchId?: string): Promise<RealExpenseSummary> {
  const headers = await getAuthHeaders();
  const params = new URLSearchParams();
  if (branchId) params.append('branch_id', branchId);
  const url = `${API_BASE_URL}/reports/expense-summary${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetch(url, { headers, cache: 'no-store' });
  return handleResponse(response);
}

export async function getDailyExpenses(branchId?: string, date?: string, category?: string): Promise<DailyExpense[]> {
  try {
    const headers = await getAuthHeaders();
    let url = `${API_BASE_URL}/expenses`;
    const params = new URLSearchParams();
    
    if (branchId) params.append('branch_id', branchId);
    if (date) params.append('date', date);
    if (category) params.append('category', category);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    const response = await fetch(url, {
      headers,
      cache: 'no-store',
    });
    
    return await handleResponse(response);
  } catch (error) {
    console.error("Failed to get daily expenses:", error);
    return [];
  }
}

export async function addDailyExpense(expenseData: {
  branch_id: number;
  category: string;
  item_name: string;
  description?: string;
  quantity?: number;
  unit?: string;
  unit_cost: number;
  total_amount: number;
  expense_date?: string;
  receipt_number?: string;
  vendor?: string;
}): Promise<DailyExpense> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/expenses`, {
    method: 'POST',
    headers,
    body: JSON.stringify(expenseData),
  });
  return handleResponse(response);
}

export async function addQuickExpense(expenseData: {
  item_name: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  branch_id: number;
  expense_date?: string;
}): Promise<DailyExpense> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/expenses/quick-add`, {
    method: 'POST',
    headers,
    body: JSON.stringify(expenseData),
  });
  return handleResponse(response);
}

export async function updateDailyExpense(expenseId: number, expenseData: Partial<DailyExpense>): Promise<DailyExpense> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/expenses/${expenseId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(expenseData),
  });
  return handleResponse(response);
}

export async function deleteDailyExpense(expenseId: number): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/expenses/${expenseId}`, {
    method: 'DELETE',
    headers,
  });
  await handleResponse(response);
}

export async function getExpenseSummary(branchId?: string, date?: string): Promise<any> {
  try {
    const headers = await getAuthHeaders();
    let url = `${API_BASE_URL}/expenses/summary`;
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
    console.error("Failed to get expense summary:", error);
    return { total_expenses: 0, expense_count: 0, category_breakdown: [] };
  }
}

export async function getExpenseCategories(): Promise<any[]> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/expense-categories`, {
      headers,
      cache: 'no-store',
    });
    return await handleResponse(response);
  } catch (error) {
    console.error("Failed to get expense categories:", error);
    return [];
  }
}
