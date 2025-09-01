"use client";

import { IndianRupee, Package, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DAILY_SALES, MENU_ITEMS } from '@/lib/data';

export function SalesSummary() {
  const calculateSales = (period: 'day' | 'week' | 'month') => {
    let multiplier = 1;
    if (period === 'week') multiplier = 7;
    if (period === 'month') multiplier = 30;

    const totalRevenue = DAILY_SALES.reduce((acc, sale) => {
      const menuItem = MENU_ITEMS.find((item) => item.id === sale.itemId);
      return acc + (menuItem ? menuItem.price * sale.quantity : 0);
    }, 0) * multiplier;

    const totalItemsSold = DAILY_SALES.reduce((acc, sale) => acc + sale.quantity, 0) * multiplier;
    
    return { totalRevenue, totalItemsSold };
  };

  const daySales = calculateSales('day');
  const weekSales = calculateSales('week');
  const monthSales = calculateSales('month');

  return (
    <Card>
        <CardHeader>
            <CardTitle className="font-headline">Sales Summary</CardTitle>
            <CardDescription>A summary of sales over different time periods.</CardDescription>
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
                                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                                <IndianRupee className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">₹{daySales.totalRevenue.toFixed(2)}</div>
                                <p className="text-xs text-muted-foreground">+2% from yesterday (simulated)</p>
                            </CardContent>
                        </Card>
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
                    </div>
                </TabsContent>
                <TabsContent value="week">
                    <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4 mt-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                                <IndianRupee className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">₹{weekSales.totalRevenue.toFixed(2)}</div>
                                <p className="text-xs text-muted-foreground">+15% from last week (simulated)</p>
                            </CardContent>
                        </Card>
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
                    </div>
                </TabsContent>
                <TabsContent value="month">
                    <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4 mt-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                                <IndianRupee className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">₹{monthSales.totalRevenue.toFixed(2)}</div>
                                <p className="text-xs text-muted-foreground">+20.1% from last month (simulated)</p>
                            </CardContent>
                        </Card>
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
                                <CardTitle className="text-sm font-medium">
                                    Monthly Recurring Revenue
                                </CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">₹353,189.00</div>
                                <p className="text-xs text-muted-foreground">
                                    +12% from last month (simulated)
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </CardContent>
    </Card>
  );
}