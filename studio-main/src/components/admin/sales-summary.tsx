"use client";

import React, { useState, useEffect } from 'react';
import { Package, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { getMenuItems } from '@/lib/menu-service';
import { getDailySales } from '@/lib/sales-service';

interface SalesData {
  totalItemsSold: number;
  totalRevenue: number;
}

const initialSalesData: SalesData = { totalItemsSold: 0, totalRevenue: 0 };

export function SalesSummary() {
  const [daySales, setDaySales] = useState<SalesData>(initialSalesData);
  const [weekSales, setWeekSales] = useState<SalesData>(initialSalesData);
  const [monthSales, setMonthSales] = useState<SalesData>(initialSalesData);
  const { toast } = useToast();

  const fetchSalesData = async (period: 'day' | 'week' | 'month') => {
    try {
        const [menuItems, dailySales] = await Promise.all([getMenuItems(), getDailySales()]);

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
  };

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(amount);
  }

  return (
    <Card>
        <CardHeader>
            <CardTitle className="font-headline">Sales Summary</CardTitle>
            <CardDescription>A summary of items sold and revenue over different time periods.</CardDescription>
        </CardHeader>
        <CardContent>
            <Tabs defaultValue="day">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="day">Today</TabsTrigger>
                    <TabsTrigger value="week">This Week</TabsTrigger>
                    <TabsTrigger value="month">This Month</TabsTrigger>
                </TabsList>
                <TabsContent value="day">
                    <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4 mt-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Items Sold</CardTitle>
                                <Package className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{daySales.totalItemsSold}</div>
                                <p className="text-xs text-muted-foreground">+5 from yesterday (simulated)</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatCurrency(daySales.totalRevenue)}</div>
                                <p className="text-xs text-muted-foreground">+$20.00 from yesterday (simulated)</p>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
                <TabsContent value="week">
                    <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4 mt-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Items Sold</CardTitle>
                                <Package className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{weekSales.totalItemsSold}</div>
                                <p className="text-xs text-muted-foreground">+50 from last week (simulated)</p>
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatCurrency(weekSales.totalRevenue)}</div>
                                <p className="text-xs text-muted-foreground">+$215.50 from last week (simulated)</p>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
                <TabsContent value="month">
                    <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4 mt-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Items Sold</CardTitle>
                                <Package className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{monthSales.totalItemsSold}</div>
                                <p className="text-xs text-muted-foreground">+180.1% from last month (simulated)</p>
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatCurrency(monthSales.totalRevenue)}</div>
                                <p className="text-xs text-muted-foreground">+192.1% from last month (simulated)</p>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </CardContent>
    </Card>
  );
}
