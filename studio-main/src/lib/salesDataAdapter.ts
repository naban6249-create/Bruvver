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
    // Use NEXT_PUBLIC_API_URL as it seems to be defined in your Render setup
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

    // Construct the URL with query parameters
    const params = new URLSearchParams({
      timeframe,
      ...(branchId && { branch_id: branchId.toString() }),
    });

    // Make sure the URL points to the correct endpoint, removing the extra '/api' if NEXT_PUBLIC_API_URL includes it
    const url = `${apiBaseUrl.replace(/\/api$/, '')}/api/v1/sales-data-for-ai?${params.toString()}`;

    // Get the Service API Key from environment variables
    // This runs server-side (in the API route), so we access process.env directly
    const serviceApiKey = process.env.SERVICE_API_KEY;

    if (!serviceApiKey) {
      console.error("SERVICE_API_KEY is not set in the environment.");
      throw new Error("Service API Key not configured for frontend service.");
    }

    console.log(`🔍 Fetching sales data for ${timeframe} analysis from backend at ${url} using Service Key...`);

    // Fetch data from Python backend using Service Key
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // ✅ Use X-API-Key for service-to-service authentication
        'X-API-Key': serviceApiKey,
      },
      // Disable caching for real-time data - important for server-side fetch
      cache: 'no-store',
    });

    if (!response.ok) {
       let errorBody = `Status ${response.status}: ${response.statusText}`;
       try {
          // Try to parse detailed error from backend JSON response
          const errorJson = await response.json();
          errorBody = JSON.stringify(errorJson); // Log the actual error detail
       } catch(e) {
          // Ignore if response body is not JSON
       }
       console.error('❌ Backend API error:', errorBody);

       // Provide helpful error messages based on status
       if (response.status === 401 || response.status === 403) {
         // 403 usually means wrong key or endpoint needs different auth
         throw new Error(`Authentication failed: ${errorBody}. Check SERVICE_API_KEY.`);
       } else if (response.status === 404) {
         throw new Error('Backend endpoint not found. Ensure Python backend is running and the URL is correct: ' + url);
       } else {
         throw new Error(`Backend error: ${errorBody}`);
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
    // Adjust based on the actual fields returned by your backend endpoint
    const transformedData = data.map(item => ({
      date: item.sale_date || item.created_at?.split('T')[0] || new Date().toISOString().split('T')[0], // Use created_at if sale_date isn't present
      item_name: item.item_name || item.menu_item?.name || 'Unknown Item', // Adjust based on your Order schema
      quantity: Number(item.quantity) || 1, // Default quantity if not present
      revenue: Number(item.total) || 0, // Use 'total' if that's the field name for revenue
      branch_id: item.branch_id,
    }));

    // Log summary for debugging
    const totalRevenue = transformedData.reduce((sum, item) => sum + item.revenue, 0);
    const totalQuantity = transformedData.reduce((sum, item) => sum + item.quantity, 0);
    console.log(`📊 Data summary: ${totalQuantity} items sold, ₹${totalRevenue.toFixed(2)} revenue`);

    return transformedData;

  } catch (error) {
    console.error('❌ Error in prepareSalesDataForAI:', error);
    // Re-throw the error to let the API route handler catch it
    throw error;
  }
}

// --- Keep the helper functions below as they are ---

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
    // Avoid division by zero if quantity is 0
    acc[item.item_name].avgPrice = acc[item.item_name].quantity > 0 ? acc[item.item_name].revenue / acc[item.item_name].quantity : 0;
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
    // Avoid division by zero for averageOrderValue calculation
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
    .sort((a, b) => b.quantity - a.quantity) // Sort by quantity (most popular)
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

  // Lowered threshold for testing/initial use
  if (data.length < 1) { // Changed from 3 to 1
    return {
      isValid: false,
      message: `Insufficient data for full analysis. Only ${data.length} record(s) found. Need at least 1 record.`,
      recordCount: data.length,
    };
  }

  return {
    isValid: true,
    message: 'Data is valid for analysis',
    recordCount: data.length,
  };
}
