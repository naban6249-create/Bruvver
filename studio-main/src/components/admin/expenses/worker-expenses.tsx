"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Package, Droplets } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { DailyExpense } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { getDailyExpenses, addQuickExpense } from '@/lib/expenses-service';
import { useAuth } from '@/lib/auth-context';

// Common supplies for quick adding
const COMMON_SUPPLIES = [
  { name: 'Milk', unit: 'liters', icon: Droplets, defaultQuantity: 1 },
  { name: 'Water Cans', unit: 'cans', icon: Package, defaultQuantity: 2 },
  { name: 'Coffee Beans', unit: 'kg', icon: Package, defaultQuantity: 0.5 },
  { name: 'Sugar', unit: 'kg', icon: Package, defaultQuantity: 1 },
  { name: 'Tea Powder', unit: 'packets', icon: Package, defaultQuantity: 1 },
];

export function WorkerExpenses() {
    const searchParams = useSearchParams();
    const branchId = searchParams.get('branchId');
    const { hasPermission } = useAuth();
    
    const [expenses, setExpenses] = useState<DailyExpense[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSupply, setSelectedSupply] = useState<string>('');
    const [quantity, setQuantity] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    const currentBranchId = branchId ? parseInt(branchId) : null;
    const hasViewAccess = currentBranchId ? hasPermission(currentBranchId, 'view_only') : false;
    const hasFullAccess = currentBranchId ? hasPermission(currentBranchId, 'full_access') : false;

    const fetchExpenses = useCallback(async () => {
        if (!branchId || !hasViewAccess) {
            setExpenses([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const todayDate = new Date().toISOString().split('T')[0];
            const dailyExpenses = await getDailyExpenses(branchId, todayDate);
            setExpenses(dailyExpenses);
        } catch (error) {
            toast({
                title: "Error",
                description: "Could not load daily expenses.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    }, [branchId, hasViewAccess, toast]);

    useEffect(() => {
        fetchExpenses();
    }, [fetchExpenses]);

    const handleQuickAdd = async () => {
        if (!selectedSupply || !quantity || !branchId) {
            toast({
                title: "Missing Information",
                description: "Please select a supply and enter quantity.",
                variant: "destructive"
            });
            return;
        }

        if (!hasFullAccess) {
            toast({
                title: "Access Denied",
                description: "You don't have permission to add supplies.",
                variant: "destructive"
            });
            return;
        }

        const supply = COMMON_SUPPLIES.find(s => s.name === selectedSupply);
        if (!supply) return;

        setIsSubmitting(true);
        try {
            await addQuickExpense({
                item_name: selectedSupply,
                quantity: parseFloat(quantity),
                unit: supply.unit,
                branch_id: parseInt(branchId),
                expense_date: new Date().toISOString()
            });

            toast({
                title: "Supply Added",
                description: `${quantity} ${supply.unit} of ${selectedSupply} recorded successfully.`
            });

            // Reset form
            setSelectedSupply('');
            setQuantity('');
            
            // Refresh list
            await fetchExpenses();
        } catch (error) {
            toast({
                title: "Error",
                description: "Could not add supply. Please try again.",
                variant: "destructive"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const totalExpenses = expenses.reduce((acc, item) => acc + item.total_amount, 0);
    const selectedSupplyData = COMMON_SUPPLIES.find(s => s.name === selectedSupply);

    if (!branchId) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Daily Supplies</CardTitle>
                    <CardDescription>Please select a branch to manage supplies.</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    if (!hasViewAccess) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Daily Supplies</CardTitle>
                    <CardDescription>You don't have permission to view supplies for this branch.</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Quick Add Form */}
            {hasFullAccess && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <PlusCircle className="h-5 w-5" />
                            Quick Add Supplies
                        </CardTitle>
                        <CardDescription>
                            Quickly record common supplies and inventory purchases.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div className="space-y-2">
                                <Label htmlFor="supply">Supply Item</Label>
                                <Select value={selectedSupply} onValueChange={setSelectedSupply}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select supply" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {COMMON_SUPPLIES.map(supply => (
                                            <SelectItem key={supply.name} value={supply.name}>
                                                <div className="flex items-center gap-2">
                                                    <supply.icon className="h-4 w-4" />
                                                    {supply.name}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="quantity">Quantity</Label>
                                <Input
                                    id="quantity"
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    placeholder={selectedSupplyData?.defaultQuantity.toString() || "0"}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Unit</Label>
                                <div className="h-10 flex items-center text-sm text-muted-foreground border rounded-md px-3">
                                    {selectedSupplyData?.unit || 'Select supply first'}
                                </div>
                            </div>

                            <Button 
                                onClick={handleQuickAdd} 
                                disabled={!selectedSupply || !quantity || isSubmitting}
                                className="h-10"
                            >
                                {isSubmitting ? "Adding..." : "Add Supply"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Today's Expenses */}
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>Today's Supplies & Expenses</CardTitle>
                            <CardDescription>
                                All supplies and expenses recorded for today.
                            </CardDescription>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
                            <div className="text-sm text-muted-foreground">Total spent today</div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center items-center h-40">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                        </div>
                    ) : expenses.length === 0 ? (
                        <div className="text-center py-10">
                            <Package className="mx-auto h-12 w-12 text-muted-foreground" />
                            <h3 className="mt-4 text-lg font-semibold">No supplies recorded</h3>
                            <p className="mt-2 text-sm text-muted-foreground">
                                {hasFullAccess 
                                    ? "Start by adding supplies using the form above."
                                    : "No supplies have been recorded for today yet."
                                }
                            </p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Time</TableHead>
                                    <TableHead>Item</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead className="text-right">Quantity</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {expenses.map(expense => (
                                    <TableRow key={expense.id}>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {formatDate(expense.created_at)}
                                        </TableCell>
                                        <TableCell>
                                            <div>
                                                <div className="font-medium">{expense.item_name}</div>
                                                {expense.description && (
                                                    <div className="text-sm text-muted-foreground">
                                                        {expense.description}
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{expense.category}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {expense.quantity ? `${expense.quantity} ${expense.unit}` : '-'}
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            {formatCurrency(expense.total_amount)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}