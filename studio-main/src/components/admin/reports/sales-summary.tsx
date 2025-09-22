"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Package, IndianRupee } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from "@/hooks/use-toast";
import { getRealSalesSummary, type RealSalesSummary } from "@/lib/sales-service";

interface SalesData { totalItemsSold: number; totalRevenue: number }
const initialSalesData: SalesData = { totalItemsSold: 0, totalRevenue: 0 };

export function SalesSummary() {
  const searchParams = useSearchParams();
  const branchId = searchParams.get('branchId');
  const [daySales, setDaySales] = useState<SalesData>(initialSalesData);
  const [weekSales, setWeekSales] = useState<SalesData>(initialSalesData);
  const [monthSales, setMonthSales] = useState<SalesData>(initialSalesData);
  const [todayItems, setTodayItems] = useState<Array<{ item_id: number; name: string; quantity_sold: number; revenue: number }>>([]);
  const [weekItems, setWeekItems] = useState<Array<{ item_id: number; name: string; quantity_sold: number; revenue: number }>>([]);
  const [monthItems, setMonthItems] = useState<Array<{ item_id: number; name: string; quantity_sold: number; revenue: number }>>([]);
  const { toast } = useToast();

  const fetchSummary = useCallback(async (): Promise<RealSalesSummary | null> => {
    if (!branchId) return {
      branch_id: null,
      day: { total_items_sold: 0, total_revenue: 0 },
      week: { total_items_sold: 0, total_revenue: 0 },
      month: { total_items_sold: 0, total_revenue: 0 },
    };
    try {
      return await getRealSalesSummary(branchId);
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Could not load sales summary.', variant: 'destructive' });
      return null;
    }
  }, [branchId, toast]);

  useEffect(() => {
    const load = async () => {
      const summary = await fetchSummary();
      if (!summary) {
        setDaySales(initialSalesData);
        setWeekSales(initialSalesData);
        setMonthSales(initialSalesData);
        setTodayItems([]);
        setWeekItems([]);
        setMonthItems([]);
        return;
      }
      setDaySales({ totalItemsSold: summary.day.total_items_sold, totalRevenue: summary.day.total_revenue });
      setWeekSales({ totalItemsSold: summary.week.total_items_sold, totalRevenue: summary.week.total_revenue });
      setMonthSales({ totalItemsSold: summary.month.total_items_sold, totalRevenue: summary.month.total_revenue });
      setTodayItems(Array.isArray((summary as any).today_items) ? (summary as any).today_items : []);
      setWeekItems(Array.isArray((summary as any).week_items) ? (summary as any).week_items : []);
      setMonthItems(Array.isArray((summary as any).month_items) ? (summary as any).month_items : []);
    };
    load();
  }, [fetchSummary]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
    }).format(amount);
  }

  const renderSalesCard = (period: 'Today' | 'This Week' | 'This Month', data: SalesData) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Sales ({period})</CardTitle>
        <Package className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span className="flex items-center gap-1"><Package className="h-3 w-3" /> Items Sold</span>
          <span className="font-semibold text-foreground">{data.totalItemsSold}</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
          <span className="flex items-center gap-1"><IndianRupee className="h-3 w-3" /> Total Revenue</span>
          <span className="font-semibold text-foreground">{formatCurrency(data.totalRevenue)}</span>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-3 mt-4">
        {renderSalesCard('Today', daySales)}
        {renderSalesCard('This Week', weekSales)}
        {renderSalesCard('This Month', monthSales)}

        {/* Today's per-item ranking */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top Items (Today)</CardTitle>
            </CardHeader>
            <CardContent>
              {todayItems.length === 0 ? (
                <div className="text-sm text-muted-foreground">No sales recorded today.</div>
              ) : (
                <div className="divide-y rounded-md border">
                  {todayItems.map((it, idx) => (
                    <div key={it.item_id} className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-6 text-right">{idx + 1}.</span>
                        <span className="font-medium">{it.name}</span>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <span className="flex items-center gap-1"><Package className="h-3 w-3" /> {it.quantity_sold}</span>
                        <span className="flex items-center gap-1"><IndianRupee className="h-3 w-3" /> {formatCurrency(it.revenue)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Week per-item ranking */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top Items (Last 7 days)</CardTitle>
            </CardHeader>
            <CardContent>
              {weekItems.length === 0 ? (
                <div className="text-sm text-muted-foreground">No sales recorded in the last week.</div>
              ) : (
                <div className="divide-y rounded-md border">
                  {weekItems.map((it, idx) => (
                    <div key={`w-${it.item_id}`} className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-6 text-right">{idx + 1}.</span>
                        <span className="font-medium">{it.name}</span>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <span className="flex items-center gap-1"><Package className="h-3 w-3" /> {it.quantity_sold}</span>
                        <span className="flex items-center gap-1"><IndianRupee className="h-3 w-3" /> {formatCurrency(it.revenue)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Month per-item ranking */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top Items (Month to date)</CardTitle>
            </CardHeader>
            <CardContent>
              {monthItems.length === 0 ? (
                <div className="text-sm text-muted-foreground">No sales recorded this month.</div>
              ) : (
                <div className="divide-y rounded-md border">
                  {monthItems.map((it, idx) => (
                    <div key={`m-${it.item_id}`} className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-6 text-right">{idx + 1}.</span>
                        <span className="font-medium">{it.name}</span>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <span className="flex items-center gap-1"><Package className="h-3 w-3" /> {it.quantity_sold}</span>
                        <span className="flex items-center gap-1"><IndianRupee className="h-3 w-3" /> {formatCurrency(it.revenue)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
    </div>
  );
}
