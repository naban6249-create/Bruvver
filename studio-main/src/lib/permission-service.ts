// lib/permission-service.ts
import type { UserPermissionSummary, UserBranchPermissionCreate } from './types';

// Use unified API base (must include '/api')
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000/api';

const getAuthHeader = (): Record<string, string> => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export async function getAllUserPermissions(): Promise<UserPermissionSummary[]> {
  const response = await fetch(`${API_BASE}/admin/user-permissions`, {
    headers: { ...getAuthHeader() },
    cache: 'no-store',
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch user permissions: ${response.statusText}`);
  }
  
  return response.json();
}

// Admin: grant a worker full access to ALL branches
export async function grantAllBranchesFullAccess(userId: number): Promise<{ updated: number }> {
  const response = await fetch(`${API_BASE}/admin/grant-all-branches-full-access/${userId}`, {
    method: 'POST',
    headers: { ...getAuthHeader() },
    cache: 'no-store',
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Failed to grant full access: ${err}`);
  }
  return response.json();
}

// Admin: limit a worker to a single branch (full_access on that branch; remove others)
export async function limitToSingleBranch(userId: number, branchId: number): Promise<{ limited_to_branch_id: number }> {
  const response = await fetch(`${API_BASE}/admin/limit-to-single-branch/${userId}/${branchId}`, {
    method: 'POST',
    headers: { ...getAuthHeader() },
    cache: 'no-store',
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Failed to limit to single branch: ${err}`);
  }
  return response.json();
}

export async function assignBranchPermission(data: UserBranchPermissionCreate): Promise<any> {
  const response = await fetch(`${API_BASE}/admin/assign-branch-permission`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify(data),
    cache: 'no-store',
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to assign permission: ${errorText}`);
  }
  
  return response.json();
}

export async function revokeBranchPermission(userId: number, branchId: number): Promise<void> {
  const response = await fetch(`${API_BASE}/admin/revoke-branch-permission/${userId}/${branchId}`, {
    method: 'DELETE',
    headers: { ...getAuthHeader() },
    cache: 'no-store',
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to revoke permission: ${errorText}`);
  }
}

export async function updateBranchPermission(
  userId: number, 
  branchId: number, 
  permissionLevel: 'view_only' | 'full_access'
): Promise<any> {
  const response = await fetch(`${API_BASE}/admin/assign-branch-permission`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify({
      user_id: userId,
      branch_id: branchId,
      permission_level: permissionLevel
    }),
    cache: 'no-store',
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update permission: ${errorText}`);
  }
  
  return response.json();
}