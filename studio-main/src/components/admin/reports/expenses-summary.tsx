"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Landmark, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from "@/hooks/use-toast";
import { getDailyExpenses } from '@/lib/expenses-service';

interface ExpensesData {
  totalExpenses: number;
}

const initialExpensesData: ExpensesData = { totalExpenses: 0 };

export function ExpensesSummary() {
  const searchParams = useSearchParams();
  const branchId = searchParams.get('branchId');
  const [dayExpenses, setDayExpenses] = useState<ExpensesData>(initialExpensesData);
  const [weekExpenses, setWeekExpenses] = useState<ExpensesData>(initialExpensesData);
  const [monthExpenses, setMonthExpenses] = useState<ExpensesData>(initialExpensesData);
  const { toast } = useToast();

  const fetchExpensesData = useCallback(async (period: 'day' | 'week' | 'month') => {
    if (!branchId) return initialExpensesData;
    try {
        const expenses = await getDailyExpenses(branchId);
        let totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

        if (period === "week") {
            totalExpenses *= 7;
        } else if (period === "month") {
            totalExpenses *= 30;
        }

        return { totalExpenses };

    } catch (error) {
        console.error(error);
        toast({
            title: "Error",
            description: `Could not load ${period} expenses data.`,
            variant: "destructive"
        });
        return initialExpensesData;
    }
  }, [branchId, toast]);

  useEffect(() => {
    const loadExpenses = async () => {
        const dayData = await fetchExpensesData('day');
        setDayExpenses(dayData);
        const weekData = await fetchExpensesData('week');
        setWeekExpenses(weekData);
        const monthData = await fetchExpensesData('month');
        setMonthExpenses(monthData);
    };
    loadExpenses();
  }, [fetchExpensesData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const renderExpenseCard = (period: 'Today' | 'This Week' | 'This Month', data: ExpensesData) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Total Expenses ({period})</CardTitle>
        <Landmark className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatCurrency(data.totalExpenses)}</div>
        <p className="text-xs text-muted-foreground">+10% from last period (simulated)</p>
      </CardContent>
    </Card>
  );

  return (
    <>
      {renderExpenseCard('Today', dayExpenses)}
      {renderExpenseCard('This Week', weekExpenses)}
      {renderExpenseCard('This Month', monthExpenses)}
    </>
  );
}
