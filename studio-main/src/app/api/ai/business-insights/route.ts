import { NextRequest, NextResponse } from 'next/server';
import { generateBusinessInsights } from '@/ai';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const timeframe = searchParams.get('timeframe') || 'daily';
    const analysisType = searchParams.get('analysisType') || 'trend_analysis';
    const branchId = searchParams.get('branchId');

    // Validate AI API key
    const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'AI service not configured. Please set GOOGLE_AI_API_KEY in environment' },
        { status: 500 }
      );
    }

    // Get backend URL and service key
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
    const serviceApiKey = process.env.SERVICE_API_KEY;

    if (!serviceApiKey) {
      return NextResponse.json(
        { error: 'Service API Key not configured' },
        { status: 500 }
      );
    }

    // Construct backend API URL
    const params = new URLSearchParams({
      timeframe,
      ...(branchId && { branch_id: branchId }),
    });
    
    const url = `${backendUrl.replace(/\/api$/, '')}/api/v1/sales-data-for-ai?${params.toString()}`;

    console.log(`🔍 Fetching sales data from: ${url}`);

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
      const errorText = await response.text();
      console.error(`❌ Backend error (${response.status}):`, errorText);
      
      return NextResponse.json(
        { error: `Backend API error: ${response.statusText}` },
        { status: response.status }
      );
    }

    const salesData = await response.json();
    
    console.log(`✅ Fetched ${salesData.length} sales records`);

    // Check if we have data
    if (!salesData || salesData.length === 0) {
      return NextResponse.json({
        [analysisType]: {
          summary: "No sales data available for the selected timeframe.",
          message: "Start recording sales to see AI-powered insights."
        }
      });
    }

    // Generate AI insights
    const insights = await generateBusinessInsights(salesData, analysisType, timeframe);

    return NextResponse.json(insights);

  } catch (error) {
    console.error('Business insights error:', error);
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate insights' },
      { status: 500 }
    );
  }
}
