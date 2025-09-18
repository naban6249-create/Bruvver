// src/lib/branch-service.ts
'use server';

import { cookies } from 'next/headers';
import type { Branch } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';

// Helper to get authenticated headers
async function getAuthHeaders(): Promise<Record<string, string>> {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// Helper to handle API responses
async function handleResponse(response: Response) {
  if (!response.ok) {
    const errorText = await response.text();
    console.error("API Error:", errorText);
    // Try to parse error detail from backend
    try {
      const errorJson = JSON.parse(errorText);
      if (errorJson.detail) {
        throw new Error(errorJson.detail);
      }
    } catch (e) {
      // Fallback to full text
      throw new Error(`API call failed with status ${response.status}: ${errorText}`);
    }
  }
  // For DELETE requests with no content
  if (response.status === 204) {
    return null;
  }
  return response.json();
}

// --- API Service Functions for Branches ---

export async function getBranches(): Promise<Branch[]> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/branches`, {
      headers,
      cache: 'no-store',
    });
    return await handleResponse(response);
  } catch (error) {
    console.error("Failed to get branches:", error);
    return [];
  }
}

export async function addBranch(branchData: Omit<Branch, 'id' | 'created_at' | 'updated_at'>): Promise<Branch> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/branches`, {
    method: 'POST',
    headers,
    body: JSON.stringify(branchData),
  });
  return handleResponse(response);
}

export async function updateBranch(branchId: number, branchData: Partial<Omit<Branch, 'id' | 'created_at' | 'updated_at'>>): Promise<Branch> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/branches/${branchId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(branchData),
  });
  return handleResponse(response);
}

export async function deleteBranch(branchId: number): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/branches/${branchId}`, {
    method: 'DELETE',
    headers,
  });
  await handleResponse(response);
}