'use server';

import type { DailySale } from './types';
import { DAILY_SALES } from './data';

// Simulate a database for daily sales
let dailySales: DailySale[] = [...DAILY_SALES];

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function getDailySales(): Promise<DailySale[]> {
  await delay(100);
  // Return a deep copy to prevent direct mutation
  return JSON.parse(JSON.stringify(dailySales));
}

export async function updateDailySale(itemId: string, newQuantity: number): Promise<void> {
  await delay(50);
  const sale = dailySales.find(s => s.itemId === itemId);
  if (sale) {
    sale.quantity = newQuantity;
  } else {
    dailySales.push({ itemId, quantity: newQuantity });
  }
}

export async function resetDailySales(): Promise<void> {
    await delay(100);
    dailySales.forEach(sale => {
        sale.quantity = 0;
    });
}
