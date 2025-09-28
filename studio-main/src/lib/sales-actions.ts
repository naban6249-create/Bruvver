'use server';

import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000/api';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export async function updateDailySaleServer(branchId: string | number, itemId: string | number, quantity: number) {
  const headers = await getAuthHeaders();
  const resp = await fetch(`${API_BASE_URL}/branches/${branchId}/daily-sales/${itemId}`, {
    method: 'PUT',
    headers,
    body: new URLSearchParams({ quantity: String(quantity) }),
    cache: 'no-store',
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(text || `Failed to update daily sale: ${resp.status}`);
  }
  return resp.json();
}
