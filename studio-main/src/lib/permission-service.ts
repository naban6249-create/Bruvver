'use server';

import { cookies } from 'next/headers';
import type { User, UserBranchPermission } from './types';

// Ensure this points to your running backend API
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000/api';

// --- Reusable Helper Functions ---

async function getAuthHeaders(): Promise<Record<string, string>> {
  const cookieStore = cookies();
  const token = cookieStore.get('token')?.value;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse(response: Response) {
  if (!response.ok) {
    const errorText = await response.text();
    console.error("API Error:", errorText);
    try {
      const errorJson = JSON.parse(errorText);
      if (errorJson.detail) {
        throw new Error(errorJson.detail);
      }
    } catch (e) {
      throw new Error(`API call failed with status ${response.status}: ${errorText}`);
    }
  }
  return response.status === 204 ? null : response.json();
}


// --- Permission Service Functions ---

/**
 * Fetches a list of all users and their detailed branch permissions.
 * Intended for admin use in the permissions management UI.
 */
export async function getAllUserPermissions(): Promise<User[]> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/admin/user-permissions`, {
      headers,
      cache: 'no-store', // Always fetch fresh data
    });
    return await handleResponse(response);
  } catch (error) {
    console.error("Failed to get user permissions:", error);
    return [];
  }
}

/**
 * Assigns or updates a user's permission for a specific branch.
 * Intended for admin use.
 */
export async function assignBranchPermission(permissionData: {
  user_id: number;
  branch_id: number;
  permission_level: 'view_only' | 'full_access';
}): Promise<UserBranchPermission> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/admin/assign-permission`, {
    method: 'POST',
    headers,
    body: JSON.stringify(permissionData),
  });
  return handleResponse(response);
}

/**
 * Revokes a user's permission from a specific branch.
 * Intended for admin use.
 */
export async function revokeBranchPermission(userId: number, branchId: number): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/admin/revoke-permission/${userId}/${branchId}`, {
    method: 'DELETE',
    headers,
  });
  await handleResponse(response);
}