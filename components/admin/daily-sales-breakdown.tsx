"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DAILY_SALES, MENU_ITEMS } from "@/lib/data";
import { Input } from "@/components/ui/input";
import type { DailySale } from "@/lib/types";

export function DailySalesBreakdown() {
    const [salesData, setSalesData] = React.useState<DailySale[]>(DAILY_SALES);

    const handleQuantityChange = (itemId: string, newQuantity: string) => {
        const quantity = parseInt(newQuantity, 10);
        if (isNaN(quantity) || quantity < 0) return;

        setSalesData(prevSales => 
            prevSales.map(sale => 
                sale.itemId === itemId ? { ...sale, quantity: quantity } : sale
            )
        );
    };

    const salesWithDetails = salesData.map(sale => {
        const menuItem = MENU_ITEMS.find(item => item.id === sale.itemId);
        if (!menuItem) return null;
        return {
            ...menuItem,
            quantitySold: sale.quantity,
            totalRevenue: sale.quantity * menuItem.price,
        };
    }).filter((item): item is NonNullable<typeof item> => item !== null);

    const overallTotalItemsSold = salesWithDetails.reduce((acc, item) => acc + item.quantitySold, 0);
    const overallTotalRevenue = salesWithDetails.reduce((acc, item) => acc + item.totalRevenue, 0);

    return (
        <Card className="mt-8">
            <CardHeader>
                <CardTitle className="font-headline">Daily Sales Breakdown</CardTitle>
                <CardDescription>A summary of items sold today. You can edit the quantity sold directly.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Menu Item</TableHead>
                            <TableHead className="text-right">Price</TableHead>
                            <TableHead className="w-[120px] text-right">Quantity Sold</TableHead>
                            <TableHead className="text-right">Total Revenue</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {salesWithDetails.map(item => (
                            <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.name}</TableCell>
                                <TableCell className="text-right">₹{item.price.toFixed(2)}</TableCell>
                                <TableCell className="text-right">
                                    <Input 
                                        type="number"
                                        className="w-20 ml-auto text-right"
                                        value={item.quantitySold}
                                        onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                        min="0"
                                    />
                                </TableCell>
                                <TableCell className="text-right">₹{item.totalRevenue.toFixed(2)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
            <CardFooter>
                <div className="flex flex-col items-end w-full gap-2 font-bold text-lg">
                    <span>Total Items Sold Today: {overallTotalItemsSold}</span>
                    <span>Total Revenue Today: ₹{overallTotalRevenue.toFixed(2)}</span>
                </div>
            </CardFooter>
        </Card>
    );
}
