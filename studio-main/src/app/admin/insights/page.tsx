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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Business Insights AI</h2>
          <p className="text-muted-foreground mt-1">
            AI-powered analytics to optimize your coffee shop operations
          </p>
        </div>
      </div>

      {/* Timeframe Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Timeframe</CardTitle>
          <CardDescription>Choose the period for your analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={timeframe === 'daily' ? 'default' : 'outline'}
              onClick={() => setTimeframe('daily')}
              disabled={isLoading}
              className="flex-1 sm:flex-none"
            >
              Daily
              <span className="ml-2 text-xs opacity-75">(Last 7 days)</span>
            </Button>
            <Button
              variant={timeframe === 'weekly' ? 'default' : 'outline'}
              onClick={() => setTimeframe('weekly')}
              disabled={isLoading}
              className="flex-1 sm:flex-none"
            >
              Weekly
              <span className="ml-2 text-xs opacity-75">(Last 4 weeks)</span>
            </Button>
            <Button
              variant={timeframe === 'monthly' ? 'default' : 'outline'}
              onClick={() => setTimeframe('monthly')}
              disabled={isLoading}
              className="flex-1 sm:flex-none"
            >
              Monthly
              <span className="ml-2 text-xs opacity-75">(Last 6 months)</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-red-100 p-2">
                <Lightbulb className="h-5 w-5 text-red-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-red-900">Error Loading Insights</h4>
                <p className="text-sm text-red-700 mt-1">{error}</p>
                <p className="text-xs text-red-600 mt-2">
                  Please check your internet connection and try again.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analysis Tabs */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="forecast">Forecast</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="recommendations">Tips</TabsTrigger>
        </TabsList>

        {/* Trend Analysis Tab */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    <CardTitle>Sales Trend Analysis</CardTitle>
                  </div>
                  <CardDescription className="mt-2">
                    Identify patterns in your sales data for the selected timeframe
                  </CardDescription>
                </div>
                <Button 
                  onClick={() => handleAnalyze('trend_analysis')}
                  disabled={isLoading}
                  className="w-full sm:w-auto flex-shrink-0"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Analyze Trends
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading && (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                    <p className="text-sm text-muted-foreground">Analyzing your sales data...</p>
                  </div>
                </div>
              )}

              {!isLoading && insights?.trend_analysis ? (
                <div className="space-y-6">
                  <div className="prose max-w-none">
                    <p className="text-lg font-medium">{insights.trend_analysis.summary}</p>
                  </div>
                  
                  {insights.trend_analysis.key_insights && insights.trend_analysis.key_insights.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-3">Key Insights:</h4>
                      <ul className="space-y-2">
                        {insights.trend_analysis.key_insights.map((insight, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-primary mt-1">•</span>
                            <span className="text-muted-foreground flex-1">{insight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Custom Visualization */}
                  <div className="mt-6">
                    <h4 className="font-semibold mb-4">Revenue Trend</h4>
                    <div className="w-full overflow-x-auto">
                      <ResponsiveContainer width="100%" height={300} minWidth={300}>
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="date" 
                            tick={{ fontSize: 12 }}
                            angle={-45}
                            textAnchor="end"
                            height={80}
                          />
                          <YAxis tick={{ fontSize: 12 }} />
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
                </div>
              ) : !isLoading && (
                <div className="text-center py-12">
                  <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Click "Analyze Trends" to get AI insights on your sales patterns
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sales Forecast Tab */}
        <TabsContent value="forecast" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    <CardTitle>Sales Forecast</CardTitle>
                  </div>
                  <CardDescription className="mt-2">
                    Predict future revenue based on historical data
                  </CardDescription>
                </div>
                <Button 
                  onClick={() => handleAnalyze('sales_forecast')}
                  disabled={isLoading}
                  className="w-full sm:w-auto flex-shrink-0"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Generate Forecast
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading && (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                    <p className="text-sm text-muted-foreground">Generating forecast...</p>
                  </div>
                </div>
              )}

              {!isLoading && insights?.sales_forecast ? (
                <div className="space-y-4">
                  <div className="bg-primary/10 p-4 rounded-lg">
                    <p className="text-lg font-medium">{insights.sales_forecast.prediction}</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Confidence: {insights.sales_forecast.confidence}
                    </p>
                  </div>
                  
                  {insights.sales_forecast.recommendations && insights.sales_forecast.recommendations.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-3">Recommendations:</h4>
                      <ul className="space-y-2">
                        {insights.sales_forecast.recommendations.map((rec, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-primary mt-1">•</span>
                            <span className="text-muted-foreground flex-1">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : !isLoading && (
                <div className="text-center py-12">
                  <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Click "Generate Forecast" to predict future sales
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventory Optimization Tab */}
        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <PackageSearch className="h-5 w-5" />
                    <CardTitle>Inventory Optimization</CardTitle>
                  </div>
                  <CardDescription className="mt-2">
                    Get suggestions to optimize your stock levels
                  </CardDescription>
                </div>
                <Button 
                  onClick={() => handleAnalyze('inventory_optimization')}
                  disabled={isLoading}
                  className="w-full sm:w-auto flex-shrink-0"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Optimize Inventory
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading && (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                    <p className="text-sm text-muted-foreground">Analyzing inventory needs...</p>
                  </div>
                </div>
              )}

              {!isLoading && insights?.inventory_optimization ? (
                <div className="space-y-4">
                  {insights.inventory_optimization.suggestions && insights.inventory_optimization.suggestions.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-3">Suggestions:</h4>
                      <ul className="space-y-2">
                        {insights.inventory_optimization.suggestions.map((sug, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-primary mt-1">•</span>
                            <span className="text-muted-foreground flex-1">{sug}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {insights.inventory_optimization.priority_items && insights.inventory_optimization.priority_items.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-semibold mb-3">Priority Items:</h4>
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
              ) : !isLoading && (
                <div className="text-center py-12">
                  <PackageSearch className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Click "Optimize Inventory" to get stock recommendations
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5" />
                    <CardTitle className="text-lg sm:text-xl">Business Recommendations</CardTitle>
                  </div>
                  <CardDescription className="mt-2 text-sm">
                    Actionable insights to improve your business
                  </CardDescription>
                </div>
                <Button 
                  onClick={() => handleAnalyze('recommendations')}
                  disabled={isLoading}
                  className="w-full sm:w-auto sm:self-end"
                  size="default"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Get Recommendations
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading && (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                    <p className="text-sm text-muted-foreground">Generating recommendations...</p>
                  </div>
                </div>
              )}

              {!isLoading && insights?.recommendations ? (
                <div className="space-y-4">
                  {insights.recommendations.actionable_items && insights.recommendations.actionable_items.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-3">Actionable Items:</h4>
                      <ul className="space-y-2">
                        {insights.recommendations.actionable_items.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-primary mt-1">•</span>
                            <span className="text-muted-foreground flex-1">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {insights.recommendations.quick_wins && insights.recommendations.quick_wins.length > 0 && (
                    <div className="mt-4 bg-green-50 p-4 rounded-lg">
                      <h4 className="font-semibold mb-3 text-green-800">Quick Wins:</h4>
                      <ul className="space-y-2">
                        {insights.recommendations.quick_wins.map((win, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-green-600 mt-1">✓</span>
                            <span className="text-green-700 flex-1">{win}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : !isLoading && (
                <div className="text-center py-12">
                  <Lightbulb className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Click "Get Recommendations" for business improvement suggestions
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
