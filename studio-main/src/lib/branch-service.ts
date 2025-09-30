// lib/branch-service.ts
import type { Branch } from './types';
import { ApiClient } from './api-client';

export async function getBranches(): Promise<Branch[]> {
  return ApiClient.get('/branches');
}

export async function addBranch(branchData: Omit<Branch, 'id' | 'created_at' | 'updated_at'>): Promise<Branch> {
  return ApiClient.post('/branches', branchData);
}

export async function updateBranch(branchId: number, branchData: Partial<Branch>): Promise<Branch> {
  return ApiClient.put(`/branches/${branchId}`, branchData);
}

export async function deleteBranch(branchId: number): Promise<void> {
  await ApiClient.delete(`/branches/${branchId}`);
}
