import type { DailySale } from './types';
import Cookies from 'js-cookie';

// Keep this consistent with menu-service.ts
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000/api';

function getBrowserToken(): string | null {
  if (typeof window === 'undefined') return null;
  // Prefer cookies set by the app's login flow
  const cookieToken =
    Cookies.get('token') ||
    Cookies.get('authToken') ||
    Cookies.get('access_token') ||
    Cookies.get('jwt') ||
    null;
  if (cookieToken) return cookieToken;
  // Fallback to localStorage if present
  try {
    const lsToken = window.localStorage.getItem('token');
    return lsToken;
  } catch {
    return null;
  }
}

// Real sales summary for day/week/month
export interface RealSalesBucket { total_items_sold: number; total_revenue: number }
export interface RealSalesSummary {
  branch_id: number | null;
  day: RealSalesBucket;
  week: RealSalesBucket;
  month: RealSalesBucket;
}

export async function getRealSalesSummary(branchId?: string): Promise<RealSalesSummary> {
  const params = new URLSearchParams();
  if (branchId) params.append('branch_id', branchId);
  const url = `${API_BASE}/reports/sales-summary${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetch(url, {
    headers: { ...getAuthHeader() },
    cache: 'no-store',
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch real sales summary: ${text || response.statusText}`);
  }
  return response.json();
}

const getAuthHeader = (): Record<string, string> => {
  const token = getBrowserToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export async function getDailySales(branchId: string, date?: string): Promise<DailySale[]> {
  // Use branch-scoped endpoint and pass date_filter per backend contract
  const params = new URLSearchParams();
  if (date) params.append('date_filter', date);

  const url = `${API_BASE}/branches/${branchId}/daily-sales${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetch(url, { headers: { ...getAuthHeader() }, cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to fetch sales: ${response.statusText}`);
  }
  const sales = await response.json();
  return sales.map((sale: any) => ({
    id: sale.id,
    itemId: String(sale.menu_item_id),
    branchId: sale.branch_id,
    quantity: sale.quantity,
    revenue: sale.revenue,
    saleDate: sale.sale_date
  }));
}

export async function updateDailySale(branchId: string, itemId: string, quantity: number): Promise<DailySale> {
  const response = await fetch(`${API_BASE}/branches/${branchId}/daily-sales/${itemId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      ...getAuthHeader()
    },
    body: new URLSearchParams({ quantity: quantity.toString() }),
    cache: 'no-store',
  });
  
  if (!response.ok) {
    throw new Error(`Failed to update sale: ${response.statusText}`);
  }
  
  const sale = await response.json();
  return {
    id: sale.id,
    itemId: String(sale.menu_item_id),
    branchId: sale.branch_id,
    quantity: sale.quantity,
    revenue: sale.revenue,
    saleDate: sale.sale_date
  };
}

export async function getSalesSummary(branchId: string, date?: string): Promise<any> {
  const params = new URLSearchParams({ branch_id: branchId });
  if (date) params.append('date_filter', date);
  
  const response = await fetch(`${API_BASE}/sales/summary?${params.toString()}`, {
    headers: { ...getAuthHeader() },
    cache: 'no-store',
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch sales summary: ${response.statusText}`);
  }
  
  return response.json();
}

export async function resetDailySales(branchId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/admin/daily-reset`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify({ branchId }),
    cache: 'no-store',
  });
  
  if (!response.ok) {
    throw new Error(`Failed to reset sales: ${response.statusText}`);
  }
}

// Admin-only: Reset data for a specific branch.
// scope: 'today' => clears today's sales/expenses/reports for that branch
//        'all'   => clears all historical sales/expenses/reports for that branch
export async function resetBranchData(branchId: string | number, scope: 'today' | 'all' = 'today'): Promise<{ message: string } & Record<string, any>> {
  const url = `${API_BASE}/admin/branch-reset/${branchId}?scope=${scope}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { ...getAuthHeader() },
    cache: 'no-store',
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to reset branch data: ${errorText}`);
  }
  return response.json();
}