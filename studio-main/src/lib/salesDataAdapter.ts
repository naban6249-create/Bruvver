/**
 * Sales Data Adapter
 * Fetches sales data from the Python backend API for AI analysis
 */

interface SalesDataItem {
  date: string;
  item_name: string;
  quantity: number;
  revenue: number;
  branch_id?: number;
}

/**
 * Fetches REAL sales data from Python backend for AI analysis
 * @param timeframe - 'daily', 'weekly', or 'monthly'
 * @param branchId - Optional branch ID to filter data
 * @returns Array of sales data items from actual database
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

    // Get auth token from localStorage
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    console.log(`🔍 Fetching sales data for ${timeframe} analysis from backend...`);

    // Fetch data from Python backend
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Add authorization header for authenticated requests
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      // Disable caching for real-time data
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend API error:', errorText);
      
      // Provide helpful error messages
      if (response.status === 401) {
        throw new Error('Authentication required. Please log in again.');
      } else if (response.status === 403) {
        throw new Error('Access denied. Admin privileges required.');
      } else if (response.status === 404) {
        throw new Error('Backend endpoint not found. Ensure Python backend is running at ' + apiBaseUrl);
      } else {
        throw new Error(`Backend error: ${response.statusText}`);
      }
    }

    const data = await response.json();
    
    // Validate response data
    if (!Array.isArray(data)) {
      console.error('❌ Invalid data format received:', data);
      throw new Error('Invalid data format received from backend');
    }

    console.log(`✅ Successfully fetched ${data.length} real sales records from database`);

    // If no data, provide helpful message
    if (data.length === 0) {
      console.warn('⚠️ No sales data found for the selected timeframe and branch');
      return [];
    }

    // Transform the data to match the expected format
    const transformedData = data.map(item => ({
      date: item.sale_date || item.date || new Date().toISOString().split('T')[0],
      item_name: item.item_name || item.menu_item?.name || 'Unknown Item',
      quantity: Number(item.quantity) || 0,
      revenue: Number(item.revenue) || 0,
      branch_id: item.branch_id,
    }));

    // Log summary for debugging
    const totalRevenue = transformedData.reduce((sum, item) => sum + item.revenue, 0);
    const totalQuantity = transformedData.reduce((sum, item) => sum + item.quantity, 0);
    console.log(`📊 Data summary: ${totalQuantity} items sold, ₹${totalRevenue.toFixed(2)} revenue`);

    return transformedData;

  } catch (error) {
    console.error('❌ Error in prepareSalesDataForAI:', error);
    
    // Re-throw the error to let the UI handle it
    // DO NOT return mock data - this hides real issues
    throw error;
  }
}

/**
 * Calculates aggregate statistics from sales data
 * Useful for generating insights and summaries
 */
export function calculateSalesStats(data: SalesDataItem[]) {
  if (!data || data.length === 0) {
    return {
      totalRevenue: 0,
      totalQuantity: 0,
      itemStats: {},
      averageOrderValue: 0,
      uniqueItems: 0,
      dateRange: {
        start: null,
        end: null,
      },
    };
  }

  const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);
  const totalQuantity = data.reduce((sum, item) => sum + item.quantity, 0);
  
  // Calculate per-item statistics
  const itemStats = data.reduce((acc, item) => {
    if (!acc[item.item_name]) {
      acc[item.item_name] = { 
        quantity: 0, 
        revenue: 0,
        avgPrice: 0 
      };
    }
    acc[item.item_name].quantity += item.quantity;
    acc[item.item_name].revenue += item.revenue;
    acc[item.item_name].avgPrice = acc[item.item_name].revenue / acc[item.item_name].quantity;
    return acc;
  }, {} as Record<string, { quantity: number; revenue: number; avgPrice: number }>);

  // Calculate date range
  const dates = data.map(item => new Date(item.date)).sort((a, b) => a.getTime() - b.getTime());
  const dateRange = {
    start: dates[0]?.toISOString().split('T')[0] || null,
    end: dates[dates.length - 1]?.toISOString().split('T')[0] || null,
  };

  return {
    totalRevenue: Math.round(totalRevenue * 100) / 100, // Round to 2 decimal places
    totalQuantity,
    itemStats,
    averageOrderValue: totalQuantity > 0 ? Math.round((totalRevenue / totalQuantity) * 100) / 100 : 0,
    uniqueItems: Object.keys(itemStats).length,
    dateRange,
  };
}

/**
 * Groups sales data by date for time-series analysis
 */
export function groupSalesByDate(data: SalesDataItem[]): Record<string, { quantity: number; revenue: number }> {
  return data.reduce((acc, item) => {
    const date = item.date;
    if (!acc[date]) {
      acc[date] = { quantity: 0, revenue: 0 };
    }
    acc[date].quantity += item.quantity;
    acc[date].revenue += item.revenue;
    return acc;
  }, {} as Record<string, { quantity: number; revenue: number }>);
}

/**
 * Gets top-selling items from sales data
 */
export function getTopSellingItems(data: SalesDataItem[], limit: number = 5): Array<{
  name: string;
  quantity: number;
  revenue: number;
}> {
  const itemStats = calculateSalesStats(data).itemStats;
  
  return Object.entries(itemStats)
    .map(([name, stats]) => ({
      name,
      quantity: stats.quantity,
      revenue: stats.revenue,
    }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, limit);
}

/**
 * Validates if sales data exists and is sufficient for analysis
 */
export function validateSalesData(data: SalesDataItem[]): {
  isValid: boolean;
  message: string;
  recordCount: number;
} {
  if (!data || !Array.isArray(data)) {
    return {
      isValid: false,
      message: 'Invalid data format',
      recordCount: 0,
    };
  }

  if (data.length === 0) {
    return {
      isValid: false,
      message: 'No sales data available for the selected timeframe. Try recording some sales first.',
      recordCount: 0,
    };
  }

  if (data.length < 3) {
    return {
      isValid: false,
      message: `Insufficient data for analysis. Only ${data.length} record(s) found. Need at least 3 records.`,
      recordCount: data.length,
    };
  }

  return {
    isValid: true,
    message: 'Data is valid for analysis',
    recordCount: data.length,
  };
}
