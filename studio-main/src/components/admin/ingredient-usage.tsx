"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Plus, Minus, Pencil } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { INGREDIENTS_DATA } from '@/lib/data';
import { IngredientDialog } from './ingredient-dialog';
import { getMenuItems } from '@/lib/menu-service';
import { getDailySales } from '@/lib/sales-service';

// --- Local types (do not clash with API types)
interface Ingredient {
  name: string;
  quantity: number;
  unit: 'g' | 'ml' | 'shots' | 'pumps';
}

interface IngredientMetadata {
  id?: string;
  name: string;
  unit: 'g' | 'ml' | 'shots' | 'pumps';
  imageUrl?: string;
  description?: string;
  category?: string;
  supplier?: string;
  costPerUnit?: number;
  minimumThreshold?: number;
}

interface IngredientTotal extends IngredientMetadata {
  totalQuantity: number;
  originalName: string;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  description?: string;
  category?: string;
  imageUrl?: string;
  is_available: boolean;
  ingredients: Ingredient[];
}

// Shape returned by API (be flexible + normalize)
type RawDailySale =
  | { id?: number | string; menu_item_id: string | number; quantity: number; sale_date?: string; revenue?: number }
  | { id?: number | string; itemId: string | number; quantity: number; date?: string };

// Our normalized shape used in calculations
type NormalizedSale = { itemId: string; quantity: number };

export function IngredientUsage() {
  const [usage, setUsage] = useState<IngredientTotal[]>([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<IngredientTotal | null>(null);
  const { toast } = useToast();

  const calculateUsage = useCallback(async () => {
    try {
      const [menuItems, rawDailySales] = await Promise.all([
        getMenuItems(),
        getDailySales() as Promise<RawDailySale[]>,
      ]);

      // Normalize sales to { itemId, quantity }
      const dailySales: NormalizedSale[] = (rawDailySales || [])
        .map((s) => {
          const itemId =
            (s as any).itemId ??
            (s as any).menu_item_id ??
            undefined;
          const quantity = Number((s as any).quantity ?? 0);
          return itemId != null ? { itemId: String(itemId), quantity } : null;
        })
        .filter(Boolean) as NormalizedSale[];

      // Accumulate ingredient usage
      const ingredientTotals: Record<string, { totalQuantity: number; unit: Ingredient['unit'] }> = {};

      dailySales.forEach((sale) => {
        const menuItem = (menuItems as MenuItem[]).find((item) => item.id === sale.itemId);
        if (menuItem) {
          menuItem.ingredients.forEach((ingredient) => {
            const key = `${ingredient.name}-${ingredient.unit}`;
            if (!ingredientTotals[key]) {
              ingredientTotals[key] = { totalQuantity: 0, unit: ingredient.unit };
            }
            ingredientTotals[key].totalQuantity += sale.quantity * ingredient.quantity;
          });
        }
      });

      const usageData: IngredientTotal[] = (INGREDIENTS_DATA as IngredientMetadata[]).map((ingredientMeta) => {
        const key = `${ingredientMeta.name}-${ingredientMeta.unit}`;
        const totalQuantity = ingredientTotals[key]?.totalQuantity ?? 0;
        return {
          ...ingredientMeta,
          totalQuantity,
          originalName: ingredientMeta.name,
        };
      });

      // Prioritize Water and Milk
      usageData.sort((a, b) => {
        if (a.name === 'Water') return -1;
        if (b.name === 'Water') return 1;
        if (a.name === 'Milk') return -1;
        if (b.name === 'Milk') return 1;
        return 0;
      });

      setUsage(usageData);
    } catch (error) {
      console.error("Failed to calculate ingredient usage", error);
      toast({
        title: "Error",
        description: "Could not calculate ingredient usage.",
        variant: "destructive",
      });
    }
  }, [toast]);

  useEffect(() => {
    calculateUsage();
  }, [calculateUsage]);

  const handleQuantityChange = (ingredientName: string, newQuantity: number) => {
    if (newQuantity < 0) return;

    setUsage((prevUsage) =>
      prevUsage.map((item) =>
        item.name === ingredientName ? { ...item, totalQuantity: newQuantity } : item
      )
    );

    toast({
      title: "Quantity Updated",
      description: `Usage for ${ingredientName} updated.`,
    });
  };

  const handleEditItem = (ingredient: IngredientTotal) => {
    setSelectedIngredient(ingredient);
    setIsEditDialogOpen(true);
  };

  const handleSaveItem = (updatedIngredient: IngredientTotal) => {
    setUsage((prevUsage) =>
      prevUsage.map((item) =>
        item.originalName === updatedIngredient.originalName ? { ...item, ...updatedIngredient } : item
      )
    );
    toast({ title: "Success", description: `${updatedIngredient.name} details updated.` });
    setIsEditDialogOpen(false);
    setSelectedIngredient(null);
  };

  const formatQuantity = (item: IngredientTotal) => {
    if ((item.name === 'Water' || item.name === 'Milk') && item.unit === 'ml') {
      const liters = item.totalQuantity / 1000;
      return `${liters.toFixed(2)} L`;
    }
    return `${item.totalQuantity.toLocaleString()} ${item.unit}`;
  };

  const getStepValue = (item: IngredientTotal) => {
    if ((item.name === 'Water' || item.name === 'Milk') && item.unit === 'ml') {
      return 1000; // 1000ml step
    }
    return 1;
  };

  return (
    <>
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="font-headline">Daily Ingredient Usage</CardTitle>
          <CardDescription>
            A summary of the total amount of each ingredient used today based on sales.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Image</TableHead>
                <TableHead>Ingredient</TableHead>
                <TableHead className="text-right">Total Quantity Used</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usage.length > 0 ? (
                usage.map((item) => (
                  <TableRow key={`${item.originalName}-${item.unit}`}>
                    <TableCell>
                      <Image
                        alt={item.name}
                        className="aspect-square rounded-md object-cover"
                        height="64"
                        src={item.imageUrl || 'https://placehold.co/64x64/EEE/31343C?text=No+Image'}
                        width="64"
                        data-ai-hint="ingredient"
                        unoptimized
                      />
                    </TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            handleQuantityChange(item.name, item.totalQuantity - getStepValue(item))
                          }
                          disabled={item.totalQuantity === 0}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="text-center w-24 font-medium">{formatQuantity(item)}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            handleQuantityChange(item.name, item.totalQuantity + getStepValue(item))
                          }
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => handleEditItem(item)}>
                        <Pencil className="mr-2 h-4 w-4" /> Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    No sales data available to calculate usage.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <IngredientDialog
        isOpen={isEditDialogOpen}
        setIsOpen={setIsEditDialogOpen}
        onSave={handleSaveItem}
        ingredient={selectedIngredient}
      />
    </>
  );
}
