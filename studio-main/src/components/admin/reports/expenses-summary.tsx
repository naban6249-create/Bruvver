"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Landmark } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from "@/hooks/use-toast";
import { getRealExpenseSummary, type RealExpenseSummary } from '@/lib/expenses-service';

interface ExpensesData { totalExpenses: number }
const initialExpensesData: ExpensesData = { totalExpenses: 0 };

export function ExpensesSummary() {
  const searchParams = useSearchParams();
  const branchId = searchParams.get('branchId');
  const [dayExpenses, setDayExpenses] = useState<ExpensesData>(initialExpensesData);
  const [weekExpenses, setWeekExpenses] = useState<ExpensesData>(initialExpensesData);
  const [monthExpenses, setMonthExpenses] = useState<ExpensesData>(initialExpensesData);
  const { toast } = useToast();

  const fetchReal = useCallback(async (): Promise<RealExpenseSummary | null> => {
    try {
      return await getRealExpenseSummary(branchId || undefined);
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Could not load expense summary.', variant: 'destructive' });
      return null;
    }
  }, [branchId, toast]);

  useEffect(() => {
    const load = async () => {
      const summary = await fetchReal();
      if (!summary) {
        setDayExpenses(initialExpensesData);
        setWeekExpenses(initialExpensesData);
        setMonthExpenses(initialExpensesData);
        return;
      }
      setDayExpenses({ totalExpenses: summary.day.total_expenses });
      setWeekExpenses({ totalExpenses: summary.week.total_expenses });
      setMonthExpenses({ totalExpenses: summary.month.total_expenses });
    };
    load();
  }, [fetchReal]);

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
