"use client";

import * as React from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Minus, Pencil } from "lucide-react";
import type { MenuItem } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { MenuItemDialog } from "./menu-item-dialog";
import { getMenuItems, updateMenuItem } from "@/lib/menu-service";
import { getDailySales, updateDailySale } from "@/lib/sales-service";


interface SaleWithDetails extends MenuItem {
    quantitySold: number;
}

export function DailySalesBreakdown() {
    const [salesDetails, setSalesDetails] = React.useState<SaleWithDetails[]>([]);
    const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
    const [selectedItem, setSelectedItem] = React.useState<MenuItem | null>(null);
    const [currentDate, setCurrentDate] = React.useState('');
    const { toast } = useToast();

    React.useEffect(() => {
        const today = new Date();
        const options: Intl.DateTimeFormatOptions = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };
        setCurrentDate(today.toLocaleDateString('en-US', options));
    }, []);


    const fetchSalesSummary = React.useCallback(async () => {
        try {
            const [menuItems, dailySales] = await Promise.all([getMenuItems(), getDailySales()]);
            
            const itemsWithSales = menuItems.map(item => {
                const sale = dailySales.find(s => s.itemId === item.id);
                const quantitySold = sale ? sale.quantity : 0;
                return {
                    ...item,
                    quantitySold,
                }
            })
            setSalesDetails(itemsWithSales);
        } catch (error) {
            console.error(error);
            toast({
                title: "Error",
                description: "Could not load today's sales data.",
                variant: "destructive"
            });
        }
    }, [toast]);

    React.useEffect(() => {
        fetchSalesSummary();
    }, [fetchSalesSummary]);


    const handleQuantityChange = async (itemId: string, newQuantity: number) => {
        if (newQuantity < 0) return;

        try {
            await updateDailySale(itemId, newQuantity);
            const updatedDetails = salesDetails.map(item =>
                item.id === itemId
                    ? { ...item, quantitySold: newQuantity }
                    : item
            );
            setSalesDetails(updatedDetails);

            toast({
                title: "Quantity Updated",
                description: `Sales for item updated to ${newQuantity}.`,
            });
        } catch (error) {
            console.error("Failed to update quantity:", error);
            toast({
                title: "Error",
                description: "Could not update sales quantity.",
                variant: "destructive"
            });
        }
    };

    const handleEditItem = (item: MenuItem) => {
        setSelectedItem(item);
        setIsEditDialogOpen(true);
    };

    const handleSaveItem = async (item: MenuItem) => {
        try {
            await updateMenuItem(item);
            await fetchSalesSummary();
            toast({ title: "Success", description: `Menu item updated.` });
        } catch (error) {
            toast({ title: "Error", description: `Could not update menu item.`, variant: "destructive" });
        } finally {
            setIsEditDialogOpen(false);
            setSelectedItem(null);
        }
    };

    const overallTotalItemsSold = salesDetails.reduce((acc, item) => acc + item.quantitySold, 0);

    return (
        <>
            <Card className="mt-8">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="font-headline">Daily Sales Breakdown</CardTitle>
                            <CardDescription>A summary of items sold today. You can adjust the quantity sold and edit item details.</CardDescription>
                        </div>
                        <div className="text-right">
                            <p className="font-semibold text-lg">{currentDate.split(',')[0]}</p>
                            <p className="font-semibold text-foreground/90">{currentDate.split(',').slice(1).join(',')}</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[100px]">Image</TableHead>
                                <TableHead>Menu Item</TableHead>
                                <TableHead className="w-[150px] text-right">Quantity Sold</TableHead>
                                <TableHead className="w-[100px] text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {salesDetails.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell>
                                        <Image
                                            alt={item.name}
                                            className="aspect-square rounded-md object-cover"
                                            height="64"
                                            src={item.imageUrl || 'https://placehold.co/64x64/EEE/31343C?text=No+Image'}
                                            width="64"
                                            data-ai-hint="coffee drink"
                                        />
                                    </TableCell>
                                    <TableCell className="font-medium">{item.name}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button 
                                                variant="outline" 
                                                size="icon" 
                                                className="h-8 w-8"
                                                onClick={() => handleQuantityChange(item.id, item.quantitySold - 1)}
                                                disabled={item.quantitySold === 0}
                                            >
                                                <Minus className="h-4 w-4" />
                                            </Button>
                                            <span className="text-center w-8 font-medium">{item.quantitySold}</span>
                                            <Button 
                                                variant="outline" 
                                                size="icon" 
                                                className="h-8 w-8"
                                                onClick={() => handleQuantityChange(item.id, item.quantitySold + 1)}
                                            >
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="outline" size="sm" onClick={() => handleEditItem(item)}>
                                            <Pencil className="mr-2 h-4 w-4" /> Edit
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
                <CardFooter>
                    <div className="flex flex-col items-end w-full gap-2 font-bold text-lg">
                        <span>Total Items Sold Today: {overallTotalItemsSold}</span>
                    </div>
                </CardFooter>
            </Card>
            <MenuItemDialog
                isOpen={isEditDialogOpen}
                setIsOpen={setIsEditDialogOpen}
                onSave={handleSaveItem}
                item={selectedItem}
                showIngredients={false}
            />
        </>
    );
}
