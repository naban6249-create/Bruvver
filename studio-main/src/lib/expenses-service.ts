// expenses-service.ts - CONVERT TO CLIENT-SIDE
'use client'; // ✅ Changed from "use server" to "use client"

import type { DailyExpense } from './types';
import { ApiClient } from './api-client'; // ✅ Use ApiClient instead of raw fetch

export interface RealExpenseBucket { 
  total_expenses: number; 
  expense_count: number;
}

export interface RealExpenseSummary {
  branch_id: number | null;
  day: RealExpenseBucket;
  week: RealExpenseBucket;
  month: RealExpenseBucket;
}

export async function getRealExpenseSummary(branchId?: string): Promise<RealExpenseSummary> {
  const params = new URLSearchParams();
  if (branchId) params.append('branch_id', branchId);
  const url = `/reports/expense-summary${params.toString() ? `?${params.toString()}` : ''}`;
  return ApiClient.get(url);
}

export async function getDailyExpenses(
  branchId?: string, 
  date?: string, 
  category?: string
): Promise<DailyExpense[]> {
  try {
    let url = '/expenses';
    const params = new URLSearchParams();
    
    if (branchId) params.append('branch_id', branchId);
    if (date) params.append('date', date);
    if (category) params.append('category', category);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    const expenses = await ApiClient.get(url);
    return expenses || [];
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
  return ApiClient.post('/expenses', expenseData);
}

export async function addQuickExpense(expenseData: {
  item_name: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  branch_id: number;
  expense_date?: string;
}): Promise<DailyExpense> {
  return ApiClient.post('/expenses/quick-add', expenseData);
}

export async function updateDailyExpense(
  expenseId: number, 
  expenseData: Partial<DailyExpense>
): Promise<DailyExpense> {
  return ApiClient.put(`/expenses/${expenseId}`, expenseData);
}

export async function deleteDailyExpense(expenseId: number): Promise<void> {
  await ApiClient.delete(`/expenses/${expenseId}`);
}

export async function getExpenseSummary(
  branchId?: string, 
  date?: string
): Promise<any> {
  try {
    let url = '/expenses/summary';
    const params = new URLSearchParams();
    
    if (branchId) params.append('branch_id', branchId);
    if (date) params.append('date_filter', date);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    return await ApiClient.get(url);
  } catch (error) {
    console.error("Failed to get expense summary:", error);
    return { 
      total_expenses: 0, 
      expense_count: 0, 
      category_breakdown: [] 
    };
  }
}

export async function getExpenseCategories(): Promise<any[]> {
  try {
    return await ApiClient.get('/expense-categories');
  } catch (error) {
    console.error("Failed to get expense categories:", error);
    return [];
  }
}
