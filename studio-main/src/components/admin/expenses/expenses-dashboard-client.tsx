"use client";

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { getDailyExpenses, getExpenseCategories, deleteDailyExpense, addDailyExpense, updateDailyExpense } from '@/lib/expenses-service';
import { useAuth } from '@/components/admin/contexts/auth-provider';
import { ExpenseDialog } from './expense-dialog';
import type { DailyExpense } from '@/lib/types';

export function ExpensesDashboardClient({ onExpenseChange }: { onExpenseChange?: () => void }) {
  const searchParams = useSearchParams();
  const branchId = searchParams.get('branchId');
  const { user, hasPermission } = useAuth();
  const { toast } = useToast();

  const [expenses, setExpenses] = React.useState<DailyExpense[]>([]);
  const [categories, setCategories] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = React.useState(false);
  const [selectedExpense, setSelectedExpense] = React.useState<DailyExpense | null>(null);
  const [currentDate, setCurrentDate] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);

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

  const fetchExpenses = React.useCallback(async () => {
    if (!branchId || !hasViewAccess) {
      setExpenses([]);
      setCategories([]);
      return;
    }

    setIsLoading(true);
    try {
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch today's expenses only
      const [expensesData, categoriesData] = await Promise.all([
        getDailyExpenses(branchId, today, undefined),
        getExpenseCategories()
      ]);
      setExpenses(expensesData || []);
      setCategories(categoriesData || []);
    } catch (error) {
      console.error('Error fetching expenses data:', error);
      toast({
        title: "Error",
        description: "Could not load today's expenses data.",
        variant: "destructive"
      });
      setExpenses([]);
      setCategories([]);
    } finally {
      setIsLoading(false);
    }
  }, [branchId, hasViewAccess, toast]);

  React.useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const handleDeleteExpense = async (expenseId: number) => {
    if (!hasFullAccess) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to delete expenses.",
        variant: "destructive"
      });
      return;
    }

    try {
      await deleteDailyExpense(expenseId);
      toast({
        title: "Success",
        description: "Expense deleted successfully.",
      });
      await fetchExpenses();
      onExpenseChange?.(); // Notify parent to refresh balance
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast({
        title: "Error",
        description: "Could not delete expense.",
        variant: "destructive"
      });
    }
  };

  const handleEditExpense = (expense: DailyExpense) => {
    if (!hasFullAccess) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to edit expenses.",
        variant: "destructive"
      });
      return;
    }
    setSelectedExpense(expense);
    setIsExpenseDialogOpen(true);
  };

  const handleAddExpense = () => {
    if (!hasFullAccess) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to add expenses.",
        variant: "destructive"
      });
      return;
    }
    setSelectedExpense(null);
    setIsExpenseDialogOpen(true);
  };

  const handleSaveExpense = async (expenseData: Omit<DailyExpense, 'id' | 'created_at' | 'created_by'>) => {
    if (!branchId || !hasFullAccess) return;

    setIsSaving(true);
    try {
      const isNew = !selectedExpense?.id;

      if (isNew) {
        await addDailyExpense({
          ...expenseData,
          branch_id: parseInt(branchId)
        });
        toast({
          title: "Success",
          description: "Expense added successfully.",
        });
      } else {
        await updateDailyExpense(selectedExpense.id, expenseData);
        toast({
          title: "Success",
          description: "Expense updated successfully.",
        });
      }

      setIsExpenseDialogOpen(false);
      setSelectedExpense(null);
      await fetchExpenses();
      onExpenseChange?.(); // Notify parent to refresh balance
    } catch (error) {
      console.error('Error saving expense:', error);
      toast({
        title: "Error",
        description: "Could not save expense.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

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
            Please select a branch from the header to view expenses.
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
            You don't have permission to view expenses for this branch.
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
              <CardTitle className="font-headline">Daily Expenses</CardTitle>
              <CardDescription>
                Track today's expenses for the selected branch.
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
          {hasFullAccess && (
            <div className="mb-4">
              <Button onClick={handleAddExpense}>
                <Plus className="mr-2 h-4 w-4" />
                Add Expense
              </Button>
            </div>
          )}

          {expenses.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground">No expenses found for today.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {expenses.map((expense) => (
                <Card key={expense.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-start gap-4">
                        <div className="flex-1">
                          <h4 className="font-medium">{expense.item_name}</h4>
                          {expense.description && (
                            <p className="text-sm text-muted-foreground mt-1">{expense.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span>Category: {expense.category}</span>
                            {expense.quantity && expense.unit && (
                              <span>Quantity: {expense.quantity} {expense.unit}</span>
                            )}
                            {expense.vendor && <span>Vendor: {expense.vendor}</span>}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-lg">{formatCurrency(expense.total_amount)}</div>
                          {expense.unit_cost && expense.quantity && (
                            <div className="text-sm text-muted-foreground">
                              {formatCurrency(expense.unit_cost)} × {expense.quantity}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    {hasFullAccess && (
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditExpense(expense)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteExpense(expense.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}

          {expenses.length > 0 && (
            <div className="mt-6 pt-4 border-t">
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Today's Total Expenses</div>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(expenses.reduce((sum, exp) => sum + exp.total_amount, 0))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {hasFullAccess && (
        <ExpenseDialog
          isOpen={isExpenseDialogOpen}
          setIsOpen={setIsExpenseDialogOpen}
          onSave={handleSaveExpense}
          expense={selectedExpense}
          categories={categories}
          isSaving={isSaving}
        />
      )}
    </>
  );
}
