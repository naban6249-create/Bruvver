"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreHorizontal, Pencil, Trash2, Eye } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import type { DailyExpense } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { ExpenseDialog } from './expense-dialog';
import { DeleteConfirmationDialog } from '../delete-confirmation-dialog';
import { getDailyExpenses, addDailyExpense, updateDailyExpense, deleteDailyExpense } from '@/lib/expenses-service';
import { useAuth } from '@/components/admin/contexts/auth-provider';

export function DailyExpenses() {
    const searchParams = useSearchParams();
    const branchId = searchParams.get('branchId');
    const { user, hasPermission } = useAuth();
    
    const [expenses, setExpenses] = useState<DailyExpense[]>([]);
    const [loading, setLoading] = useState(true);
    const [isNewItemDialogOpen, setIsNewItemDialogOpen] = useState(false);
    const [isEditItemDialogOpen, setIsEditItemDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<DailyExpense | null>(null);
    const { toast } = useToast();

    // Add current date state
    const [currentDate, setCurrentDate] = useState('');

    // Check permissions for current branch
    const currentBranchId = branchId ? parseInt(branchId) : null;
    const hasViewAccess = currentBranchId ? hasPermission(currentBranchId, 'view_only') : false;
    const hasFullAccess = currentBranchId ? hasPermission(currentBranchId, 'full_access') : false;

    // Set current date on component mount
    useEffect(() => {
        const today = new Date();
        const options: Intl.DateTimeFormatOptions = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };
        setCurrentDate(today.toLocaleDateString('en-US', options));
    }, []);

    const fetchExpenses = useCallback(async () => {
        if (!branchId) {
            setExpenses([]);
            setLoading(false);
            return;
        }

        if (!hasViewAccess) {
            toast({
                title: "Access Denied",
                description: "You don't have permission to view expenses for this branch.",
                variant: "destructive"
            });
            setExpenses([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const dailyExpenses = await getDailyExpenses(branchId);
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

    const handleAddNewItem = () => {
        if (!branchId) {
            toast({ 
                title: "Error", 
                description: "Please select a branch first.", 
                variant: "destructive" 
            });
            return;
        }

        if (!hasFullAccess) {
            toast({
                title: "Access Denied",
                description: "You don't have permission to add expenses for this branch.",
                variant: "destructive"
            });
            return;
        }

        setSelectedItem(null);
        setIsNewItemDialogOpen(true);
    };

    const handleEditItem = (item: DailyExpense) => {
        if (!hasFullAccess) {
            toast({
                title: "Access Denied",
                description: "You don't have permission to edit expenses for this branch.",
                variant: "destructive"
            });
            return;
        }

        setSelectedItem(item);
        setIsEditItemDialogOpen(true);
    };

    const handleViewItem = (item: DailyExpense) => {
        setSelectedItem(item);
        setIsEditItemDialogOpen(true);
    };

    const handleDeleteItem = (item: DailyExpense) => {
        if (!hasFullAccess) {
            toast({
                title: "Access Denied",
                description: "You don't have permission to delete expenses for this branch.",
                variant: "destructive"
            });
            return;
        }

        setSelectedItem(item);
        setIsDeleteDialogOpen(true);
    };

    const confirmDeleteItem = async () => {
        if (!selectedItem || !branchId) return;
        
        try {
            await deleteDailyExpense(selectedItem.id);
            await fetchExpenses();
            toast({ title: "Success", description: "Expense deleted." });
        } catch (error) {
            toast({ 
                title: "Error", 
                description: "Could not delete expense.", 
                variant: "destructive" 
            });
        }
        setIsDeleteDialogOpen(false);
        setSelectedItem(null);
    };

    const handleSaveItem = async (expenseData: Omit<DailyExpense, 'id' | 'created_at' | 'created_by'>) => {
        if (!branchId) return;

        const isNew = !selectedItem?.id;
        
        try {
            if (isNew) {
                await addDailyExpense({
                    ...expenseData,
                    branch_id: parseInt(branchId)
                });
            } else {
                await updateDailyExpense(selectedItem!.id, expenseData);
            }
            
            await fetchExpenses();
            toast({ 
                title: "Success", 
                description: `Expense ${isNew ? 'added' : 'updated'}.` 
            });
        } catch (error) {
            toast({ 
                title: "Error", 
                description: `Could not save expense.`, 
                variant: "destructive" 
            });
        }
        
        setIsNewItemDialogOpen(false);
        setIsEditItemDialogOpen(false);
        setSelectedItem(null);
    };

    const totalExpenses = expenses.reduce((acc, item) => acc + item.total_amount, 0);
    
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-IN');
    };

    if (!branchId) {
        return (
            <Card className="mt-8">
                <CardHeader>
                    <CardTitle className="font-headline">Daily Expenses</CardTitle>
                    <CardDescription>Please select a branch to view expenses.</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    if (!hasViewAccess) {
        return (
            <Card className="mt-8">
                <CardHeader>
                    <CardTitle className="font-headline">Daily Expenses</CardTitle>
                    <CardDescription>You don't have permission to view expenses for this branch.</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <>
            <Card className="mt-8">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                        <div className="flex-1">
                            <CardTitle className="font-headline">Daily Expenses</CardTitle>
                            <CardDescription>
                                Track and manage all expenses for the selected branch today.
                                {!hasFullAccess && (
                                    <Badge variant="secondary" className="ml-2">View Only</Badge>
                                )}
                            </CardDescription>
                        </div>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                            <div className="text-left sm:text-right order-2 sm:order-1">
                                <p className="font-semibold text-sm sm:text-lg text-foreground/90">{currentDate.split(',')[0]}</p>
                                <p className="font-medium text-xs sm:text-sm text-foreground/80">{currentDate.split(',').slice(1).join(',')}</p>
                            </div>
                            {hasFullAccess && (
                                <Button size="sm" className="gap-1 order-1 sm:order-2 self-start" onClick={handleAddNewItem}>
                                    <PlusCircle className="h-3.5 w-3.5" />
                                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                                        Add Expense
                                    </span>
                                </Button>
                            )}
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
                            <p className="text-muted-foreground">No expenses recorded for today.</p>
                            {hasFullAccess && (
                                <Button className="mt-4" onClick={handleAddNewItem}>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Add First Expense
                                </Button>
                            )}
                        </div>
                    ) : (
                        <>
                            {/* Mobile Card Layout */}
                            <div className="block md:hidden space-y-4">
                                {expenses.map(item => (
                                    <Card key={item.id} className="p-4">
                                        <div className="space-y-3">
                                            <div className="flex items-start justify-between">
                                                <div className="min-w-0 flex-1">
                                                    <h4 className="font-medium text-sm truncate">{item.item_name}</h4>
                                                    {item.description && (
                                                        <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                                                    )}
                                                </div>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button aria-haspopup="true" size="sm" variant="ghost" className="h-8 w-8 p-0">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                            <span className="sr-only">Toggle menu</span>
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                        {hasFullAccess ? (
                                                            <>
                                                                <DropdownMenuItem onClick={() => handleEditItem(item)}>
                                                                    <Pencil className="mr-2 h-4 w-4" /> Edit
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem 
                                                                    className="text-destructive" 
                                                                    onClick={() => handleDeleteItem(item)}
                                                                >
                                                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                                </DropdownMenuItem>
                                                            </>
                                                        ) : (
                                                            <DropdownMenuItem onClick={() => handleViewItem(item)}>
                                                                <Eye className="mr-2 h-4 w-4" /> View Details
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <span className="text-muted-foreground">Category:</span>
                                                    <div><Badge variant="outline" className="text-xs">{item.category}</Badge></div>
                                                </div>
                                                <div>
                                                    <span className="text-muted-foreground">Date:</span>
                                                    <div className="text-xs">{formatDate(item.expense_date)}</div>
                                                </div>
                                                <div>
                                                    <span className="text-muted-foreground">Quantity:</span>
                                                    <div>{item.quantity ? `${item.quantity} ${item.unit || ''}` : '-'}</div>
                                                </div>
                                                <div>
                                                    <span className="text-muted-foreground">Amount:</span>
                                                    <div className="font-medium text-green-600">{formatCurrency(item.total_amount)}</div>
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
                                            <TableHead>Item</TableHead>
                                            <TableHead>Category</TableHead>
                                            <TableHead>Quantity</TableHead>
                                            <TableHead className="text-right">Amount</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead className="w-[100px] text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {expenses.map(item => (
                                            <TableRow key={item.id}>
                                                <TableCell>
                                                    <div>
                                                        <div className="font-medium">{item.item_name}</div>
                                                        {item.description && (
                                                            <div className="text-sm text-muted-foreground">{item.description}</div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{item.category}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {item.quantity ? `${item.quantity} ${item.unit || ''}` : '-'}
                                                </TableCell>
                                                <TableCell className="text-right font-medium">
                                                    {formatCurrency(item.total_amount)}
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {formatDate(item.expense_date)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button aria-haspopup="true" size="icon" variant="ghost">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                                <span className="sr-only">Toggle menu</span>
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                            {hasFullAccess ? (
                                                                <>
                                                                    <DropdownMenuItem onClick={() => handleEditItem(item)}>
                                                                        <Pencil className="mr-2 h-4 w-4" /> Edit
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem 
                                                                        className="text-destructive" 
                                                                        onClick={() => handleDeleteItem(item)}
                                                                    >
                                                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                                    </DropdownMenuItem>
                                                                </>
                                                            ) : (
                                                                <DropdownMenuItem onClick={() => handleViewItem(item)}>
                                                                    <Eye className="mr-2 h-4 w-4" /> View Details
                                                                </DropdownMenuItem>
                                                            )}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </>
                    )}
                </CardContent>
                <CardFooter>
                    <div className="flex justify-between items-center w-full">
                        <div className="text-sm text-muted-foreground">
                            {expenses.length} expense{expenses.length !== 1 ? 's' : ''} recorded
                        </div>
                        <div className="font-bold text-lg">
                            Total: {formatCurrency(totalExpenses)}
                        </div>
                    </div>
                </CardFooter>
            </Card>
            
            <ExpenseDialog
                isOpen={isNewItemDialogOpen || isEditItemDialogOpen}
                setIsOpen={isNewItemDialogOpen ? setIsNewItemDialogOpen : setIsEditItemDialogOpen}
                onSave={handleSaveItem}
                expense={selectedItem}
                readOnly={!hasFullAccess && isEditItemDialogOpen}
            />
            
            <DeleteConfirmationDialog
                isOpen={isDeleteDialogOpen}
                onClose={() => setIsDeleteDialogOpen(false)}
                onConfirm={confirmDeleteItem}
                title={`Delete ${selectedItem?.item_name ?? 'expense'}?`}
                description="This action cannot be undone."
            />
        </>
    );
}
