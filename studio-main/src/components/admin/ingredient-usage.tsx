"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Minus, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { IngredientDialog } from "./ingredient-dialog";

const API_BASE =
  process.env.NEXT_PUBLIC_API_SERVER_URL || "http://localhost:8000";

// Types
interface Ingredient {
  id: number;
  name: string;
  unit: string;
  quantity: number;
  description?: string;
  category?: string;
  supplier?: string;
  cost_per_unit?: number;
  minimum_threshold?: number;
  image_url?: string;
  menu_item_id?: string;
  updatedAt?: string | number;
}

export function IngredientUsage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedIngredient, setSelectedIngredient] =
    useState<Ingredient | null>(null);
  const { toast } = useToast();

  // Normalize image URLs with cache busting
  const getNormalizedImageUrl = (url?: string, updatedAt?: string | number) => {
    if (!url) return "https://placehold.co/64x64/EEE/31343C?text=No+Image";
    
    let fullUrl = url;
    if (!url.startsWith("http")) {
      fullUrl = `${API_BASE}${url}`;
    }
    
    // Add cache busting parameter
    const separator = fullUrl.includes('?') ? '&' : '?';
    const timestamp = updatedAt || Date.now();
    return `${fullUrl}${separator}t=${timestamp}`;
  };

  // Fetch ingredients from backend
  const fetchIngredients = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/ingredients`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
      });
      if (!res.ok) throw new Error("Failed to fetch ingredients");
      const data = await res.json();

      const enriched: Ingredient[] = data.map((ing: any) => ({
        ...ing,
        updatedAt: ing.updated_at || Date.now(),
      }));

      setIngredients(enriched);
    } catch (error) {
      console.error("Error loading ingredients", error);
      toast({
        title: "Error",
        description: "Could not load ingredient data.",
        variant: "destructive",
      });
    }
  }, [toast]);

  useEffect(() => {
    fetchIngredients();
  }, [fetchIngredients]);

  // Handle temporary quantity adjustment
  const handleQuantityChange = (id: number, newQuantity: number) => {
    if (newQuantity < 0) return;
    setIngredients((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, quantity: newQuantity } : item
      )
    );
    toast({
      title: "Quantity Updated",
      description: `Usage updated locally for session.`,
    });
  };

  // Open edit dialog
  const handleEditItem = (ingredient: Ingredient) => {
    setSelectedIngredient(ingredient);
    setIsEditDialogOpen(true);
  };

  // Save ingredient with optimistic updates
  const handleSaveItem = async (updatedIngredient: Ingredient) => {
    try {
      // The dialog handles the API call internally, so we just need to refresh
      // Add a small delay to ensure the backend update is complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Refresh data from backend to get the latest state
      await fetchIngredients();
      
      toast({
        title: "Success",
        description: `${updatedIngredient.name} updated successfully.`,
      });
    } catch (error) {
      console.error("Error in handleSaveItem", error);
      toast({
        title: "Error",
        description: "Could not refresh ingredient data.",
        variant: "destructive",
      });
    } finally {
      setIsEditDialogOpen(false);
      setSelectedIngredient(null);
    }
  };

  const formatQuantity = (item: Ingredient) => {
    if (item.unit === "ml" && item.quantity >= 1000) {
      return `${(item.quantity / 1000).toFixed(2)} L`;
    }
    if (item.unit === "g" && item.quantity >= 1000) {
      return `${(item.quantity / 1000).toFixed(2)} kg`;
    }
    return `${item.quantity} ${item.unit}`;
  };

  return (
    <>
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="font-headline">Daily Ingredient Usage</CardTitle>
          <CardDescription>
            Based on today's sales. You can edit ingredient details and persist
            them.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Image</TableHead>
                <TableHead>Ingredient</TableHead>
                <TableHead className="text-right">Total Quantity</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ingredients.length > 0 ? (
                ingredients.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Image
                        alt={item.name}
                        className="rounded-md object-cover"
                        height={64}
                        width={64}
                        src={getNormalizedImageUrl(item.image_url, item.updatedAt)}
                        unoptimized
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "https://placehold.co/64x64/EEE/31343C?text=No+Image";
                        }}
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
                            handleQuantityChange(item.id, item.quantity - 1)
                          }
                          disabled={!item.quantity}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="text-center w-16 font-medium">
                          {formatQuantity(item)}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            handleQuantityChange(item.id, item.quantity + 1)
                          }
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditItem(item)}
                      >
                        <Pencil className="mr-2 h-4 w-4" /> Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    No ingredient data available.
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
        ingredient={selectedIngredient}
        onSave={handleSaveItem}
      />
    </>
  );
}