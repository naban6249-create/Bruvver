// lib/user-service.ts
import type { User } from './types';
import Cookies from 'js-cookie';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000/api';

const getAuthHeader = (): Record<string, string> => {
  let token: string | null = null;
  if (typeof window !== 'undefined') {
    token = Cookies.get('token') || Cookies.get('authToken') || Cookies.get('access_token') || Cookies.get('jwt') || localStorage.getItem('token');
  }
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export interface CreateWorkerInput {
  full_name: string;
  username: string;
  email: string;
  password: string;
  role?: 'admin' | 'worker';
}

export async function createWorker(input: CreateWorkerInput): Promise<User> {
  const payload = {
    full_name: input.full_name,
    username: input.username,
    email: input.email,
    password: input.password,
    role: input.role || 'worker'
  } as Record<string, any>;

  const response = await fetch(`${API_BASE}/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Failed to create worker: ${err}`);
  }
  return response.json();
}

export async function updateUser(userId: number, data: Partial<Pick<User, 'full_name' | 'username' | 'email' | 'role' | 'is_active'>>): Promise<User> {
  // Build payload with only meaningful values to avoid 422s from empty strings
  const payload: Record<string, any> = {};
  if (typeof data.full_name === 'string' && data.full_name.trim().length > 0) payload.full_name = data.full_name.trim();
  if (typeof data.username === 'string' && data.username.trim().length > 0) payload.username = data.username.trim();
  if (typeof data.email === 'string' && data.email.trim().length > 0) payload.email = data.email.trim();
  if (typeof data.role === 'string' && (data.role === 'admin' || data.role === 'worker')) payload.role = data.role;
  if (typeof data.is_active === 'boolean') payload.is_active = data.is_active;

  const response = await fetch(`${API_BASE}/admin/users/${userId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Failed to update user: ${err}`);
  }
  return response.json();
}

export async function setUserPassword(userId: number, newPassword: string): Promise<void> {
  const url = `${API_BASE}/admin/users/${userId}/password?new_password=${encodeURIComponent(newPassword)}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { ...getAuthHeader() },
    cache: 'no-store',
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Failed to set password: ${err}`);
  }
}

export async function deactivateUser(userId: number): Promise<void> {
  const response = await fetch(`${API_BASE}/admin/users/${userId}`, {
    method: 'DELETE',
    headers: { ...getAuthHeader() },
    cache: 'no-store',
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Failed to deactivate user: ${err}`);
  }
}

export async function getAllUsers(): Promise<User[]> {
  const response = await fetch(`${API_BASE}/admin/users-lite`, {
    headers: { ...getAuthHeader() },
    cache: 'no-store',
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Failed to load users: ${err}`);
  }
  return response.json();
}
