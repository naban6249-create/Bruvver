"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Pencil, PlusCircle, Trash2, Plus, Minus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { IngredientDialog } from "./ingredient-dialog";
import { UnifiedAuth } from "@/lib/unified-auth";

const API_BASE = process.env.NEXT_PUBLIC_API_SERVER_URL || "http://localhost:8000";

interface Ingredient {
  id: number;
  name: string;
  unit: string;
  quantity: number;
  image_url?: string;
  updatedAt?: string | number;
}

export function IngredientUsage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [ingredientToDelete, setIngredientToDelete] = useState<Ingredient | null>(null);
  const { toast } = useToast();

  const fetchIngredients = useCallback(async () => {
    if (!UnifiedAuth.isAuthenticated()) return;
    try {
      const response = await UnifiedAuth.authenticatedFetch(`${API_BASE}/api/ingredients`);
      if (!response.ok) throw new Error("Failed to fetch ingredients");
      const data = await response.json();
      setIngredients(data.map((ing: any) => ({ ...ing, updatedAt: ing.updated_at || Date.now() })));
    } catch (error) {
      toast({ title: "Error", description: "Could not load ingredient data.", variant: "destructive" });
    }
  }, [toast]);

  useEffect(() => {
    fetchIngredients();
  }, [fetchIngredients]);

  const handleQuantityChange = async (ingredient: Ingredient, amount: number) => {
    const originalIngredients = [...ingredients];

    const currentBaseQuantity = ingredient.unit === 'L' ? ingredient.quantity * 1000 : ingredient.quantity;
    const step = 10; // Increment by 10g
    const newBaseQuantity = Math.max(0, currentBaseQuantity + (amount * step));

    const newUnit = newBaseQuantity >= 1000 ? 'L' : 'g';
    const newDisplayQuantity = newUnit === 'L' ? newBaseQuantity / 1000 : newBaseQuantity;

    setIngredients(prev =>
      prev.map(ing => ing.id === ingredient.id ? { ...ing, quantity: newDisplayQuantity, unit: newUnit } : ing)
    );

    try {
      const response = await UnifiedAuth.authenticatedFetch(`${API_BASE}/api/ingredients/${ingredient.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newDisplayQuantity, unit: newUnit }),
      });

      if (!response.ok) throw new Error('Failed to update quantity.');

      const savedIngredient = await response.json();
      setIngredients(prev => prev.map(ing => ing.id === ingredient.id ? { ...ing, ...savedIngredient, updatedAt: Date.now() } : ing));
    } catch (error) {
      toast({ title: "Error", description: "Could not update quantity.", variant: "destructive" });
      setIngredients(originalIngredients);
    }
  };

  const handleConfirmDelete = async () => {
    if (!ingredientToDelete) return;
    try {
      await UnifiedAuth.authenticatedFetch(`${API_BASE}/api/ingredients/${ingredientToDelete.id}`, { method: 'DELETE' });
      setIngredients(prev => prev.filter(ing => ing.id !== ingredientToDelete.id));
      toast({ title: "Success", description: "Ingredient deleted." });
    } catch (error) {
      toast({ title: "Error", description: "Could not delete ingredient.", variant: "destructive" });
    } finally {
      setIngredientToDelete(null);
    }
  };

  const handleEditItem = (ingredient: Ingredient) => {
    setSelectedIngredient(ingredient);
    setIsEditDialogOpen(true);
  };

  const handleAddItem = () => {
    setSelectedIngredient(null);
    setIsEditDialogOpen(true);
  };

  const handleSaveItem = async () => {
    await fetchIngredients();
    setIsEditDialogOpen(false);
  };

  const getNormalizedImageUrl = (url?: string, updatedAt?: string | number) => {
    if (!url) return "https://placehold.co/64x64/EEE/31343C?text=No+Image";
    let fullUrl = url.startsWith("http") ? url : `${API_BASE}${url}`;
    const separator = fullUrl.includes('?') ? '&' : '?';
    return `${fullUrl}${separator}t=${updatedAt || Date.now()}`;
  };

  return (
    <>
      <Card className="mt-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-headline">Ingredient Inventory</CardTitle>
            <CardDescription>
              Quickly adjust quantities or edit ingredient details.
            </CardDescription>
          </div>
          <Button onClick={handleAddItem}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Ingredient
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Image</TableHead>
                <TableHead>Ingredient</TableHead>
                <TableHead className="text-right w-[220px]">Quantity</TableHead>
                <TableHead className="w-[200px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ingredients.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Image
                      alt={item.name}
                      className="rounded-md object-cover aspect-square"
                      height={64}
                      width={64}
                      src={getNormalizedImageUrl(item.image_url, item.updatedAt)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleQuantityChange(item, -1)}>
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="font-mono w-20 text-center text-sm">
                        {Number.isInteger(item.quantity) ? item.quantity : item.quantity.toFixed(3)} {item.unit}
                      </span>
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleQuantityChange(item, 1)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="sm" onClick={() => handleEditItem(item)}>
                        <Pencil className="mr-2 h-4 w-4" /> Edit
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => setIngredientToDelete(item)}>
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!ingredientToDelete} onOpenChange={() => setIngredientToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              ingredient "{ingredientToDelete?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <IngredientDialog
        isOpen={isEditDialogOpen}
        setIsOpen={setIsEditDialogOpen}
        ingredient={selectedIngredient}
        onSave={handleSaveItem}
      />
    </>
  );
}