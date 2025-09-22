// lib/branch-service.ts
import type { Branch } from './types';

// Use unified API base (must include '/api')
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000/api';

const getAuthHeader = (): Record<string, string> => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export async function getBranches(): Promise<Branch[]> {
  const response = await fetch(`${API_BASE}/branches`, {
    headers: { ...getAuthHeader() },
    cache: 'no-store',
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch branches: ${response.statusText}`);
  }
  
  return response.json();
}

export async function addBranch(branchData: Omit<Branch, 'id' | 'created_at' | 'updated_at'>): Promise<Branch> {
  const response = await fetch(`${API_BASE}/branches`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify(branchData),
    cache: 'no-store',
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create branch: ${errorText}`);
  }
  
  return response.json();
}

export async function updateBranch(branchId: number, branchData: Partial<Branch>): Promise<Branch> {
  const response = await fetch(`${API_BASE}/branches/${branchId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify(branchData),
    cache: 'no-store',
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update branch: ${errorText}`);
  }
  
  return response.json();
}

export async function deleteBranch(branchId: number): Promise<void> {
  const response = await fetch(`${API_BASE}/branches/${branchId}`, {
    method: 'DELETE',
    headers: { ...getAuthHeader() },
    cache: 'no-store',
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to delete branch: ${errorText}`);
  }
}