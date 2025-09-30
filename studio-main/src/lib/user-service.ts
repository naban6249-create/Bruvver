// lib/user-service.ts
import type { User } from './types';
import { ApiClient } from './api-client';

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

  return ApiClient.post('/admin/users', payload);
}

export async function updateUser(userId: number, data: Partial<Pick<User, 'full_name' | 'username' | 'email' | 'role' | 'is_active'>>): Promise<User> {
  // Build payload with only meaningful values to avoid 422s from empty strings
  const payload: Record<string, any> = {};
  if (typeof data.full_name === 'string' && data.full_name.trim().length > 0) payload.full_name = data.full_name.trim();
  if (typeof data.username === 'string' && data.username.trim().length > 0) payload.username = data.username.trim();
  if (typeof data.email === 'string' && data.email.trim().length > 0) payload.email = data.email.trim();
  if (typeof data.role === 'string' && (data.role === 'admin' || data.role === 'worker')) payload.role = data.role;
  if (typeof data.is_active === 'boolean') payload.is_active = data.is_active;

  return ApiClient.put(`/admin/users/${userId}`, payload);
}

export async function setUserPassword(userId: number, newPassword: string): Promise<void> {
  await ApiClient.post(`/admin/users/${userId}/password?new_password=${encodeURIComponent(newPassword)}`);
}

export async function deactivateUser(userId: number): Promise<void> {
  await ApiClient.delete(`/admin/users/${userId}`);
}

export async function getAllUsers(): Promise<User[]> {
  return ApiClient.get('/admin/users-lite');
}
