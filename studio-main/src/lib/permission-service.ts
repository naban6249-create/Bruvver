// lib/permission-service.ts
import type { UserPermissionSummary, UserBranchPermissionCreate } from './types';
import { ApiClient } from './api-client';

export async function getAllUserPermissions(): Promise<UserPermissionSummary[]> {
  return ApiClient.get('/admin/user-permissions');
}

// Admin: grant a worker full access to ALL branches
export async function grantAllBranchesFullAccess(userId: number): Promise<{ updated: number }> {
  return ApiClient.post(`/admin/grant-all-branches-full-access/${userId}`);
}

// Admin: limit a worker to a single branch (full_access on that branch; remove others)
export async function limitToSingleBranch(userId: number, branchId: number): Promise<{ limited_to_branch_id: number }> {
  return ApiClient.post(`/admin/limit-to-single-branch/${userId}/${branchId}`);
}

export async function assignBranchPermission(data: UserBranchPermissionCreate): Promise<any> {
  return ApiClient.post('/admin/assign-branch-permission', data);
}

export async function revokeBranchPermission(userId: number, branchId: number): Promise<void> {
  await ApiClient.delete(`/admin/revoke-branch-permission/${userId}/${branchId}`);
}

export async function updateBranchPermission(
  userId: number, 
  branchId: number, 
  permissionLevel: 'view_only' | 'full_access'
): Promise<any> {
  return ApiClient.post('/admin/assign-branch-permission', {
    user_id: userId,
    branch_id: branchId,
    permission_level: permissionLevel
  });
}
