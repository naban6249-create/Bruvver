'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, TrendingUp, DollarSign, PackageSearch, Lightbulb } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useBusinessInsights } from '@/hooks/useBusinessInsights';
import { useSearchParams } from 'next/navigation';

type Timeframe = 'daily' | 'weekly' | 'monthly';
type AnalysisType = 'trend_analysis' | 'sales_forecast' | 'inventory_optimization' | 'recommendations';

interface InsightData {
  trend_analysis?: {
    summary: string;
    key_insights: string[];
    data_points?: Array<{ date: string; value: number }>;
  };
  sales_forecast?: {
    prediction: string;
    confidence: string;
    recommendations: string[];
  };
  inventory_optimization?: {
    suggestions: string[];
    priority_items: string[];
  };
  recommendations?: {
    actionable_items: string[];
    quick_wins: string[];
  };
}

export default function BusinessInsightsPage() {
  const searchParams = useSearchParams();
  const branchId = searchParams.get('branchId');
  
  const [timeframe, setTimeframe] = useState<Timeframe>('daily');
  const [insights, setInsights] = useState<InsightData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { fetchQuickInsights } = useBusinessInsights();

  const handleAnalyze = async (analysisType: AnalysisType) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await fetchQuickInsights(timeframe, analysisType, branchId ? parseInt(branchId) : undefined);
      setInsights(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch insights');
      console.error('Analysis error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Sample chart data for visualization
  const chartData = insights?.trend_analysis?.data_points || [
    { date: '2025-10-21', value: 1200 },
    { date: '2025-10-22', value: 1350 },
    { date: '2025-10-23', value: 1500 },
    { date: '2025-10-24', value: 1280 },
    { date: '2025-10-25', value: 1600 },
    { date: '2025-10-26', value: 1750 },
    { date: '2025-10-27', value: 1900 },
  ];

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Business Insights AI</h2>
          <p className="text-muted-foreground">
            AI-powered analytics to optimize your coffee shop operations
          </p>
        </div>
      </div>

      {/* Timeframe Selection */}
      <div className="flex gap-2">
        <Button
          variant={timeframe === 'daily' ? 'default' : 'outline'}
          onClick={() => setTimeframe('daily')}
          disabled={isLoading}
        >
          Daily
        </Button>
        <Button
          variant={timeframe === 'weekly' ? 'default' : 'outline'}
          onClick={() => setTimeframe('weekly')}
          disabled={isLoading}
        >
          Weekly
        </Button>
        <Button
          variant={timeframe === 'monthly' ? 'default' : 'outline'}
          onClick={() => setTimeframe('monthly')}
          disabled={isLoading}
        >
          Monthly
        </Button>
      </div>

      {/* Analysis Tabs */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="forecast">Forecast</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        {/* Trend Analysis Tab */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  <CardTitle>Sales Trend Analysis</CardTitle>
                </div>
                <Button 
                  onClick={() => handleAnalyze('trend_analysis')}
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Analyze Trends
                </Button>
              </div>
              <CardDescription>
                Identify patterns in your sales data for the selected timeframe
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="bg-destructive/10 text-destructive p-4 rounded-md mb-4">
                  {error}
                </div>
              )}
              
              {insights?.trend_analysis ? (
                <div className="space-y-4">
                  <div className="prose max-w-none">
                    <p className="text-lg font-medium">{insights.trend_analysis.summary}</p>
                  </div>
                  
                  {insights.trend_analysis.key_insights && (
                    <div>
                      <h4 className="font-semibold mb-2">Key Insights:</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {insights.trend_analysis.key_insights.map((insight, idx) => (
                          <li key={idx} className="text-muted-foreground">{insight}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Custom Visualization */}
                  <div className="mt-6">
                    <h4 className="font-semibold mb-4">Revenue Trend</h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="value" 
                          stroke="#8884d8" 
                          name="Revenue (₹)"
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">
                  Click "Analyze Trends" to get AI insights on your sales patterns
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sales Forecast Tab */}
        <TabsContent value="forecast" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  <CardTitle>Sales Forecast</CardTitle>
                </div>
                <Button 
                  onClick={() => handleAnalyze('sales_forecast')}
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Generate Forecast
                </Button>
              </div>
              <CardDescription>
                Predict future revenue based on historical data
              </CardDescription>
            </CardHeader>
            <CardContent>
              {insights?.sales_forecast ? (
                <div className="space-y-4">
                  <div className="bg-primary/10 p-4 rounded-lg">
                    <p className="text-lg font-medium">{insights.sales_forecast.prediction}</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Confidence: {insights.sales_forecast.confidence}
                    </p>
                  </div>
                  
                  {insights.sales_forecast.recommendations && (
                    <div>
                      <h4 className="font-semibold mb-2">Recommendations:</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {insights.sales_forecast.recommendations.map((rec, idx) => (
                          <li key={idx} className="text-muted-foreground">{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">
                  Click "Generate Forecast" to predict future sales
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventory Optimization Tab */}
        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PackageSearch className="h-5 w-5" />
                  <CardTitle>Inventory Optimization</CardTitle>
                </div>
                <Button 
                  onClick={() => handleAnalyze('inventory_optimization')}
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Optimize Inventory
                </Button>
              </div>
              <CardDescription>
                Get suggestions to optimize your stock levels
              </CardDescription>
            </CardHeader>
            <CardContent>
              {insights?.inventory_optimization ? (
                <div className="space-y-4">
                  {insights.inventory_optimization.suggestions && (
                    <div>
                      <h4 className="font-semibold mb-2">Suggestions:</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {insights.inventory_optimization.suggestions.map((sug, idx) => (
                          <li key={idx} className="text-muted-foreground">{sug}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {insights.inventory_optimization.priority_items && (
                    <div className="mt-4">
                      <h4 className="font-semibold mb-2">Priority Items:</h4>
                      <div className="flex flex-wrap gap-2">
                        {insights.inventory_optimization.priority_items.map((item, idx) => (
                          <span key={idx} className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">
                  Click "Optimize Inventory" to get stock recommendations
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  <CardTitle>Business Recommendations</CardTitle>
                </div>
                <Button 
                  onClick={() => handleAnalyze('recommendations')}
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Get Recommendations
                </Button>
              </div>
              <CardDescription>
                Actionable insights to improve your business
              </CardDescription>
            </CardHeader>
            <CardContent>
              {insights?.recommendations ? (
                <div className="space-y-4">
                  {insights.recommendations.actionable_items && (
                    <div>
                      <h4 className="font-semibold mb-2">Actionable Items:</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {insights.recommendations.actionable_items.map((item, idx) => (
                          <li key={idx} className="text-muted-foreground">{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {insights.recommendations.quick_wins && (
                    <div className="mt-4 bg-green-50 p-4 rounded-lg">
                      <h4 className="font-semibold mb-2 text-green-800">Quick Wins:</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {insights.recommendations.quick_wins.map((win, idx) => (
                          <li key={idx} className="text-green-700">{win}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">
                  Click "Get Recommendations" for business improvement suggestions
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
