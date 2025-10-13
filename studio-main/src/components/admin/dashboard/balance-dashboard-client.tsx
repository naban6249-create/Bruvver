"use client";

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth-context';
import { getOpeningBalance, updateOpeningBalance, getDailyBalanceSummary } from '@/lib/balance-service';
import { IndianRupee, TrendingUp, TrendingDown, Wallet } from 'lucide-react';

export function BalanceDashboardClient() {
  const searchParams = useSearchParams();
  const branchId = searchParams.get('branchId');
  const { user } = useAuth();
  const { toast } = useToast();

  const [summary, setSummary] = React.useState({
    openingBalance: 0,
    totalRevenue: 0,
    totalExpenses: 0,
    calculatedBalance: 0,
    transactionCount: 0,
  });
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(new Date());
  const [newOpeningBalance, setNewOpeningBalance] = React.useState<string>('');
  const [currentDate, setCurrentDate] = React.useState('');
  const [isUpdating, setIsUpdating] = React.useState(false);

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

  const fetchSummary = React.useCallback(async (branchId: string, date?: Date) => {
    const dateString = date ? date.toISOString().split('T')[0] : undefined;
    
    try {
      // ✅ FIXED: Removed token parameter - ApiClient handles it
      const summaryData = await getDailyBalanceSummary(branchId, dateString);
      setSummary(summaryData);
      setNewOpeningBalance(summaryData.openingBalance.toString());
    } catch (error) {
      console.error('Error fetching summary:', error);
      toast({
        title: 'Error',
        description: 'Failed to load balance data.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  React.useEffect(() => {
    if (branchId) {
      fetchSummary(branchId, selectedDate);
    }
  }, [branchId, selectedDate, fetchSummary]);

  const handleUpdateOpeningBalance = React.useCallback(async () => {
    if (!branchId || !newOpeningBalance || isNaN(Number(newOpeningBalance))) {
      toast({
        title: 'Invalid Input',
        description: 'Please enter a valid opening balance amount.',
        variant: 'destructive',
      });
      return;
    }

    setIsUpdating(true);
    try {
      // ✅ FIXED: Removed token parameter - ApiClient handles it
      await updateOpeningBalance(branchId, Number(newOpeningBalance), undefined);
      
      toast({
        title: 'Success',
        description: 'Opening balance updated successfully.',
      });
      
      await fetchSummary(branchId, selectedDate);
    } catch (error) {
      console.error('Error updating balance:', error);
      toast({
        title: 'Error',
        description: 'Failed to update opening balance.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  }, [branchId, newOpeningBalance, selectedDate, fetchSummary, toast]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  return (
    <Card className="mt-8">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="font-headline">Daily Balance Sheet</CardTitle>
            <CardDescription>
              An overview of your daily financial transactions for the selected branch.
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="font-semibold text-lg text-foreground/90">{currentDate.split(',')[0]}</p>
            <p className="font-medium text-foreground/80">{currentDate.split(',').slice(1).join(',')}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {user?.role === 'admin' && (
          <div className="flex items-end gap-4 p-4 border rounded-lg bg-muted/40">
            <div className='flex-grow'>
              <Label htmlFor="openingBalance" className="text-sm font-medium">Set Today's Opening Balance</Label>
              <Input
                id="openingBalance"
                type="number"
                step="0.01"
                value={newOpeningBalance}
                onChange={(e) => setNewOpeningBalance(e.target.value)}
                className="mt-2"
                disabled={isUpdating}
              />
            </div>
            <Button onClick={handleUpdateOpeningBalance} disabled={isUpdating}>
              {isUpdating ? 'Updating...' : 'Update Balance'}
            </Button>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Opening Balance</CardTitle>
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.openingBalance)}</div>
              <p className="text-xs text-muted-foreground">Cash at the start of the day</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Collections</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalRevenue)}</div>
              <p className="text-xs text-muted-foreground">Total revenue from sales</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{formatCurrency(summary.totalExpenses)}</div>
              <p className="text-xs text-muted-foreground">Total cash outflow</p>
            </CardContent>
          </Card>
          <Card className="bg-primary/10 border-primary">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Closing Balance</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.calculatedBalance)}</div>
              <p className="text-xs text-muted-foreground">Net cash in hand</p>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}
