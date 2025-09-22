"use server";

import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function handleResponse(response: Response) {
  if (!response.ok) {
    const text = await response.text();
    try {
      const json = text ? JSON.parse(text) : null;
      if (json?.detail) throw new Error(json.detail);
    } catch (_) {
      // ignore
    }
    throw new Error(`Request failed (${response.status}): ${text}`);
  }
  if (response.status === 204) return null;
  const ct = response.headers.get('content-type') || '';
  if (ct.includes('application/json')) return response.json();
  const t = await response.text();
  return t ? JSON.parse(t) : null;
}

export async function exportToSheets(date: string, branchId?: string): Promise<{ message: string } | null> {
  const headers = await getAuthHeaders();
  const body: any = { date };
  if (branchId) body.branch_id = Number(branchId);
  const res = await fetch(`${API_BASE_URL}/reports/export-to-sheets`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  return handleResponse(res);
}
