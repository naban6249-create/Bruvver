/**
 * Sales Data Adapter
 * Fetches sales data from the Python backend API
 */

interface SalesDataItem {
  date: string;
  item_name: string;
  quantity: number;
  revenue: number;
  branch_id?: number;
}

/**
 * Fetches sales data from Python backend for AI analysis
 * @param timeframe - 'daily', 'weekly', or 'monthly'
 * @param branchId - Optional branch ID to filter data
 * @returns Array of sales data items
 */
export async function prepareSalesDataForAI(
  timeframe: 'daily' | 'weekly' | 'monthly',
  branchId?: number
): Promise<SalesDataItem[]> {
  try {
    // Get the API base URL from environment variables
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000/api';
    
    // Construct the URL with query parameters
    const params = new URLSearchParams({
      timeframe,
      ...(branchId && { branch_id: branchId.toString() }),
    });

    const url = `${apiBaseUrl}/v1/sales-data-for-ai?${params.toString()}`;

    // Fetch data from Python backend
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Add authorization header if using token-based auth
        ...(typeof window !== 'undefined' && localStorage.getItem('token') && {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        }),
      },
      // Use cache for better performance (5 minutes)
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to fetch sales data:', errorText);
      throw new Error(`Failed to fetch sales data: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Validate and transform the data
    if (!Array.isArray(data)) {
      console.error('Invalid data format received:', data);
      throw new Error('Invalid data format received from backend');
    }

    // Transform the data to match the expected format
    return data.map(item => ({
      date: item.sale_date || item.date || new Date().toISOString(),
      item_name: item.item_name || item.menu_item?.name || 'Unknown Item',
      quantity: item.quantity || 0,
      revenue: item.revenue || 0,
      branch_id: item.branch_id,
    }));

  } catch (error) {
    console.error('Error in prepareSalesDataForAI:', error);
    
    // Return mock data as fallback for development/testing
    console.warn('Returning mock data as fallback');
    return generateMockSalesData(timeframe, branchId);
  }
}

/**
 * Generates mock sales data for testing/development
 */
function generateMockSalesData(
  timeframe: 'daily' | 'weekly' | 'monthly',
  branchId?: number
): SalesDataItem[] {
  const mockItems = [
    'Classic Espresso',
    'Caramel Macchiato',
    'Iced Latte',
    'Americano',
    'Cappuccino',
    'Cold Brew',
  ];

  const daysMap = {
    daily: 7,
    weekly: 4,
    monthly: 6,
  };

  const days = daysMap[timeframe];
  const mockData: SalesDataItem[] = [];

  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    mockItems.forEach(item => {
      mockData.push({
        date: date.toISOString().split('T')[0],
        item_name: item,
        quantity: Math.floor(Math.random() * 20) + 5,
        revenue: Math.random() * 500 + 100,
        ...(branchId && { branch_id: branchId }),
      });
    });
  }

  return mockData;
}

/**
 * Calculates aggregate statistics from sales data
 */
export function calculateSalesStats(data: SalesDataItem[]) {
  const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);
  const totalQuantity = data.reduce((sum, item) => sum + item.quantity, 0);
  
  const itemStats = data.reduce((acc, item) => {
    if (!acc[item.item_name]) {
      acc[item.item_name] = { quantity: 0, revenue: 0 };
    }
    acc[item.item_name].quantity += item.quantity;
    acc[item.item_name].revenue += item.revenue;
    return acc;
  }, {} as Record<string, { quantity: number; revenue: number }>);

  return {
    totalRevenue,
    totalQuantity,
    itemStats,
    averageOrderValue: totalQuantity > 0 ? totalRevenue / totalQuantity : 0,
  };
}
