'use client';

import { ApiClient } from './api-client'; // ✅ Import the ApiClient

/**
 * Triggers a server-side export of daily sales and expenses to Google Sheets.
 * This function now runs on the client-side and uses the central ApiClient.
 *
 * @param date The date to export in "YYYY-MM-DD" format.
 * @param branchId Optional ID of the branch to export.
 * @returns A confirmation message from the server.
 */
export async function exportToSheets(
  date: string,
  branchId?: string
): Promise<{ message: string } | null> {
  
  // Construct the request body
  const body: any = { date };
  if (branchId) {
    body.branch_id = Number(branchId);
  }

  // ✅ Use the ApiClient to make the authenticated POST request
  // The ApiClient will automatically handle the auth token.
  try {
    const response = await ApiClient.post('/reports/export-to-sheets', body);
    return response;
  } catch (error) {
    console.error("Failed to export to sheets:", error);
    // Optionally, re-throw the error or return a specific error message
    throw error;
  }
}
