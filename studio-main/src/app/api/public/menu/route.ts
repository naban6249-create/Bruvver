import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'https://bruvver-backend.onrender.com/api';
const SERVICE_API_KEY = process.env.SERVICE_API_KEY || process.env.FASTAPI_API_KEY;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId') || '1';

    if (!SERVICE_API_KEY) {
      return NextResponse.json(
        { error: 'Server configuration error: SERVICE_API_KEY not found' },
        { status: 500 }
      );
    }

    // Backend endpoint (public menu)
    const apiUrl = `${API_BASE_URL}/menu/${branchId}?available_only=true`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': SERVICE_API_KEY,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          error:
            response.status === 404
              ? 'Menu not found for this branch'
              : `Failed to fetch menu items: ${response.status}`,
          details: errorText,
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Normalize/transform menu items
    const transformedData = Array.isArray(data)
      ? data.map((item: any) => {
          let imageUrl = item.image_url || item.imageUrl;
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
            is_available: Boolean(item.is_available !== false),
            ingredients: Array.isArray(item.ingredients) ? item.ingredients : [],
            branchId: item.branch_id || branchId,
          };
        })
      : [];

    return NextResponse.json(transformedData);
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
