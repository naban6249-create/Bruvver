import { NextRequest, NextResponse } from 'next/server';
import { prepareSalesDataForAI } from '@/lib/salesDataAdapter';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const timeframe = searchParams.get('timeframe') || 'daily';
    const analysisType = searchParams.get('analysisType') || 'trend_analysis';
    const branchId = searchParams.get('branchId');

    // Validate API key
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'AI service not configured. Please set GOOGLE_AI_API_KEY in .env.local' },
        { status: 500 }
      );
    }

    // Get sales data from Python backend
    const salesData = await prepareSalesDataForAI(
      timeframe as 'daily' | 'weekly' | 'monthly',
      branchId ? parseInt(branchId) : undefined
    );

    // Mock AI insights for now (replace with actual Google AI API call later)
    // You can integrate with Gemini API here using the apiKey
    const mockInsights = generateMockInsights(analysisType, salesData, timeframe);

    return NextResponse.json(mockInsights);

  } catch (error) {
    console.error('Business insights error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate insights' },
      { status: 500 }
    );
  }
}

// Helper function to generate mock insights based on analysis type
function generateMockInsights(
  analysisType: string,
  salesData: any,
  timeframe: string
) {
  const totalRevenue = salesData.reduce((sum: number, item: any) => sum + (item.revenue || 0), 0);
  const totalItems = salesData.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
  const avgRevenue = salesData.length > 0 ? totalRevenue / salesData.length : 0;

  switch (analysisType) {
    case 'trend_analysis':
      return {
        trend_analysis: {
          summary: `Based on ${timeframe} data, your coffee shop has generated ₹${totalRevenue.toFixed(2)} in revenue from ${totalItems} items sold.`,
          key_insights: [
            `Average daily revenue: ₹${avgRevenue.toFixed(2)}`,
            `Total transactions: ${salesData.length}`,
            `Revenue trend: ${totalRevenue > avgRevenue * salesData.length * 0.9 ? 'Increasing' : 'Stable'}`,
            `Best performing day: ${timeframe === 'daily' ? 'Today' : 'This week'}`,
          ],
          data_points: salesData.map((item: any) => ({
            date: item.date || new Date().toISOString().split('T')[0],
            value: item.revenue || 0,
          })),
        },
      };

    case 'sales_forecast':
      const projectedGrowth = totalRevenue * 1.15; // 15% growth projection
      return {
        sales_forecast: {
          prediction: `Expected revenue for next ${timeframe}: ₹${projectedGrowth.toFixed(2)}`,
          confidence: 'High (85%)',
          recommendations: [
            'Stock up on popular items for anticipated demand',
            'Consider promotional offers to boost sales further',
            'Optimize inventory to reduce waste',
          ],
        },
      };

    case 'inventory_optimization':
      const topItems = salesData
        .sort((a: any, b: any) => (b.quantity || 0) - (a.quantity || 0))
        .slice(0, 3)
        .map((item: any) => item.item_name || 'Unknown Item');
      
      return {
        inventory_optimization: {
          suggestions: [
            'Increase stock levels for high-demand items',
            'Consider bulk purchasing for cost savings',
            'Monitor perishable items closely to reduce waste',
            'Implement just-in-time ordering for non-perishables',
          ],
          priority_items: topItems.length > 0 ? topItems : ['Coffee Beans', 'Milk', 'Sugar'],
        },
      };

    case 'recommendations':
      return {
        recommendations: {
          actionable_items: [
            'Introduce loyalty program to increase customer retention',
            'Add seasonal beverages to attract new customers',
            'Optimize pricing based on demand patterns',
            'Improve customer service during peak hours',
          ],
          quick_wins: [
            'Cross-sell complementary items at checkout',
            'Promote high-margin products prominently',
            'Reduce preparation time for popular items',
          ],
        },
      };

    default:
      return { error: 'Invalid analysis type' };
  }
}
