"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { DailyExpense } from '@/lib/types';

interface ExpenseDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSave: (expense: DailyExpense) => void;
  expense: DailyExpense | null;
}

export function ExpenseDialog({ isOpen, setIsOpen, onSave, expense }: ExpenseDialogProps) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number | string>('');
  const [category, setCategory] = useState<DailyExpense['category']>('Miscellaneous');

  useEffect(() => {
    if (expense) {
      setDescription(expense.description);
      setAmount(expense.amount);
      setCategory(expense.category);
    } else {
      setDescription('');
      setAmount('');
      setCategory('Miscellaneous');
    }
  }, [expense, isOpen]);

  const handleSave = () => {
    const newExpense: DailyExpense = {
      id: expense?.id || '',
      description,
      amount: Number(amount),
      category,
    };
    onSave(newExpense);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-headline">{expense ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
          <DialogDescription>
            {expense ? 'Make changes to the expense details.' : 'Add a new expense item.'} Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (₹)</Label>
            <Input id="amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select onValueChange={(value: DailyExpense['category']) => setCategory(value)} value={category}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Supplies">Supplies</SelectItem>
                <SelectItem value="Utilities">Utilities</SelectItem>
                <SelectItem value="Wages">Wages</SelectItem>
                <SelectItem value="Rent">Rent</SelectItem>
                <SelectItem value="Miscellaneous">Miscellaneous</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
