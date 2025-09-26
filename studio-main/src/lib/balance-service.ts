"use server";

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
  // No content
  if (response.status === 204) return null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

export interface OpeningBalance {
  id: number;
  branch_id: number;
  amount: number;
  date: string;
  created_at: string;
  updated_at: string;
}

export interface DailyBalanceSummary {
  openingBalance: number;
  totalRevenue: number;
  totalExpenses: number;
  calculatedBalance: number;
  transactionCount: number;
}

export async function getOpeningBalance(branchId: string, date?: string): Promise<number> {
  try {
    const headers = await getAuthHeaders();
    let url = `${API_BASE_URL}/branches/${branchId}/opening-balance`;
    const params = new URLSearchParams();

    if (date) params.append('date', date);

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response = await fetch(url, {
      headers,
      cache: 'no-store',
    });

    const data = await handleResponse(response);

    // If no opening balance exists, return 0
    if (!data || !data.amount) {
      return 0;
    }

    return data.amount;
  } catch (error) {
    console.error("Failed to get opening balance:", error);
    return 0; // Return 0 as fallback
  }
}

export async function updateOpeningBalance(branchId: string, amount: number, date?: string): Promise<OpeningBalance> {
  const headers = await getAuthHeaders();

  const requestBody: any = { amount };
  if (date) requestBody.date = date;

  const response = await fetch(`${API_BASE_URL}/branches/${branchId}/opening-balance`, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody),
    cache: 'no-store',
  });

  return handleResponse(response);
}

export async function getDailyBalanceSummary(branchId: string, date?: string): Promise<DailyBalanceSummary> {
  try {
    const headers = await getAuthHeaders();
    let url = `${API_BASE_URL}/branches/${branchId}/daily-balance`;
    const params = new URLSearchParams();

    if (date) params.append('date', date);

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response = await fetch(url, {
      headers,
      cache: 'no-store',
    });

    const data = await handleResponse(response);

    return {
      openingBalance: data.opening_balance || 0,
      totalRevenue: data.total_revenue || 0,
      totalExpenses: data.total_expenses || 0,
      calculatedBalance: (data.opening_balance || 0) + (data.total_revenue || 0) - (data.total_expenses || 0),
      transactionCount: data.transaction_count || 0,
    };
  } catch (error) {
    console.error("Failed to get daily balance summary:", error);
    return {
      openingBalance: 0,
      totalRevenue: 0,
      totalExpenses: 0,
      calculatedBalance: 0,
      transactionCount: 0,
    };
  }
}
