// app/api/public/menu/route.ts - REPLACE ENTIRE FILE
import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000/api';
const SERVICE_API_KEY = process.env.SERVICE_API_KEY || process.env.FASTAPI_API_KEY;

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, options: RequestInit, maxRetries: number = 5) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Fetch attempt ${attempt}/${maxRetries} to: ${url}`);
      const response = await fetch(url, options);

      if (response.status >= 500 || response.status === 401 || response.status === 403) {
        console.log(`Attempt ${attempt} failed with status ${response.status}. Retrying...`);
        throw new Error(`Retryable status code: ${response.status}`);
      }
      
      return response;

    } catch (error: any) {
      console.log(`Attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      const waitTime = attempt * 1000;
      console.log(`Waiting ${waitTime}ms before next retry...`);
      await sleep(waitTime);
    }
  }
  throw new Error("Fetch with retry failed unexpectedly.");
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

    // FIXED: Use the correct backend endpoint
    const apiUrl = `${API_BASE_URL}/branches/${branchId}/menu?available_only=true`;
    
    console.log('Fetching from:', apiUrl);
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-API-Key': SERVICE_API_KEY,
    };

    const response = await fetchWithRetry(apiUrl, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });

    console.log('FastAPI Response Status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('FastAPI response not ok:', response.status, errorText);
      
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
    
    // Transform data for frontend consistency (Cloudinary-aware)
    const transformedData = Array.isArray(data) ? data.map((item: any) => {
      let imageUrl = item.image_url || item.imageUrl;
      
      // Handle Cloudinary URLs and local static files
      if (imageUrl) {
        if (imageUrl.startsWith('https://res.cloudinary.com/')) {
          // Already a valid Cloudinary URL
          // Do nothing
        } else if (imageUrl.startsWith('/static/')) {
          // Local static file - convert to full URL
          const serverBase = API_BASE_URL.replace('/api', '');
          imageUrl = `${serverBase}${imageUrl}`;
        } else if (!imageUrl.startsWith('http')) {
          // Relative path - assume static file
          const serverBase = API_BASE_URL.replace('/api', '');
          imageUrl = `${serverBase}${imageUrl}`;
        }
      } else {
        // Default fallback image
        imageUrl = 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&h=400&fit=crop';
      }
      
      return {
        id: String(item.id),
        name: item.name,
        price: Number(item.price || 0),
        description: item.description || '',
        imageUrl: imageUrl,
        category: item.category || 'hot',
        is_available: Boolean(item.is_available !== false),
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
