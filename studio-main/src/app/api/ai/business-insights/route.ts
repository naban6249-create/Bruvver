import { NextRequest, NextResponse } from 'next/server';
import { generateBusinessInsights } from '@/ai';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const timeframe = searchParams.get('timeframe') || 'daily';
    const analysisType = searchParams.get('analysisType') || 'trend_analysis';
    const branchId = searchParams.get('branchId');

    console.log(`🔍 Business Insights Request: ${analysisType} for ${timeframe}${branchId ? ` (branch ${branchId})` : ''}`);

    // Validate AI API key
    const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      console.error('❌ Google AI API key not configured');
      return NextResponse.json(
        { error: 'AI service not configured. Please set GOOGLE_AI_API_KEY in environment variables' },
        { status: 500 }
      );
    }

    // Get backend URL and service key
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
    const serviceApiKey = process.env.SERVICE_API_KEY;

    if (!serviceApiKey) {
      console.error('❌ Service API Key not configured');
      return NextResponse.json(
        { error: 'Service authentication not configured. Contact administrator.' },
        { status: 500 }
      );
    }

    // Construct backend API URL
    const params = new URLSearchParams({
      timeframe,
      ...(branchId && { branch_id: branchId }),
    });
    
    const url = `${backendUrl.replace(/\/api$/, '')}/api/v1/sales-data-for-ai?${params.toString()}`;

    console.log(`📡 Fetching sales data from backend: ${url}`);

    // Fetch sales data from Python backend using Service Key
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': serviceApiKey,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      let errorDetail = `HTTP ${response.status}`;
      try {
        const errorJson = await response.json();
        errorDetail = errorJson.detail || JSON.stringify(errorJson);
      } catch (e) {
        errorDetail = await response.text();
      }
      
      console.error(`❌ Backend API error (${response.status}):`, errorDetail);
      
      // Return user-friendly error messages
      if (response.status === 401 || response.status === 403) {
        return NextResponse.json(
          { error: 'Authentication failed. Please check service configuration.' },
          { status: 401 }
        );
      } else if (response.status === 404) {
        return NextResponse.json(
          { error: 'Backend endpoint not found. Please ensure backend is running.' },
          { status: 404 }
        );
      } else {
        return NextResponse.json(
          { error: `Backend error: ${errorDetail}` },
          { status: response.status }
        );
      }
    }

    const salesData = await response.json();
    
    console.log(`✅ Successfully fetched ${salesData.length} sales records from database`);

    // Check if we have data
    if (!salesData || salesData.length === 0) {
      console.warn('⚠️ No sales data available for analysis');
      return NextResponse.json({
        [analysisType]: {
          summary: "No sales data available for the selected timeframe.",
          message: "Start recording sales to see AI-powered insights.",
          key_insights: [
            "No data to analyze yet",
            "Begin by recording some sales transactions",
            "AI insights will appear once you have sales data"
          ]
        }
      });
    }

    // Log data summary
    const totalRevenue = salesData.reduce((sum: number, item: any) => sum + (item.revenue || 0), 0);
    const totalQuantity = salesData.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
    console.log(`📊 Data Summary: ${totalQuantity} items sold, ₹${totalRevenue.toFixed(2)} revenue`);

    // Generate AI insights using Genkit
    console.log(`🤖 Generating AI insights using Gemini...`);
    const insights = await generateBusinessInsights(salesData, analysisType, timeframe);
    
    console.log(`✅ AI insights generated successfully for ${analysisType}`);

    return NextResponse.json(insights);

  } catch (error) {
    console.error('❌ Business insights error:', error);
    
    // Provide specific error messages
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'Invalid or missing API key. Please check your environment variables.' },
          { status: 500 }
        );
      }
      
      if (error.message.includes('quota')) {
        return NextResponse.json(
          { error: 'API quota exceeded. Please try again later or upgrade your plan.' },
          { status: 429 }
        );
      }

      if (error.message.includes('fetch')) {
        return NextResponse.json(
          { error: 'Failed to connect to backend. Please ensure the backend service is running.' },
          { status: 503 }
        );
      }
    }
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to generate insights',
        details: 'Please check server logs for more information'
      },
      { status: 500 }
    );
  }
}

// Optional: POST endpoint for custom analysis with provided data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { salesData, analysisType, timeframe } = body;

    if (!salesData || !Array.isArray(salesData)) {
      return NextResponse.json(
        { error: 'Invalid sales data provided. Expected an array of sales records.' },
        { status: 400 }
      );
    }

    if (salesData.length === 0) {
      return NextResponse.json({
        [analysisType]: {
          summary: "No sales data provided for analysis.",
          message: "Please provide sales data to generate insights."
        }
      });
    }

    console.log(`🔍 Custom analysis: ${analysisType} for ${timeframe} with ${salesData.length} records`);

    const insights = await generateBusinessInsights(salesData, analysisType, timeframe);

    return NextResponse.json(insights);

  } catch (error) {
    console.error('❌ POST Business insights error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate insights' },
      { status: 500 }
    );
  }
}
