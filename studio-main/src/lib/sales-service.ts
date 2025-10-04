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

// Get all individual sale transactions for a branch and date
export async function getDailySales(branchId: string, date?: string): Promise<DailySale[]> {
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
    paymentMethod: sale.payment_method || 'cash',
    saleDate: sale.sale_date
  }));
}

// Create a new sale transaction
export async function createSale(
  branchId: number,
  menuItemId: string,
  quantity: number = 1,
  paymentMethod: 'cash' | 'gpay' = 'cash'
): Promise<DailySale> {
  const saleData = {
    menu_item_id: menuItemId,
    branch_id: branchId,
    quantity: quantity,
    payment_method: paymentMethod
  };

  const sale = await ApiClient.post('/sales', saleData);
  return {
    id: sale.id,
    itemId: String(sale.menu_item_id),
    branchId: sale.branch_id,
    quantity: sale.quantity,
    revenue: sale.revenue,
    paymentMethod: sale.payment_method || 'cash',
    saleDate: sale.sale_date
  };
}

// Delete the most recent sale for a specific item
export async function deleteLastSale(
  branchId: number,
  menuItemId: string,
  paymentMethod?: 'cash' | 'gpay'
): Promise<void> {
  const params = new URLSearchParams({
    menu_item_id: menuItemId,
    branch_id: branchId.toString()
  });
  
  if (paymentMethod) {
    params.append('payment_method', paymentMethod);
  }

  await ApiClient.delete(`/sales/last?${params.toString()}`);
}

export async function getSalesSummary(branchId: string, date?: string): Promise<any> {
  const params = new URLSearchParams({ branch_id: branchId });
  if (date) params.append('date_filter', date);

  return ApiClient.get(`/sales/summary?${params.toString()}`);
}

export async function resetDailySales(branchId: string): Promise<void> {
  await ApiClient.post('/admin/daily-reset', { branchId });
}

export async function resetBranchData(branchId: string | number, scope: 'today' | 'all' = 'today'): Promise<{ message: string } & Record<string, any>> {
  return ApiClient.post(`/admin/branch-reset/${branchId}?scope=${scope}`);
}
