"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Package, IndianRupee } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from "@/hooks/use-toast";
import { getMenuItems } from "@/lib/menu-service";
import { getDailySales } from "@/lib/sales-service";

interface SalesData {
  totalItemsSold: number;
  totalRevenue: number;
}

const initialSalesData: SalesData = { totalItemsSold: 0, totalRevenue: 0 };

export function SalesSummary() {
  const searchParams = useSearchParams();
  const branchId = searchParams.get('branchId');
  const [daySales, setDaySales] = useState<SalesData>(initialSalesData);
  const [weekSales, setWeekSales] = useState<SalesData>(initialSalesData);
  const [monthSales, setMonthSales] = useState<SalesData>(initialSalesData);
  const { toast } = useToast();

  const fetchSalesData = useCallback(async (period: 'day' | 'week' | 'month') => {
    if (!branchId) return initialSalesData;
    try {
        const [menuItems, dailySales] = await Promise.all([getMenuItems(branchId), getDailySales(branchId)]);

        let totalItemsSold = 0;
        let totalRevenue = 0;

        dailySales.forEach(sale => {
            const item = menuItems.find(i => i.id === sale.itemId);
            if (item) {
                totalItemsSold += sale.quantity;
                totalRevenue += sale.quantity * item.price;
            }
        });
        
        if (period === "week") {
            totalItemsSold *= 7;
            totalRevenue *= 7;
        } else if (period === "month") {
            totalItemsSold *= 30;
            totalRevenue *= 30;
        }

        return { totalItemsSold, totalRevenue };

    } catch (error) {
        console.error(error);
        toast({
            title: "Error",
            description: `Could not load ${period} sales data.`,
            variant: "destructive"
        });
        return initialSalesData;
    }
  }, [branchId, toast]);

  useEffect(() => {
    const loadSales = async () => {
        const dayData = await fetchSalesData('day');
        setDaySales(dayData);
        const weekData = await fetchSalesData('week');
        setWeekSales(weekData);
        const monthData = await fetchSalesData('month');
        setMonthSales(monthData);
    };
    loadSales();
  }, [fetchSalesData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
    }).format(amount);
  }

  const renderSalesCards = (data: SalesData, period: string) => (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Items Sold</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.totalItemsSold}</div>
          <p className="text-xs text-muted-foreground">+5 from last {period} (simulated)</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          <IndianRupee className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(data.totalRevenue)}</div>
          <p className="text-xs text-muted-foreground">+₹2000 from last {period} (simulated)</p>
        </CardContent>
      </Card>
    </>
  );

  return (
    <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4 mt-4">
        {renderSalesCards(daySales, 'day')}
        {renderSalesCards(weekSales, 'week')}
        {renderSalesCards(monthSales, 'month')}
    </div>
  );
}
