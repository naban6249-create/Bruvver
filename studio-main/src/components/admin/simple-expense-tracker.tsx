// src/components/admin/simple-expense-tracker.tsx
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast";
import { Plus, Minus, Milk, Droplet, Send, Loader2 } from 'lucide-react';

interface SimpleExpenseTrackerProps {
  branchId: number;
}

interface ExpenseItem {
  name: string;
  unit: string;
  Icon: React.ElementType;
}

// Define the items to track
const trackableItems: ExpenseItem[] = [
  { name: "Milk", unit: "Liters", Icon: Milk },
  { name: "Water", unit: "Liters", Icon: Droplet },
  // You can add more items here in the future
];

export function SimpleExpenseTracker({ branchId }: SimpleExpenseTrackerProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, number>>(
    trackableItems.reduce((acc, item) => ({ ...acc, [item.name]: 0 }), {})
  );

  const updateQuantity = (itemName: string, amount: number) => {
    setQuantities(prev => ({
      ...prev,
      [itemName]: Math.max(0, (prev[itemName] || 0) + amount),
    }));
  };

  const handleSubmitExpense = async (item: ExpenseItem) => {
    const quantity = quantities[item.name];
    if (quantity <= 0) {
      toast({
        title: "No Quantity",
        description: "Please add a quantity using the '+' button.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/expenses/quick-add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          item_name: item.name,
          quantity: quantity,
          unit: item.unit,
          branch_id: branchId,
          expense_date: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to submit expense");
      }

      toast({
        title: "Success!",
        description: `${quantity} ${item.unit} of ${item.name} saved.`,
      });
      setQuantities(prev => ({ ...prev, [item.name]: 0 }));

    } catch (error: any) {
      console.error('Error submitting expense:', error);
      toast({
        title: "Submission Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Expense Entry</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {trackableItems.map((item) => (
          <div key={item.name} className="space-y-3 p-4 border rounded-lg">
            <div className="flex items-center space-x-3">
              <item.Icon className="h-10 w-10 text-primary" />
              <div>
                <p className="text-2xl font-semibold">{item.name}</p>
                <p className="text-sm text-muted-foreground">{item.unit}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                className="w-16 h-16"
                onClick={() => updateQuantity(item.name, -1)}
                disabled={quantities[item.name] === 0 || isLoading}
              >
                <Minus className="h-8 w-8" />
              </Button>
              <span className="text-4xl font-bold w-20 text-center">
                {quantities[item.name]}
              </span>
              <Button
                variant="outline"
                className="w-16 h-16"
                onClick={() => updateQuantity(item.name, 1)}
                disabled={isLoading}
              >
                <Plus className="h-8 w-8" />
              </Button>
            </div>
            <Button
              className="w-full h-14 text-lg"
              onClick={() => handleSubmitExpense(item)}
              disabled={quantities[item.name] === 0 || isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-6 w-6 mr-2 animate-spin" />
              ) : (
                <Send className="h-6 w-6 mr-2" />
              )}
              Submit {item.name}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}