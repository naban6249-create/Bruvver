"use client";

import * as React from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Minus, AlertCircle, Wallet, Smartphone, Edit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { MenuItem, DailySale } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { getMenuItems } from "@/lib/menu-service";
import { getDailySales, createSale, deleteLastSale } from "@/lib/sales-service";
import { useAuth } from "@/lib/auth-context";

interface MenuItemWithSales extends MenuItem {
    quantitySold: number;
    cashCount: number;
    gpayCount: number;
}

// Bulk Entry Dialog Component
function BulkEntryDialog({ 
    isOpen, 
    onClose, 
    onConfirm,
    itemName,
}: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (quantity: number, paymentMethod: 'cash' | 'gpay') => void;
    itemName: string;
}) {
    const [quantity, setQuantity] = React.useState<string>('');
    const [selectedPayment, setSelectedPayment] = React.useState<'cash' | 'gpay'>('cash');
    const inputRef = React.useRef<HTMLInputElement>(null);

    // Auto-select input text when dialog opens
    React.useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => {
                inputRef.current?.select();
            }, 100);
        }
    }, [isOpen]);

    const handleConfirm = () => {
        const qty = parseInt(quantity);
        if (isNaN(qty) || qty < 1) {
            return;
        }
        onConfirm(qty, selectedPayment);
        setQuantity('');
        setSelectedPayment('cash');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleConfirm();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Record Sales</DialogTitle>
                    <DialogDescription>
                        Enter quantity and payment method for <br />
                        <span className="font-medium">{itemName}</span>
                    </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="quantity">Quantity</Label>
                        <Input
                            ref={inputRef}
                            id="quantity"
                            type="number"
                            min="1"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Enter quantity"
                            autoFocus
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Payment Method</Label>
                        <div className="grid grid-cols-2 gap-4">
                            <Button
                                type="button"
                                variant={selectedPayment === 'cash' ? 'default' : 'outline'}
                                className="h-20 flex flex-col gap-2"
                                onClick={() => setSelectedPayment('cash')}
                            >
                                <Wallet className="h-6 w-6" />
                                <span>Cash</span>
                            </Button>
                            <Button
                                type="button"
                                variant={selectedPayment === 'gpay' ? 'default' : 'outline'}
                                className="h-20 flex flex-col gap-2"
                                onClick={() => setSelectedPayment('gpay')}
                            >
                                <Smartphone className="h-6 w-6" />
                                <span>GPay / UPI</span>
                            </Button>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleConfirm} disabled={!quantity || parseInt(quantity) < 1}>
                        Record {quantity || '0'} Sale{(parseInt(quantity) || 0) !== 1 ? 's' : ''}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function DailySalesBreakdown({ onSaleChange }: { onSaleChange?: () => void }) {
    const searchParams = useSearchParams();
    const branchId = searchParams.get('branchId');
    const { user, hasPermission } = useAuth();
    
    const [menuItems, setMenuItems] = React.useState<MenuItem[]>([]);
    const [salesTransactions, setSalesTransactions] = React.useState<DailySale[]>([]);
    const [itemsWithSales, setItemsWithSales] = React.useState<MenuItemWithSales[]>([]);
    const [isBulkDialogOpen, setIsBulkDialogOpen] = React.useState(false);
    const [pendingItem, setPendingItem] = React.useState<{
        itemId: string;
        itemName: string;
    } | null>(null);
    const [currentDate, setCurrentDate] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);
    const [totalRevenue, setTotalRevenue] = React.useState(0);
    const { toast } = useToast();

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

    // Calculate aggregated data from transactions
    const calculateItemSales = React.useCallback((menuItems: MenuItem[], transactions: DailySale[]): MenuItemWithSales[] => {
        return menuItems.map(item => {
            const itemTransactions = transactions.filter(t => String(t.itemId) === String(item.id));
            const totalQuantity = itemTransactions.reduce((sum, t) => sum + t.quantity, 0);
            const cashCount = itemTransactions
                .filter(t => t.paymentMethod === 'cash')
                .reduce((sum, t) => sum + t.quantity, 0);
            const gpayCount = itemTransactions
                .filter(t => t.paymentMethod === 'gpay')
                .reduce((sum, t) => sum + t.quantity, 0);
            
            return {
                ...item,
                quantitySold: totalQuantity,
                cashCount,
                gpayCount
            };
        });
    }, []);

    // Fetch all data
    const fetchSalesData = React.useCallback(async () => {
        if (!branchId || !hasViewAccess) {
            setItemsWithSales([]);
            setTotalRevenue(0);
            return;
        }

        setIsLoading(true);
        try {
            const [menuData, salesData] = await Promise.all([
                getMenuItems(branchId),
                getDailySales(branchId)
            ]);
            
            setMenuItems(menuData);
            setSalesTransactions(salesData);
            
            const aggregated = calculateItemSales(menuData, salesData);
            setItemsWithSales(aggregated);
            
            const revenue = salesData.reduce((sum, sale) => sum + sale.revenue, 0);
            setTotalRevenue(revenue);
            
        } catch (error) {
            console.error('Error fetching sales data:', error);
            toast({
                title: "Error",
                description: "Could not load today's sales data.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    }, [branchId, hasViewAccess, toast, calculateItemSales]);

    React.useEffect(() => {
        fetchSalesData();
    }, [fetchSalesData]);

    // Open bulk entry dialog
    const handleOpenBulkEntry = (itemId: string, itemName: string) => {
        if (!hasFullAccess || !branchId) return;
        
        setPendingItem({ itemId, itemName });
        setIsBulkDialogOpen(true);
    };

    // Handle bulk entry confirmation
    const handleBulkEntryConfirm = async (quantity: number, paymentMethod: 'cash' | 'gpay') => {
        if (!pendingItem || !branchId) return;

        setIsBulkDialogOpen(false);
        
        try {
            // Create multiple sale transactions
            for (let i = 0; i < quantity; i++) {
                await createSale(parseInt(branchId), pendingItem.itemId, 1, paymentMethod);
            }
            
            toast({
                title: "Sales Recorded",
                description: `${quantity} x ${pendingItem.itemName} - ${paymentMethod === 'cash' ? 'Cash' : 'GPay'}`,
            });
            
            await fetchSalesData();
            onSaleChange?.();
        } catch (error) {
            console.error("Failed to create sales:", error);
            toast({
                title: "Error",
                description: (error as Error)?.message || "Could not record sales.",
                variant: "destructive"
            });
        } finally {
            setPendingItem(null);
        }
    };

    // Handle removing the last sale
    const handleRemoveSale = async (itemId: string, itemName: string) => {
        if (!hasFullAccess || !branchId) return;

        const itemSales = salesTransactions.filter(t => String(t.itemId) === String(itemId));
        if (itemSales.length === 0) {
            toast({
                title: "No Sales",
                description: `No sales found for ${itemName} to remove.`,
                variant: "destructive"
            });
            return;
        }

        try {
            await deleteLastSale(parseInt(branchId), itemId);
            
            toast({
                title: "Sale Removed",
                description: `Last sale of ${itemName} has been removed.`,
            });
            
            await fetchSalesData();
            onSaleChange?.();
        } catch (error) {
            console.error("Failed to delete sale:", error);
            toast({
                title: "Error",
                description: (error as Error)?.message || "Could not remove sale.",
                variant: "destructive"
            });
        }
    };

    const getImageUrl = (item: MenuItem): string => {
        const url = item.imageUrl || (item as any).image_url || '';
        return url.trim() || 'https://placehold.co/64x64/png?text=N/A';
    };

    const overallTotalItemsSold = itemsWithSales.reduce((acc, item) => 
        acc + item.quantitySold, 0
    );

    if (isLoading) {
        return (
            <Card className="mt-8">
                <CardContent className="flex justify-center items-center h-40">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </CardContent>
            </Card>
        );
    }

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
                                Click the edit button to enter sales in bulk.
                                {!hasFullAccess && (
                                    <Badge variant="secondary" className="ml-2">View Only</Badge>
                                )}
                            </CardDescription>
                        </div>
                        <div className="text-right">
                            <p className="font-semibold text-lg text-foreground/90">
                                {currentDate.split(',')[0]}
                            </p>
                            <p className="font-medium text-foreground/80">
                                {currentDate.split(',').slice(1).join(',')}
                            </p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {itemsWithSales.length === 0 ? (
                        <div className="text-center py-10">
                            <p className="text-muted-foreground">
                                No menu items found for this branch.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Mobile Card Layout - FIXED */}
                            <div className="block md:hidden space-y-4">
                                {itemsWithSales.map(item => (
                                    <Card key={item.id} className="p-4">
                                        <div className="flex items-start gap-3">
                                            <div className="flex-shrink-0">
                                                <Image
                                                    alt={item.name}
                                                    className="aspect-square rounded-md object-cover"
                                                    height="48"
                                                    src={getImageUrl(item)}
                                                    width="48"
                                                    unoptimized
                                                    onError={(e) => { 
                                                        e.currentTarget.src = 'https://placehold.co/48x48/png?text=N/A';
                                                    }}
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-medium text-sm truncate">
                                                    {item.name}
                                                </h4>
                                                {item.description && (
                                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                                        {item.description}
                                                    </p>
                                                )}
                                                
                                                <div className="mt-2 space-y-1">
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-muted-foreground">Price:</span>
                                                        <span>₹{item.price.toFixed(2)}</span>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-muted-foreground">Quantity:</span>
                                                            <span className="font-medium">{item.quantitySold}</span>
                                                        </div>
                                                        <div className="flex justify-between text-xs">
                                                            <span className="text-muted-foreground">Payment:</span>
                                                            <span className="text-muted-foreground">
                                                                💵{item.cashCount} 📱{item.gpayCount}
                                                            </span>
                                                        </div>
                                                        {hasFullAccess && (
                                                            <div className="flex items-center gap-1.5 pt-1">
                                                                <Button 
                                                                    variant="outline" 
                                                                    size="sm"
                                                                    className="h-7 flex-1 text-xs px-2"
                                                                    onClick={() => handleRemoveSale(String(item.id), item.name)}
                                                                    disabled={item.quantitySold === 0}
                                                                >
                                                                    <Minus className="h-3 w-3 mr-1" />
                                                                    Remove
                                                                </Button>
                                                                <Button 
                                                                    variant="default" 
                                                                    size="sm"
                                                                    className="h-7 flex-1 text-xs px-2"
                                                                    onClick={() => handleOpenBulkEntry(String(item.id), item.name)}
                                                                >
                                                                    <Edit className="h-3 w-3 mr-1" />
                                                                    Record
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {user?.role === 'admin' && (
                                                        <div className="flex justify-between text-sm font-medium">
                                                            <span>Revenue:</span>
                                                            <span className="text-green-600">
                                                                ₹{(item.price * item.quantitySold).toFixed(2)}
                                                            </span>
                                                        </div>
                                                    )}
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
                                            <TableHead className="w-[200px] text-right">
                                                Quantity Sold
                                            </TableHead>
                                            {user?.role === 'admin' && (
                                                <TableHead className="text-right">Revenue</TableHead>
                                            )}
                                            {hasFullAccess && (
                                                <TableHead className="w-[100px] text-right">Actions</TableHead>
                                            )}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {itemsWithSales.map(item => (
                                            <TableRow key={item.id}>
                                                <TableCell>
                                                    <Image
                                                        alt={item.name}
                                                        className="aspect-square rounded-md object-cover"
                                                        height="64"
                                                        src={getImageUrl(item)}
                                                        width="64"
                                                        unoptimized
                                                        onError={(e) => { 
                                                            e.currentTarget.src = 'https://placehold.co/64x64/png?text=N/A';
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-medium">{item.name}</div>
                                                    {item.description && (
                                                        <div className="text-sm text-muted-foreground">
                                                            {item.description}
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    ₹{item.price.toFixed(2)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex flex-col items-end">
                                                        <div className="font-medium">{item.quantitySold}</div>
                                                        <div className="text-xs text-muted-foreground">
                                                            💵{item.cashCount} 📱{item.gpayCount}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                {user?.role === 'admin' && (
                                                    <TableCell className="text-right font-medium">
                                                        ₹{(item.price * item.quantitySold).toFixed(2)}
                                                    </TableCell>
                                                )}
                                                {hasFullAccess && (
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <Button 
                                                                variant="outline" 
                                                                size="icon" 
                                                                className="h-8 w-8"
                                                                onClick={() => handleRemoveSale(String(item.id), item.name)}
                                                                disabled={item.quantitySold === 0}
                                                                title="Remove last sale"
                                                            >
                                                                <Minus className="h-4 w-4" />
                                                            </Button>
                                                            <Button 
                                                                variant="default" 
                                                                size="icon" 
                                                                className="h-8 w-8"
                                                                onClick={() => handleOpenBulkEntry(String(item.id), item.name)}
                                                                title="Record sales"
                                                            >
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                        </div>
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
                        {user?.role === 'admin' && (
                            <div className="font-bold text-xl text-green-600">
                                Total Revenue: ₹{totalRevenue.toFixed(2)}
                            </div>
                        )}
                        <div className="text-sm text-muted-foreground">
                            {salesTransactions.length} total transaction{salesTransactions.length !== 1 ? 's' : ''}
                        </div>
                    </div>
                </CardFooter>
            </Card>
            
            <BulkEntryDialog
                isOpen={isBulkDialogOpen}
                onClose={() => {
                    setIsBulkDialogOpen(false);
                    setPendingItem(null);
                }}
                onConfirm={handleBulkEntryConfirm}
                itemName={pendingItem?.itemName || ''}
            />
        </>
    );
}
