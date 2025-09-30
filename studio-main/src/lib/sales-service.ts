import type { DailySale } from './types';
import { ApiClient } from './api-client';

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
  const url = `/reports/sales-summary${params.toString() ? `?${params.toString()}` : ''}`;
  return ApiClient.get(url);
}

export async function getDailySales(branchId: string, date?: string): Promise<DailySale[]> {
  // Use branch-scoped endpoint and pass date_filter per backend contract
  const params = new URLSearchParams();
  if (date) params.append('date_filter', date);

  const url = `/branches/${branchId}/daily-sales${params.toString() ? `?${params.toString()}` : ''}`;
  const sales = await ApiClient.get(url);
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
  const formData = new FormData();
  formData.append('quantity', quantity.toString());

  const sale = await ApiClient.put(`/branches/${branchId}/daily-sales/${itemId}`, formData);
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

  return ApiClient.get(`/sales/summary?${params.toString()}`);
}

export async function resetDailySales(branchId: string): Promise<void> {
  await ApiClient.post('/admin/daily-reset', { branchId });
}

// Admin-only: Reset data for a specific branch.
// scope: 'today' => clears today's sales/expenses/reports for that branch
//        'all'   => clears all historical sales/expenses/reports for that branch
export async function resetBranchData(branchId: string | number, scope: 'today' | 'all' = 'today'): Promise<{ message: string } & Record<string, any>> {
  return ApiClient.post(`/admin/branch-reset/${branchId}?scope=${scope}`);
}
