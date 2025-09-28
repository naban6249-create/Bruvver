// app/api/public/menu/route.ts - Fixed to match backend endpoints
import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000/api';
const SERVICE_API_KEY = process.env.SERVICE_API_KEY || process.env.FASTAPI_API_KEY;

// Helper function to wait/retry
async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, options: RequestInit, maxRetries: number = 5) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Fetch attempt ${attempt}/${maxRetries} to: ${url}`);
      const response = await fetch(url, options);
      return response;
    } catch (error: any) {
      console.log(`Attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // If it's a connection refused error, wait longer before retry
      if (error.code === 'ECONNREFUSED') {
        const waitTime = attempt * 2000; // 2s, 4s, 6s, 8s
        console.log(`Backend not ready, waiting ${waitTime}ms before retry...`);
        await sleep(waitTime);
      } else {
        // For other errors, shorter wait
        await sleep(1000);
      }
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId') || '1';
    
    console.log('=== Public Menu API Debug Info ===');
    console.log('API_BASE_URL:', API_BASE_URL);
    console.log('SERVICE_API_KEY present:', SERVICE_API_KEY ? 'YES' : 'NO');
    console.log('Branch ID:', branchId);
    
    if (!SERVICE_API_KEY) {
      console.error('❌ SERVICE_API_KEY is not set');
      return NextResponse.json(
        { error: 'Server configuration error: SERVICE_API_KEY not found' },
        { status: 500 }
      );
    }

    // FIXED: Use the correct backend endpoint that actually exists
    const apiUrl = `${API_BASE_URL}/branches/${branchId}/menu?available_only=true`;
    
    console.log('Fetching from:', apiUrl);
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-API-Key': SERVICE_API_KEY,
    };

    // Use retry logic to handle backend startup timing
    const response = await fetchWithRetry(apiUrl, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });

    console.log('FastAPI Response Status:', response.status);
    console.log('FastAPI Response Headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('FastAPI response not ok:', response.status, errorText);
      
      // Handle specific error cases
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Menu not found for this branch', details: errorText },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: `Failed to fetch menu items: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Successfully fetched data, item count:', Array.isArray(data) ? data.length : 'Not an array');
    
    // Transform the data to ensure consistency with frontend expectations
    const transformedData = Array.isArray(data) ? data.map((item: any) => {
      let imageUrl = item.image_url || item.imageUrl;
      
      // If the image URL is a relative path, make it absolute
      if (imageUrl && !imageUrl.startsWith('http')) {
        const serverBase = API_BASE_URL.replace('/api', '');
        imageUrl = `${serverBase}${imageUrl}`;
      }
      
      return {
        id: String(item.id),
        name: item.name,
        price: Number(item.price || 0),
        description: item.description || '',
        imageUrl: imageUrl || 'https://picsum.photos/600/400',
        category: item.category || 'hot',
        is_available: Boolean(item.is_available !== false), // Default to true if undefined
        ingredients: Array.isArray(item.ingredients) ? item.ingredients : [],
        branchId: item.branch_id || item.branchId || branchId,
      };
    }) : [];

    return NextResponse.json(transformedData);
    
  } catch (error) {
    console.error('Error in public menu API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
