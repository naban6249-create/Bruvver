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
import { useAuth } from '@/components/admin/contexts/auth-provider';

// Common expenses for quick adding (all start at 0)
const COMMON_EXPENSES = [
  { name: 'Milk', unit: 'packets', icon: Droplets },
  { name: 'Water Cans', unit: 'cans', icon: Package },
  { name: 'Coffee Beans', unit: 'kg', icon: Package },
  { name: 'Sugar', unit: 'kg', icon: Package },
  { name: 'Tea Powder', unit: 'packets', icon: Package },
  { name: 'Other', unit: 'units', icon: Package },
];

// Helper function to format timestamps in IST
function formatDateIST(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    day: '2-digit',
    month: 'short'
  });
}

export function WorkerExpenses() {
  const searchParams = useSearchParams();
  const branchId = searchParams.get('branchId');
  const { hasPermission } = useAuth();

  const [expenses, setExpenses] = useState<DailyExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExpense, setSelectedExpense] = useState<string>('');
  const [customExpenseName, setCustomExpenseName] = useState<string>('');
  const [customUnit, setCustomUnit] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('0');
  const [unitPrice, setUnitPrice] = useState<string>('');
  const [calculatedTotal, setCalculatedTotal] = useState<string>('0.00');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const currentBranchId = branchId ? parseInt(branchId) : null;
  const hasViewAccess = currentBranchId ? hasPermission(currentBranchId, 'view_only') : false;
  const hasFullAccess = currentBranchId ? hasPermission(currentBranchId, 'full_access') : false;

  // Check if "Other" is selected
  const isOtherSelected = selectedExpense === 'Other';

  // Calculate total for quick add
  useEffect(() => {
    const qty = parseFloat(quantity) || 0;
    const price = parseFloat(unitPrice) || 0;
    const total = qty * price;
    setCalculatedTotal(total.toFixed(2));
  }, [quantity, unitPrice]);

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
    // Determine the final expense name and unit
    const finalExpenseName = isOtherSelected ? customExpenseName.trim() : selectedExpense;
    const finalUnit = isOtherSelected ? 'items' : COMMON_EXPENSES.find(s => s.name === selectedExpense)?.unit || 'units';

    if (!finalExpenseName || !quantity || !unitPrice || !branchId) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields including expense name, quantity, and unit price.",
        variant: "destructive"
      });
      return;
    }

    if (!hasFullAccess) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to add expenses.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await addQuickExpense({
        item_name: finalExpenseName,
        quantity: parseFloat(quantity),
        unit: finalUnit,
        unit_cost: parseFloat(unitPrice),
        branch_id: parseInt(branchId),
        expense_date: new Date().toISOString()
      });

      toast({
        title: "Expense Added",
        description: isOtherSelected 
          ? `${finalExpenseName} expense of ₹${calculatedTotal} recorded successfully.`
          : `${quantity} ${finalUnit} of ${finalExpenseName} recorded successfully.`
      });

      // Reset form
      setSelectedExpense('');
      setCustomExpenseName('');
      setCustomUnit('');
      setQuantity('0');
      setUnitPrice('');

      // Refresh list
      await fetchExpenses();
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not add expense. Please try again.",
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

  const totalExpenses = expenses.reduce((acc, item) => acc + item.total_amount, 0);
  const selectedExpenseData = COMMON_EXPENSES.find(s => s.name === selectedExpense);

  if (!branchId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Daily Expenses</CardTitle>
          <CardDescription>Please select a branch to manage expenses.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!hasViewAccess) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Daily Expenses</CardTitle>
          <CardDescription>You don't have permission to view expenses for this branch.</CardDescription>
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
              Quick Add Expenses
            </CardTitle>
            <CardDescription>
              Quickly record common expenses and inventory purchases.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4">
              {/* First Row: Expense Item Selector */}
              <div className="space-y-2">
                <Label htmlFor="expense">Expense Item</Label>
                <Select
                  value={selectedExpense}
                  onValueChange={(value) => {
                    setSelectedExpense(value);
                    setQuantity("0");
                    setUnitPrice('');
                    setCustomExpenseName('');
                    setCustomUnit('');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select expense" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_EXPENSES.map(expense => (
                      <SelectItem key={expense.name} value={expense.name}>
                        <div className="flex items-center gap-2">
                          <expense.icon className="h-4 w-4" />
                          {expense.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Conditional Layout based on selection */}
              {isOtherSelected ? (
                /* Custom expense layout for "Other" option */
                <>
                  <div className="space-y-2">
                    <Label htmlFor="customExpenseName">Custom Expense Name</Label>
                    <Input
                      id="customExpenseName"
                      type="text"
                      value={customExpenseName}
                      onChange={(e) => setCustomExpenseName(e.target.value)}
                      placeholder="e.g., Paper Cups, Napkins, etc."
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
                    <div className="space-y-2">
                      <Label htmlFor="quantity">Quantity</Label>
                      <Input
                        id="quantity"
                        type="number"
                        step="0.1"
                        min="0"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        placeholder="0"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="unitPrice">Unit Price (₹)</Label>
                      <Input
                        id="unitPrice"
                        type="number"
                        step="0.01"
                        min="0"
                        value={unitPrice}
                        onChange={(e) => setUnitPrice(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Total Amount</Label>
                      <div className="h-10 flex items-center text-sm font-medium border rounded-md px-3 bg-muted">
                        ₹{calculatedTotal}
                      </div>
                    </div>

                    <Button
                      onClick={handleQuickAdd}
                      disabled={!selectedExpense || !quantity || !unitPrice || isSubmitting || !customExpenseName}
                      className="h-10"
                    >
                      {isSubmitting ? "Adding..." : "Add Expense"}
                    </Button>
                  </div>
                </>
              ) : (
                /* Standard layout for predefined expenses */
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 items-end">
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      step="0.1"
                      min="0"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Unit</Label>
                    <div className="h-10 flex items-center text-sm text-muted-foreground border rounded-md px-3">
                      {selectedExpenseData?.unit || 'Select expense first'}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="unitPrice">Unit Price (₹)</Label>
                    <Input
                      id="unitPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      value={unitPrice}
                      onChange={(e) => setUnitPrice(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Total Amount</Label>
                    <div className="h-10 flex items-center text-sm font-medium border rounded-md px-3 bg-muted">
                      ₹{calculatedTotal}
                    </div>
                  </div>

                  <Button
                    onClick={handleQuickAdd}
                    disabled={!selectedExpense || !quantity || !unitPrice || isSubmitting}
                    className="h-10"
                  >
                    {isSubmitting ? "Adding..." : "Add Expense"}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's Expenses */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Today's Expenses</CardTitle>
              <CardDescription>
                All expenses recorded for today.
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
              <h3 className="mt-4 text-lg font-semibold">No expenses recorded</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {hasFullAccess
                  ? "Start by adding expenses using the form above."
                  : "No expenses have been recorded for today yet."
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
                      {formatDateIST(expense.created_at)}
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
                      {expense.quantity} {expense.unit}
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
