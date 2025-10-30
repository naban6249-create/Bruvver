/**
 * Sales Data Adapter - Helper Functions Only
 * Data fetching now happens in the API route (app/api/ai/business-insights/route.ts)
 * This file only contains utility functions for data processing
 */

interface SalesDataItem {
  date: string;
  item_name: string;
  quantity: number;
  revenue: number;
  branch_id?: number;
  payment_method?: string;
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
    // Avoid division by zero if quantity is 0
    acc[item.item_name].avgPrice = 
      acc[item.item_name].quantity > 0 
        ? acc[item.item_name].revenue / acc[item.item_name].quantity 
        : 0;
    return acc;
  }, {} as Record<string, { quantity: number; revenue: number; avgPrice: number }>);

  // Calculate date range
  const dates = data
    .map(item => new Date(item.date))
    .filter(date => !isNaN(date.getTime())) // Filter out invalid dates
    .sort((a, b) => a.getTime() - b.getTime());
    
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
export function groupSalesByDate(data: SalesDataItem[]): Record<string, { 
  quantity: number; 
  revenue: number;
  items: string[];
}> {
  return data.reduce((acc, item) => {
    const date = item.date;
    if (!acc[date]) {
      acc[date] = { quantity: 0, revenue: 0, items: [] };
    }
    acc[date].quantity += item.quantity;
    acc[date].revenue += item.revenue;
    if (!acc[date].items.includes(item.item_name)) {
      acc[date].items.push(item.item_name);
    }
    return acc;
  }, {} as Record<string, { quantity: number; revenue: number; items: string[] }>);
}

/**
 * Gets top-selling items from sales data
 */
export function getTopSellingItems(
  data: SalesDataItem[], 
  limit: number = 5
): Array<{
  name: string;
  quantity: number;
  revenue: number;
  avgPrice: number;
}> {
  const itemStats = calculateSalesStats(data).itemStats;

  return Object.entries(itemStats)
    .map(([name, stats]) => ({
      name,
      quantity: stats.quantity,
      revenue: stats.revenue,
      avgPrice: stats.avgPrice,
    }))
    .sort((a, b) => b.quantity - a.quantity) // Sort by quantity (most popular)
    .slice(0, limit);
}

/**
 * Gets revenue trends by date
 */
export function getRevenueTrends(data: SalesDataItem[]): Array<{
  date: string;
  revenue: number;
  quantity: number;
}> {
  const groupedData = groupSalesByDate(data);
  
  return Object.entries(groupedData)
    .map(([date, stats]) => ({
      date,
      revenue: stats.revenue,
      quantity: stats.quantity,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/**
 * Calculates growth rate between two periods
 */
export function calculateGrowthRate(
  currentPeriod: SalesDataItem[],
  previousPeriod: SalesDataItem[]
): {
  revenueGrowth: number;
  quantityGrowth: number;
  percentageChange: number;
} {
  const currentStats = calculateSalesStats(currentPeriod);
  const previousStats = calculateSalesStats(previousPeriod);

  const revenueGrowth = currentStats.totalRevenue - previousStats.totalRevenue;
  const quantityGrowth = currentStats.totalQuantity - previousStats.totalQuantity;
  
  const percentageChange = previousStats.totalRevenue > 0
    ? ((currentStats.totalRevenue - previousStats.totalRevenue) / previousStats.totalRevenue) * 100
    : 0;

  return {
    revenueGrowth: Math.round(revenueGrowth * 100) / 100,
    quantityGrowth,
    percentageChange: Math.round(percentageChange * 100) / 100,
  };
}

/**
 * Groups data by payment method
 */
export function groupByPaymentMethod(data: SalesDataItem[]): Record<string, {
  count: number;
  revenue: number;
  percentage: number;
}> {
  const total = data.reduce((sum, item) => sum + item.revenue, 0);
  
  const grouped = data.reduce((acc, item) => {
    const method = item.payment_method || 'cash';
    if (!acc[method]) {
      acc[method] = { count: 0, revenue: 0, percentage: 0 };
    }
    acc[method].count += 1;
    acc[method].revenue += item.revenue;
    return acc;
  }, {} as Record<string, { count: number; revenue: number; percentage: number }>);

  // Calculate percentages
  Object.keys(grouped).forEach(method => {
    grouped[method].percentage = total > 0 
      ? Math.round((grouped[method].revenue / total) * 100 * 100) / 100
      : 0;
  });

  return grouped;
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

  // Require at least 1 record for basic analysis
  if (data.length < 1) {
    return {
      isValid: false,
      message: `Insufficient data for analysis. Only ${data.length} record(s) found. Need at least 1 record.`,
      recordCount: data.length,
    };
  }

  return {
    isValid: true,
    message: 'Data is valid for analysis',
    recordCount: data.length,
  };
}

/**
 * Formats sales data for AI context
 */
export function formatSalesDataForAI(data: SalesDataItem[]): string {
  if (!data || data.length === 0) {
    return "No sales data available.";
  }

  const stats = calculateSalesStats(data);
  const topItems = getTopSellingItems(data, 5);
  const trends = getRevenueTrends(data);
  const paymentMethods = groupByPaymentMethod(data);

  return `
Sales Data Summary:
- Total Records: ${data.length}
- Date Range: ${stats.dateRange.start} to ${stats.dateRange.end}
- Total Revenue: ₹${stats.totalRevenue.toFixed(2)}
- Total Items Sold: ${stats.totalQuantity}
- Average Order Value: ₹${stats.averageOrderValue.toFixed(2)}
- Unique Items: ${stats.uniqueItems}

Top 5 Best-Selling Items:
${topItems.map((item, i) => `${i + 1}. ${item.name}: ${item.quantity} sold, ₹${item.revenue.toFixed(2)} revenue`).join('\n')}

Payment Methods:
${Object.entries(paymentMethods).map(([method, data]) => 
  `${method}: ${data.count} transactions (${data.percentage}% of revenue)`
).join('\n')}

Recent Trends (Last 7 days):
${trends.slice(-7).map(trend => 
  `${trend.date}: ${trend.quantity} items, ₹${trend.revenue.toFixed(2)}`
).join('\n')}
  `.trim();
}

/**
 * Type exports
 */
export type { SalesDataItem };
