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
import { Textarea } from "@/components/ui/textarea";
import type { MenuItem, Ingredient } from '@/lib/types';

interface MenuItemDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSave: (item: MenuItem) => void;
  item: MenuItem | null;
}

export function MenuItemDialog({ isOpen, setIsOpen, onSave, item }: MenuItemDialogProps) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState(0);
  const [ingredients, setIngredients] = useState('');

  useEffect(() => {
    if (item) {
      setName(item.name);
      setPrice(item.price);
      setIngredients(
        item.ingredients
          .map(ing => `${ing.name}, ${ing.quantity}, ${ing.unit}`)
          .join('\n')
      );
    } else {
      setName('');
      setPrice(0);
      setIngredients('');
    }
  }, [item, isOpen]);

  const handleSave = () => {
    const ingredientsArray: Ingredient[] = ingredients
      .split('\n')
      .map(line => {
        const [name, quantity, unit] = line.split(',').map(s => s.trim());
        if (name && quantity && unit) {
            return { name, quantity: parseFloat(quantity), unit: unit as Ingredient['unit'] };
        }
        return null;
      })
      .filter((i): i is Ingredient => i !== null);

    const newItem: MenuItem = {
      id: item?.id || '',
      name,
      price: Number(price),
      imageUrl: item?.imageUrl || 'https://picsum.photos/600/400',
      ingredients: ingredientsArray,
    };
    onSave(newItem);
  };
  

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-headline">{item ? 'Edit Menu Item' : 'Add Menu Item'}</DialogTitle>
          <DialogDescription>
            {item ? 'Make changes to the item details.' : 'Add a new item to your menu.'} Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="price" className="text-right">
              Price
            </Label>
            <Input id="price" type="number" value={price} onChange={e => setPrice(Number(e.target.value))} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="ingredients" className="text-right pt-2">
              Ingredients
            </Label>
            <Textarea 
                id="ingredients" 
                value={ingredients}
                onChange={e => setIngredients(e.target.value)} 
                className="col-span-3"
                placeholder="Ingredient Name, Quantity, Unit&#10;e.g., Coffee Beans, 18, g"
            />
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
