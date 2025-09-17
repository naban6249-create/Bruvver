
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Plus, Minus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { DailyExpense } from '@/lib/types';
import { getDailyExpenses, updateDailyExpense } from '@/lib/expenses-service';

export function WorkerExpenses() {
    const searchParams = useSearchParams();
    const branchId = searchParams.get('branchId');
    const [expenses, setExpenses] = useState<DailyExpense[]>([]);
    const { toast } = useToast();

    const fetchExpenses = useCallback(async () => {
        if (!branchId) return;
        try {
            const dailyExpenses = await getDailyExpenses(branchId);
            setExpenses(dailyExpenses);
        } catch (error) {
            toast({
                title: "Error",
                description: "Could not load daily supplies data.",
                variant: "destructive",
            });
        }
    }, [branchId, toast]);

    useEffect(() => {
        fetchExpenses();
    }, [fetchExpenses]);

    const handleQuantityChange = async (expenseId: string, change: number) => {
        const originalExpenses = [...expenses];
        let updatedExpense: DailyExpense | undefined;

        setExpenses(prevExpenses => {
            const newExpenses = prevExpenses.map(exp => {
                if (exp.id === expenseId) {
                    const newAmount = Math.max(0, exp.amount + change);
                    updatedExpense = { ...exp, amount: newAmount };
                    return updatedExpense;
                }
                return exp;
            });
            return newExpenses;
        });

        if (!updatedExpense || !branchId) return;

        try {
            await updateDailyExpense(branchId, expenseId, updatedExpense.amount);
            // Optionally re-fetch to confirm or just trust the state update
            await fetchExpenses();
        } catch (error) {
            console.error("Failed to update quantity:", error);
            toast({
                title: "Error",
                description: "Could not update supply quantity. Reverting change.",
                variant: "destructive"
            });
            setExpenses(originalExpenses); // Revert on failure
        }
    };
    
    return (
        <>
            <Card className="mt-8">
                <CardHeader>
                    <CardTitle className="font-headline">Daily Supplies Usage</CardTitle>
                    <CardDescription>Track the quantity of supplies used today.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Description</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead className="text-right w-[220px]">Quantity Used</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {expenses.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.description}</TableCell>
                                    <TableCell>{item.category}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center justify-end gap-2">
                                            <Button 
                                                variant="outline" 
                                                size="icon" 
                                                className="h-8 w-8"
                                                onClick={() => handleQuantityChange(item.id, -1)}
                                                disabled={item.amount === 0}
                                            >
                                                <Minus className="h-4 w-4" />
                                            </Button>
                                            <span className="font-mono w-20 text-center text-sm">
                                                {item.amount}
                                            </span>
                                            <Button 
                                                variant="outline" 
                                                size="icon" 
                                                className="h-8 w-8"
                                                onClick={() => handleQuantityChange(item.id, 1)}
                                            >
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
                 <CardFooter>
                    <div className="flex justify-end w-full font-bold text-lg">
                        <span>Total Items Used: {expenses.reduce((acc, item) => acc + item.amount, 0)}</span>
                    </div>
                </CardFooter>
            </Card>
        </>
    );
}
