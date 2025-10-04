'use client';

import { ApiClient } from './api-client'; // ✅ Use ApiClient

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

export interface WorkerCashBalanceSummary {
  opening_balance: number;
  cash_collections: number;
  total_expenses: number;
  expected_closing_cash: number;
  transaction_count: number;
}

export async function getOpeningBalance(
  branchId: string, 
  date?: string
): Promise<number> {
  try {
    let url = `/branches/${branchId}/opening-balance`;
    const params = new URLSearchParams();

    if (date) params.append('date', date);
    params.append('_t', Date.now().toString());

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const data = await ApiClient.get(url);
    return data?.amount || 0;
  } catch (error) {
    console.error("Failed to get opening balance:", error);
    return 0;
  }
}

export async function updateOpeningBalance(
  branchId: string, 
  amount: number, 
  date?: string
): Promise<OpeningBalance> {
  const requestBody: any = { amount };
  if (date) requestBody.date = date;

  return ApiClient.post(`/branches/${branchId}/opening-balance`, requestBody);
}

export async function getWorkerCashBalance(date?: string): Promise<WorkerCashBalanceSummary> {
  try {
    let url = '/worker/cash-balance';
    const params = new URLSearchParams();

    if (date) params.append('date_filter', date);
    params.append('_t', Date.now().toString());

    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    return await ApiClient.get(url);
  } catch (error) {
    console.error("Failed to get worker cash balance:", error);
    return {
      opening_balance: 0,
      cash_collections: 0,
      total_expenses: 0,
      expected_closing_cash: 0,
      transaction_count: 0,
    };
  }
}

export async function getDailyBalanceSummary(
  branchId: string, 
  date?: string
): Promise<DailyBalanceSummary> {
  try {
    let url = `/branches/${branchId}/daily-balance`;
    const params = new URLSearchParams();

    if (date) params.append('date', date);
    params.append('_t', Date.now().toString());

    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    const data = await ApiClient.get(url);

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
