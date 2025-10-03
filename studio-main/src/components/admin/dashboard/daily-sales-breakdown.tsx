"use client";

import * as React from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Minus, Pencil, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { MenuItem } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { MenuItemDialog } from "@/components/admin/menu/menu-item-dialog";
import { getMenuItems, updateMenuItem } from "@/lib/menu-service";
import { getDailySales, updateDailySale, getSalesSummary } from "@/lib/sales-service";
import { useAuth } from "@/lib/auth-context";

interface SaleWithDetails extends MenuItem {
    quantitySold: number;
}

export function DailySalesBreakdown() {
    const searchParams = useSearchParams();
    const branchId = searchParams.get('branchId');
    const { user, hasPermission } = useAuth();
    
    const [salesDetails, setSalesDetails] = React.useState<SaleWithDetails[]>([]);
    const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
    const [selectedItem, setSelectedItem] = React.useState<MenuItem | null>(null);
    const [currentDate, setCurrentDate] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);
    const [totalRevenue, setTotalRevenue] = React.useState(0);
    const { toast } = useToast();

    // Check permissions for current branch
    const currentBranchId = branchId ? parseInt(branchId) : null;
    const hasViewAccess = currentBranchId ? hasPermission(currentBranchId, 'view_only') : false;
    const hasFullAccess = currentBranchId ? hasPermission(currentBranchId, 'full_access') : false;

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
        if (!branchId) {
            setSalesDetails([]);
            setTotalRevenue(0);
            return;
        }

        if (!hasViewAccess) {
            toast({
                title: "Access Denied",
                description: "You don't have permission to view sales for this branch.",
                variant: "destructive"
            });
            setSalesDetails([]);
            setTotalRevenue(0);
            return;
        }

        setIsLoading(true);
        try {
            // Align with server 'today' by omitting date_filter; backend defaults to server-local date
            const [menuItems, dailySales] = await Promise.all([
                getMenuItems(branchId),
                getDailySales(branchId)
            ]);
            
            // Create a map of sales by item ID for quick lookup
            const salesMap = new Map(dailySales.map(sale => [sale.itemId, sale]));
            
            // Combine menu items with their sales data
            const itemsWithSales = menuItems.map(item => {
                const sale = salesMap.get(item.id);
                const quantitySold = sale ? sale.quantity : 0;
                return {
                    ...item,
                    quantitySold,
                };
            });
            
            setSalesDetails(itemsWithSales);
            
            // Calculate total revenue from displayed items to match table sum
            const revenue = itemsWithSales.reduce((sum, item) => sum + item.price * item.quantitySold, 0);
            setTotalRevenue(revenue);
            
        } catch (error) {
            console.error('Error fetching sales data:', error);
            toast({
                title: "Error",
                description: "Could not load today's sales data.",
                variant: "destructive"
            });
            setSalesDetails([]);
            setTotalRevenue(0);
        } finally {
            setIsLoading(false);
        }
    }, [branchId, hasViewAccess, toast]);

    React.useEffect(() => {
        fetchSalesSummary();
    }, [fetchSalesSummary]);

    const handleQuantityChange = async (itemId: string, newQuantity: number) => {
        if (newQuantity < 0 || !branchId || !hasFullAccess) return;

        // Optimistic UI update for snappy UX
        const prev = salesDetails;
        const updated = salesDetails.map((it) =>
            it.id === itemId ? { ...it, quantitySold: newQuantity } : it
        );
        setSalesDetails(updated);
        const optimisticRevenue = updated.reduce((sum, it) => sum + it.price * it.quantitySold, 0);
        setTotalRevenue(optimisticRevenue);

        try {
            await updateDailySale(branchId, itemId, newQuantity);
            // Refetch from server to ensure UI matches backend
            await fetchSalesSummary();
            toast({
                title: "Quantity Updated",
                description: `Sales quantity updated to ${newQuantity}.`,
            });
        } catch (error) {
            console.error("Failed to update quantity:", error);
            // Revert UI on error
            setSalesDetails(prev);
            const revertedRevenue = prev.reduce((sum, it) => sum + it.price * it.quantitySold, 0);
            setTotalRevenue(revertedRevenue);
            toast({
                title: "Error",
                description: (error as Error)?.message || "Could not update sales quantity.",
                variant: "destructive"
            });
        }
    };

    const handleEditItem = (item: MenuItem) => {
        if (!hasFullAccess) {
            toast({
                title: "Access Denied",
                description: "You don't have permission to edit menu items.",
                variant: "destructive"
            });
            return;
        }
        setSelectedItem(item);
        setIsEditDialogOpen(true);
    };

    const handleSaveItem = async (itemData: FormData) => {
        if (!branchId) return;

        // The dialog passes FormData, which is what the service function expects.
        try {
            const itemId = itemData.get('id') as string;
            // The service function `updateMenuItem` is expecting FormData and the item ID.
            await updateMenuItem(itemData, itemId); 
            await fetchSalesSummary(); // Refetch all sales data to reflect potential price changes etc.
            toast({ title: "Success", description: `Menu item updated.` });
        } catch (error) {
            console.error('Error updating menu item:', error);
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            toast({ title: "Error", description: `Could not update menu item: ${errorMessage}`, variant: "destructive" });
        } finally {
            setIsEditDialogOpen(false);
            setSelectedItem(null);
        }
    };

    const overallTotalItemsSold = salesDetails.reduce((acc, item) => acc + item.quantitySold, 0);

    // Show loading state
    if (isLoading) {
        return (
            <Card className="mt-8">
                <CardContent className="flex justify-center items-center h-40">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </CardContent>
            </Card>
        );
    }

    // Show branch selection prompt
    if (!branchId) {
        return (
            <Card className="mt-8">
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-amber-500" />
                        No Branch Selected
                    </CardTitle>
                    <CardDescription>
                        Please select a branch from the header to view daily sales.
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    // Show access denied
    if (!hasViewAccess) {
        return (
            <Card className="mt-8">
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-red-500" />
                        Access Denied
                    </CardTitle>
                    <CardDescription>
                        You don't have permission to view sales data for this branch.
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <>
            <Card className="mt-8">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="font-headline">Daily Sales Breakdown</CardTitle>
                            <CardDescription>
                                Track daily sales for each menu item. 
                                {!hasFullAccess && (
                                    <Badge variant="secondary" className="ml-2">View Only</Badge>
                                )}
                            </CardDescription>
                        </div>
                        <div className="text-right">
                            <p className="font-semibold text-lg text-foreground/90">{currentDate.split(',')[0]}</p>
                            <p className="font-medium text-foreground/80">{currentDate.split(',').slice(1).join(',')}</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {salesDetails.length === 0 ? (
                        <div className="text-center py-10">
                            <p className="text-muted-foreground">No menu items found for this branch.</p>
                        </div>
                    ) : (
                        <>
                            {/* Mobile Card Layout */}
                            <div className="block md:hidden space-y-4">
                                {salesDetails.map(item => (
                                    <Card key={item.id} className="p-4">
                                        <div className="flex items-start gap-3">
                                            <div className="flex-shrink-0">
                                                {(() => {
                                                    const imgSrc = item.imageUrl && item.imageUrl.trim().length > 0
                                                        ? item.imageUrl
                                                        : 'https://picsum.photos/64/64';
                                                    const isRemote = !imgSrc.startsWith('/');
                                                    return (
                                                        <Image
                                                            alt={item.name}
                                                            className="aspect-square rounded-md object-cover"
                                                            height="48"
                                                            src={imgSrc}
                                                            width="48"
                                                            unoptimized={isRemote}
                                                            data-ai-hint="coffee drink"
                                                        />
                                                    );
                                                })()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between">
                                                    <div className="min-w-0 flex-1">
                                                        <h4 className="font-medium text-sm truncate">{item.name}</h4>
                                                        {item.description && (
                                                            <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                                                        )}
                                                    </div>
                                                    {hasFullAccess && (
                                                        <Button variant="ghost" size="sm" onClick={() => handleEditItem(item)} className="ml-2">
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                                
                                                <div className="mt-2 space-y-1">
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-muted-foreground">Price:</span>
                                                        <span>₹{item.price.toFixed(2)}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm text-muted-foreground">Quantity:</span>
                                                        {hasFullAccess ? (
                                                            <div className="flex items-center gap-1">
                                                                <Button 
                                                                    variant="outline" 
                                                                    size="icon" 
                                                                    className="h-6 w-6"
                                                                    onClick={() => handleQuantityChange(item.id, item.quantitySold - 1)}
                                                                    disabled={item.quantitySold === 0}
                                                                >
                                                                    <Minus className="h-3 w-3" />
                                                                </Button>
                                                                <span className="text-sm font-medium min-w-[2rem] text-center">{item.quantitySold}</span>
                                                                <Button 
                                                                    variant="outline" 
                                                                    size="icon" 
                                                                    className="h-6 w-6"
                                                                    onClick={() => handleQuantityChange(item.id, item.quantitySold + 1)}
                                                                >
                                                                    <Plus className="h-3 w-3" />
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <span className="text-sm font-medium">{item.quantitySold}</span>
                                                        )}
                                                    </div>
                                                    <div className="flex justify-between text-sm font-medium">
                                                        <span>Revenue:</span>
                                                        <span className="text-green-600">₹{(item.price * item.quantitySold).toFixed(2)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>

                            {/* Desktop Table Layout */}
                            <div className="hidden md:block">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[100px]">Image</TableHead>
                                            <TableHead>Menu Item</TableHead>
                                            <TableHead className="text-right">Price</TableHead>
                                            <TableHead className="w-[150px] text-right">Quantity Sold</TableHead>
                                            <TableHead className="text-right">Revenue</TableHead>
                                            {hasFullAccess && (
                                                <TableHead className="w-[100px] text-right">Actions</TableHead>
                                            )}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {salesDetails.map(item => (
                                            <TableRow key={item.id}>
                                                <TableCell>
                                                    {(() => {
                                                        const imgSrc = item.imageUrl && item.imageUrl.trim().length > 0
                                                            ? item.imageUrl
                                                            : 'https://picsum.photos/64/64';
                                                        const isRemote = !imgSrc.startsWith('/');
                                                        return (
                                                            <Image
                                                                alt={item.name}
                                                                className="aspect-square rounded-md object-cover"
                                                                height="64"
                                                                src={imgSrc}
                                                                width="64"
                                                                unoptimized={isRemote}
                                                                data-ai-hint="coffee drink"
                                                            />
                                                        );
                                                    })()}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-medium">{item.name}</div>
                                                    {item.description && (
                                                        <div className="text-sm text-muted-foreground">{item.description}</div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    ₹{item.price.toFixed(2)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {hasFullAccess ? (
                                                            <>
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
                                                            </>
                                                        ) : (
                                                            <span className="text-center font-medium">{item.quantitySold}</span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right font-medium">
                                                    ₹{(item.price * item.quantitySold).toFixed(2)}
                                                </TableCell>
                                                {hasFullAccess && (
                                                    <TableCell className="text-right">
                                                        <Button variant="outline" size="sm" onClick={() => handleEditItem(item)}>
                                                            <Pencil className="mr-2 h-4 w-4" /> Edit
                                                        </Button>
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </>
                    )}
                </CardContent>
                <CardFooter>
                    <div className="flex flex-col items-end w-full gap-2">
                        <div className="font-bold text-lg">
                            Total Items Sold: {overallTotalItemsSold}
                        </div>
                        <div className="font-bold text-xl text-green-600">
                            Total Revenue: ₹{totalRevenue.toFixed(2)}
                        </div>
                    </div>
                </CardFooter>
            </Card>
            
            {hasFullAccess && (
                <MenuItemDialog
                    isOpen={isEditDialogOpen}
                    setIsOpen={setIsEditDialogOpen}
                    onSave={handleSaveItem}
                    item={selectedItem}
                    showIngredients={false}
                />
            )}
        </>
    );
}
