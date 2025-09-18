"use server";

import type { DailyExpense } from './types';
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