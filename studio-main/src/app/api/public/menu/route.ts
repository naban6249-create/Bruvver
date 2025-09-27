// app/api/public/menu/route.ts - Updated with debug logging
import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000/api';
const SERVICE_API_KEY = process.env.SERVICE_API_KEY || process.env.FASTAPI_API_KEY;

export async function GET(request: NextRequest) {
  try {
    // Debug logging
    console.log('=== Debug Info ===');
    console.log('API_BASE_URL:', API_BASE_URL);
    console.log('SERVICE_API_KEY present:', SERVICE_API_KEY ? 'YES' : 'NO');
    console.log('SERVICE_API_KEY value:', SERVICE_API_KEY ? `${SERVICE_API_KEY.substring(0, 10)}...` : 'UNDEFINED');
    console.log('All env vars starting with SERVICE:', Object.keys(process.env).filter(k => k.includes('SERVICE')));
    
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId') || '1';

    if (!SERVICE_API_KEY) {
      console.error('❌ SERVICE_API_KEY is not set in environment variables');
      return NextResponse.json(
        { error: 'Server configuration error: SERVICE_API_KEY not found' },
        { status: 500 }
      );
    }

    // Construct the FastAPI endpoint URL
    const apiUrl = `${process.env.API_BASE_URL}/menu/1?available_only=true`;
    
    // Prepare headers - try different authorization formats
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-API-Key': SERVICE_API_KEY,
    };

    console.log('Fetching from:', apiUrl);
    console.log('Headers being sent:', {
      'Content-Type': headers['Content-Type'],
      'X-API-Key': headers['X-API-Key'] ? `${headers['X-API-Key'].substring(0, 10)}...` : 'MISSING',
    });
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });

    console.log('FastAPI Response Status:', response.status);
    console.log('FastAPI Response Headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('FastAPI response not ok:', response.status, errorText);
      return NextResponse.json(
        { error: `Failed to fetch menu items: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Successfully fetched data, item count:', Array.isArray(data) ? data.length : 'Not an array');
    
    // Transform the data to ensure image URLs are properly formatted
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
        is_available: Boolean(item.is_available),
        ingredients: Array.isArray(item.ingredients) ? item.ingredients : [],
        branchId: item.branch_id || item.branchId,
      };
    }) : [];

    return NextResponse.json(transformedData);
  } catch (error) {
    console.error('Error in public menu API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
