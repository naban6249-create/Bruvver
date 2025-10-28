import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
    })
  ],
  model: 'googleai/gemini-2.0-flash-exp',
});

/**
 * Generate business insights using Gemini AI
 */
export async function generateBusinessInsights(
  salesData: any[],
  analysisType: string,
  timeframe: string
) {
  const prompt = buildPromptForAnalysisType(salesData, analysisType, timeframe);
  
  const { text } = await ai.generate(prompt);
  
  return parseAIResponse(text, analysisType);
}

/**
 * Build prompts based on analysis type
 */
function buildPromptForAnalysisType(
  salesData: any[],
  analysisType: string,
  timeframe: string
): string {
  const dataContext = formatSalesDataForAI(salesData);
  
  const prompts = {
    trend_analysis: `
You are a business analyst for a coffee shop. Analyze the following sales data for ${timeframe} trends.

Sales Data:
${dataContext}

Provide:
1. A brief summary of overall trends
2. 3-4 key insights about sales patterns
3. Data points for visualization (date and revenue pairs)

Format your response as JSON:
{
  "summary": "...",
  "key_insights": ["...", "...", "..."],
  "data_points": [{"date": "YYYY-MM-DD", "value": 0}]
}
    `,
    
    sales_forecast: `
You are a sales forecasting expert for a coffee shop. Based on this ${timeframe} data, predict future sales.

Sales Data:
${dataContext}

Provide:
1. A prediction for the next ${timeframe === 'daily' ? 'week' : timeframe === 'weekly' ? 'month' : 'quarter'}
2. Confidence level (High/Medium/Low with percentage)
3. 3 recommendations to improve sales

Format your response as JSON:
{
  "prediction": "...",
  "confidence": "High (85%)",
  "recommendations": ["...", "...", "..."]
}
    `,
    
    inventory_optimization: `
You are an inventory management expert for a coffee shop. Analyze this sales data to optimize inventory.

Sales Data:
${dataContext}

Provide:
1. 4 actionable inventory suggestions
2. 3-5 priority items that need attention

Format your response as JSON:
{
  "suggestions": ["...", "...", "...", "..."],
  "priority_items": ["...", "...", "..."]
}
    `,
    
    recommendations: `
You are a business consultant for a coffee shop. Based on this ${timeframe} performance, provide strategic recommendations.

Sales Data:
${dataContext}

Provide:
1. 4 actionable items for business improvement
2. 3 quick wins that can be implemented immediately

Format your response as JSON:
{
  "actionable_items": ["...", "...", "...", "..."],
  "quick_wins": ["...", "...", "..."]
}
    `
  };
  
  return prompts[analysisType as keyof typeof prompts] || prompts.trend_analysis;
}

/**
 * Format sales data for AI context
 */
function formatSalesDataForAI(salesData: any[]): string {
  if (!salesData || salesData.length === 0) {
    return "No sales data available.";
  }
  
  // Calculate aggregates
  const totalRevenue = salesData.reduce((sum, item) => sum + (item.revenue || 0), 0);
  const totalQuantity = salesData.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const avgTransaction = totalRevenue / salesData.length;
  
  // Get top items
  const itemStats = salesData.reduce((acc: any, sale) => {
    const name = sale.item_name || 'Unknown';
    if (!acc[name]) {
      acc[name] = { quantity: 0, revenue: 0 };
    }
    acc[name].quantity += sale.quantity || 0;
    acc[name].revenue += sale.revenue || 0;
    return acc;
  }, {});
  
  const topItems = Object.entries(itemStats)
    .sort((a: any, b: any) => b[1].quantity - a[1].quantity)
    .slice(0, 5)
    .map(([name, stats]: any) => `${name}: ${stats.quantity} sold, ₹${stats.revenue.toFixed(2)}`)
    .join('\n');
  
  return `
Total Transactions: ${salesData.length}
Total Revenue: ₹${totalRevenue.toFixed(2)}
Total Items Sold: ${totalQuantity}
Average Transaction: ₹${avgTransaction.toFixed(2)}

Top 5 Items:
${topItems}

Recent Daily Performance:
${salesData.slice(0, 7).map(s => 
  `${s.date}: ${s.item_name} - ${s.quantity} units, ₹${s.revenue}`
).join('\n')}
  `.trim();
}

/**
 * Parse AI response and ensure proper JSON format
 */
function parseAIResponse(text: string, analysisType: string): any {
  try {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/);
    const jsonText = jsonMatch ? jsonMatch[1] : text;
    
    const parsed = JSON.parse(jsonText);
    
    // Wrap in appropriate structure
    return {
      [analysisType]: parsed
    };
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    
    // Return a structured fallback based on analysis type
    return getFallbackResponse(analysisType, text);
  }
}

/**
 * Fallback response if JSON parsing fails
 */
function getFallbackResponse(analysisType: string, rawText: string): any {
  const fallbacks = {
    trend_analysis: {
      trend_analysis: {
        summary: rawText.substring(0, 200) || "Unable to generate trend analysis at this time.",
        key_insights: [
          "AI analysis in progress",
          "Please try again in a moment"
        ],
        data_points: []
      }
    },
    sales_forecast: {
      sales_forecast: {
        prediction: "Analysis in progress",
        confidence: "Calculating...",
        recommendations: ["Please try again"]
      }
    },
    inventory_optimization: {
      inventory_optimization: {
        suggestions: ["Analysis in progress"],
        priority_items: []
      }
    },
    recommendations: {
      recommendations: {
        actionable_items: ["Analysis in progress"],
        quick_wins: []
      }
    }
  };
  
  return fallbacks[analysisType as keyof typeof fallbacks] || fallbacks.trend_analysis;
}
