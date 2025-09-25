"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getOpeningBalance, updateOpeningBalance } from '@/lib/balance-service';
import { getDailySales } from '@/lib/sales-service';
import { getMenuItems } from '@/lib/menu-service';
import { getDailyExpenses } from '@/lib/expenses-service';
import { DollarSign, TrendingUp, TrendingDown, Wallet } from 'lucide-react';

export function DailyBalanceDashboard() {
  const searchParams = useSearchParams();
  const branchId = searchParams.get('branchId');
  const role = searchParams.get('role');
  const { toast } = useToast();

  const [openingBalance, setOpeningBalance] = useState(0);
  const [collections, setCollections] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [balance, setBalance] = useState(0);
  const [newOpeningBalance, setNewOpeningBalance] = useState<string | number>('');

  const fetchData = useCallback(async () => {
    if (!branchId) return;
    try {
      const [ob, sales, menu, branchExpenses] = await Promise.all([
        getOpeningBalance(branchId),
        getDailySales(branchId),
        getMenuItems(branchId),
        getDailyExpenses(branchId),
      ]);

      const totalCollections = sales.reduce((acc, sale) => {
        const item = menu.find(i => i.id === sale.itemId);
        return acc + (item ? item.price * sale.quantity : 0);
      }, 0);

      const totalExpenses = branchExpenses.reduce((acc, expense) => acc + expense.total_amount, 0);

      setOpeningBalance(ob);
      setNewOpeningBalance(ob);
      setCollections(totalCollections);
      setExpenses(totalExpenses);
      setBalance(ob + totalCollections - totalExpenses);

    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data.',
        variant: 'destructive',
      });
    }
  }, [branchId, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdateOpeningBalance = async () => {
    if (!branchId || typeof newOpeningBalance !== 'number') return;
    try {
      await updateOpeningBalance(branchId, newOpeningBalance);
      toast({
        title: 'Success',
        description: 'Opening balance updated successfully.',
      });
      await fetchData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update opening balance.',
        variant: 'destructive',
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="font-headline">Daily Balance Sheet</CardTitle>
        <CardDescription>
          An overview of your daily financial transactions for the selected branch.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {role === 'admin' && (
          <div className="flex items-end gap-4 p-4 border rounded-lg bg-muted/40">
            <div className='flex-grow'>
              <Label htmlFor="openingBalance" className="text-sm font-medium">Set Today's Opening Balance</Label>
              <Input
                id="openingBalance"
                type="number"
                value={newOpeningBalance}
                onChange={(e) => setNewOpeningBalance(Number(e.target.value))}
                className="mt-2"
              />
            </div>
            <Button onClick={handleUpdateOpeningBalance}>Update Balance</Button>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Opening Balance</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(openingBalance)}</div>
              <p className="text-xs text-muted-foreground">Cash at the start of the day</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Collections</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(collections)}</div>
              <p className="text-xs text-muted-foreground">Total revenue from sales</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{formatCurrency(expenses)}</div>
              <p className="text-xs text-muted-foreground">Total cash outflow</p>
            </CardContent>
          </Card>
          <Card className="bg-primary/10 border-primary">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Closing Balance</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(balance)}</div>
              <p className="text-xs text-muted-foreground">Net cash in hand</p>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}
