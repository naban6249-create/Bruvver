"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Eye, Save } from 'lucide-react';
import type { DailyExpense } from '@/lib/types';

interface ExpenseDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onSave?: (expense: Omit<DailyExpense, 'id' | 'created_at' | 'created_by'>) => void;
  expense?: DailyExpense | null;
  categories?: any[]; // ✅ Added categories prop
  isSaving?: boolean; // ✅ Added isSaving prop
  readOnly?: boolean;
}

const DEFAULT_CATEGORIES = [
  'Dairy', 'Coffee Beans', 'Utilities', 'Rent', 'Staff Salary', 'Maintenance', 'Other'
];

export function ExpenseDialog({ 
  isOpen, 
  setIsOpen, 
  onSave, 
  expense, 
  categories = [], // ✅ Use passed categories with default
  isSaving = false, // ✅ Use passed isSaving state
  readOnly = false 
}: ExpenseDialogProps) {
  const [formData, setFormData] = useState({
    category: '',
    item_name: '',
    description: '',
    quantity: '',
    unit: '',
    unit_cost: '',
    total_amount: '',
    expense_date: '',
  });

  // ✅ Use passed categories or fallback to defaults
  const availableCategories = categories.length > 0 
    ? categories 
    : DEFAULT_CATEGORIES.map((name, index) => ({
        id: index,
        name,
        is_active: true,
        created_at: new Date().toISOString()
      }));

  // Initialize form data when dialog opens
  useEffect(() => {
    if (isOpen) {
      if (expense) {
        setFormData({
          category: expense.category,
          item_name: expense.item_name,
          description: expense.description || '',
          quantity: expense.quantity?.toString() || '',
          unit: expense.unit || '',
          unit_cost: expense.unit_cost.toString(),
          total_amount: expense.total_amount.toString(),
          expense_date: expense.expense_date ? expense.expense_date.split('T')[0] : '',
        });
      } else {
        // Reset form for new expense
        const today = new Date().toISOString().split('T')[0];
        setFormData({
          category: '',
          item_name: '',
          description: '',
          quantity: '',
          unit: '',
          unit_cost: '',
          total_amount: '',
          expense_date: today,
        });
      }
    }
  }, [isOpen, expense]);

  // Calculate total when quantity or unit cost changes
  useEffect(() => {
    const quantity = parseFloat(formData.quantity) || 0;
    const unitCost = parseFloat(formData.unit_cost) || 0;
    const total = quantity * unitCost;
    
    if (!readOnly) {
      setFormData(prev => ({ ...prev, total_amount: total.toFixed(2) }));
    }
  }, [formData.quantity, formData.unit_cost, readOnly]);

  const handleInputChange = (field: string, value: string) => {
    if (readOnly) return;
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (readOnly || !onSave) return;

    const dateStr = formData.expense_date && formData.expense_date.length > 0
      ? new Date(formData.expense_date).toISOString()
      : new Date().toISOString();

    const expenseData = {
      category: formData.category,
      item_name: formData.item_name,
      description: formData.description || undefined,
      quantity: formData.quantity ? parseFloat(formData.quantity) : undefined,
      unit: formData.unit || undefined,
      unit_cost: parseFloat(formData.unit_cost) || 0,
      total_amount: parseFloat(formData.total_amount) || 0,
      expense_date: dateStr,
      branch_id: 0 // This will be set by the parent component
    };

    onSave(expenseData);
  };

  const isFormValid = formData.category && formData.item_name && formData.unit_cost && formData.total_amount;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {readOnly ? (
              <>
                <Eye className="h-5 w-5" />
                View Expense Details
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                {expense ? 'Edit Expense' : 'Add New Expense'}
              </>
            )}
          </DialogTitle>
          {readOnly && (
            <Badge variant="secondary" className="w-fit">Read Only</Badge>
          )}
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Category and Item Name */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => handleInputChange('category', value)}
                disabled={readOnly || isSaving}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {availableCategories.map(category => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="item_name">Item Name *</Label>
              <Input
                id="item_name"
                value={formData.item_name}
                onChange={(e) => handleInputChange('item_name', e.target.value)}
                placeholder="e.g., Milk, Coffee Beans"
                disabled={readOnly || isSaving}
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Additional details about the expense"
              rows={2}
              disabled={readOnly || isSaving}
            />
          </div>

          {/* Quantity, Unit, Unit Cost */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                step="0.1"
                min="0"
                value={formData.quantity}
                onChange={(e) => handleInputChange('quantity', e.target.value)}
                placeholder="0"
                disabled={readOnly || isSaving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                value={formData.unit}
                onChange={(e) => handleInputChange('unit', e.target.value)}
                placeholder="kg, liters, pieces"
                disabled={readOnly || isSaving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit_cost">Unit Cost (₹) *</Label>
              <Input
                id="unit_cost"
                type="number"
                step="0.01"
                min="0"
                value={formData.unit_cost}
                onChange={(e) => handleInputChange('unit_cost', e.target.value)}
                placeholder="0.00"
                disabled={readOnly || isSaving}
              />
            </div>
          </div>

          {/* Total Amount and Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="total_amount">Total Amount (₹) *</Label>
              <Input
                id="total_amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.total_amount}
                placeholder="0.00"
                readOnly
                className="bg-muted cursor-not-allowed"
                tabIndex={-1}
              />
              <p className="text-xs text-muted-foreground">
                Automatically calculated: Quantity × Unit Cost
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expense_date">Expense Date</Label>
              <Input
                id="expense_date"
                type="date"
                value={formData.expense_date}
                onChange={(e) => handleInputChange('expense_date', e.target.value)}
                disabled={readOnly || isSaving}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSaving}>
            {readOnly ? 'Close' : 'Cancel'}
          </Button>
          {!readOnly && (
            <Button onClick={handleSave} disabled={!isFormValid || isSaving}>
              {isSaving ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {expense ? 'Update Expense' : 'Add Expense'}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
