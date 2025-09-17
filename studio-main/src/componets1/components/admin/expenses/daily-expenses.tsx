"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { DailyExpense } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { ExpenseDialog } from './expense-dialog';
import { DeleteConfirmationDialog } from '../delete-confirmation-dialog';
import { getDailyExpenses, addDailyExpense, updateDailyExpense, deleteDailyExpense } from '@/lib/expenses-service';


export function DailyExpenses() {
    const searchParams = useSearchParams();
    const branchId = searchParams.get('branchId');
    const [expenses, setExpenses] = useState<DailyExpense[]>([]);
    const [isNewItemDialogOpen, setIsNewItemDialogOpen] = useState(false);
    const [isEditItemDialogOpen, setIsEditItemDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<DailyExpense | null>(null);
    const { toast } = useToast();

    const fetchExpenses = useCallback(async () => {
        if (!branchId) {
            setExpenses([]);
            return;
        }
        try {
            const dailyExpenses = await getDailyExpenses(branchId);
            setExpenses(dailyExpenses);
        } catch (error) {
            toast({
                title: "Error",
                description: "Could not load daily expenses.",
                variant: "destructive"
            });
        }
    }, [branchId, toast]);

    useEffect(() => {
        fetchExpenses();
    }, [fetchExpenses]);

    const handleAddNewItem = () => {
        if (!branchId) {
            toast({ title: "Error", description: "Please select a branch first.", variant: "destructive" });
            return;
        }
        setSelectedItem(null);
        setIsNewItemDialogOpen(true);
    };

    const handleEditItem = (item: DailyExpense) => {
        setSelectedItem(item);
        setIsEditItemDialogOpen(true);
    };

    const handleDeleteItem = (item: DailyExpense) => {
        setSelectedItem(item);
        setIsDeleteDialogOpen(true);
    };

    const confirmDeleteItem = async () => {
        if (!selectedItem || !branchId) return;
        try {
            await deleteDailyExpense(branchId, selectedItem.id);
            await fetchExpenses();
            toast({ title: "Success", description: "Expense deleted." });
        } catch (error) {
            toast({ title: "Error", description: "Could not delete expense.", variant: "destructive" });
        }
        setIsDeleteDialogOpen(false);
        setSelectedItem(null);
    };

    const handleSaveItem = async (item: DailyExpense) => {
        if (!branchId) return;
        const isNew = !item.id;
        try {
            if (isNew) {
                await addDailyExpense(branchId, { ...item, branchId });
            } else {
                await updateDailyExpense(branchId, { ...item, branchId });
            }
            await fetchExpenses();
            toast({ title: "Success", description: `Expense ${isNew ? 'added' : 'updated'}.` });
        } catch (error) {
            toast({ title: "Error", description: `Could not save expense.`, variant: "destructive" });
        }
        setIsNewItemDialogOpen(false);
        setIsEditItemDialogOpen(false);
        setSelectedItem(null);
    };

    const totalExpenses = expenses.reduce((acc, item) => acc + item.amount, 0);
    
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
        }).format(amount);
    }

    return (
        <>
            <Card className="mt-8">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="font-headline">Daily Expenses</CardTitle>
                            <CardDescription>Track and manage all expenses for the selected branch today.</CardDescription>
                        </div>
                        <Button size="sm" className="gap-1" onClick={handleAddNewItem}>
                            <PlusCircle className="h-3.5 w-3.5" />
                            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                                Add Expense
                            </span>
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Description</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead className="w-[100px] text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {expenses.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.description}</TableCell>
                                    <TableCell>{item.category}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
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
                                                <DropdownMenuItem onClick={() => handleEditItem(item)}>
                                                    <Pencil className="mr-2 h-4 w-4" /> Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteItem(item)}>
                                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
                <CardFooter>
                    <div className="flex justify-end w-full font-bold text-lg">
                        <span>Total Expenses Today: {formatCurrency(totalExpenses)}</span>
                    </div>
                </CardFooter>
            </Card>
            <ExpenseDialog
                isOpen={isNewItemDialogOpen || isEditItemDialogOpen}
                setIsOpen={isNewItemDialogOpen ? setIsNewItemDialogOpen : setIsEditItemDialogOpen}
                onSave={handleSaveItem}
                expense={selectedItem}
            />
            <DeleteConfirmationDialog
                isOpen={isDeleteDialogOpen}
                setIsOpen={setIsDeleteDialogOpen}
                onConfirm={confirmDeleteItem}
                itemName={selectedItem?.description}
            />
        </>
    );
}
