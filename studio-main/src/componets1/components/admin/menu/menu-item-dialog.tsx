"use client";

import React, { useState, useEffect, useRef } from 'react';
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
import type { MenuItem, Ingredient } from '@/lib/types';
import Image from 'next/image';
import { PlusCircle, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface MenuItemDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSave: (item: MenuItem) => void;
  item: MenuItem | null;
  showIngredients?: boolean;
}

export function MenuItemDialog({ isOpen, setIsOpen, onSave, item, showIngredients = true }: MenuItemDialogProps) {
  const [name, setName] = useState('');
  const [imageUrl, setImageUrl] = useState('https://picsum.photos/600/400');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [imageError, setImageError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (item) {
      setName(item.name);
      setImageUrl(item.imageUrl);
      setIngredients(item.ingredients || []);
    } else {
      setName('');
      setImageUrl('https://picsum.photos/600/400');
      setIngredients([]);
    }
    setImageError(false);
  }, [item, isOpen]);

  const handleSave = () => {
    const newItem: MenuItem = {
      id: item?.id || '',
      name,
      imageUrl,
      price: item?.price || 0,
      ingredients,
    };
    onSave(newItem);
  };
  
  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
        setImageError(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleIngredientChange = (index: number, field: keyof Ingredient, value: string | number) => {
    const newIngredients = [...ingredients];
    if (field === 'quantity') {
      newIngredients[index][field] = Number(value);
    } else {
      // @ts-ignore
      newIngredients[index][field] = value;
    }
    setIngredients(newIngredients);
  };

  const addIngredient = () => {
    setIngredients([...ingredients, { name: '', quantity: 0, unit: 'g' }]);
  };

  const removeIngredient = (index: number) => {
    const newIngredients = ingredients.filter((_, i) => i !== index);
    setIngredients(newIngredients);
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
        <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Image</Label>
            <div className="w-full cursor-pointer" onClick={handleImageClick}>
              <Image
                src={imageError ? 'https://placehold.co/600x400/EEE/31343C?text=Click+to+upload' : imageUrl}
                alt="Click to upload"
                width={200}
                height={125}
                className="rounded-md object-cover aspect-video"
                onError={() => setImageError(true)}
                onLoad={() => setImageError(false)}
                unoptimized // Allows loading external URLs without next.config.js whitelisting
                data-ai-hint="coffee drink"
              />
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange}
              className="hidden"
              accept="image/*"
            />
          </div>
          {showIngredients && (
            <div className="space-y-2">
              <Label>Ingredients</Label>
              <div className="space-y-2">
                {ingredients.map((ing, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      placeholder="Name"
                      value={ing.name}
                      onChange={(e) => handleIngredientChange(index, 'name', e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      placeholder="Qty"
                      value={ing.quantity}
                      onChange={(e) => handleIngredientChange(index, 'quantity', e.target.value)}
                      className="w-20"
                    />
                    <Select
                      value={ing.unit}
                      onValueChange={(value) => handleIngredientChange(index, 'unit', value)}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue placeholder="Unit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="g">g</SelectItem>
                        <SelectItem value="ml">ml</SelectItem>
                        <SelectItem value="shots">shots</SelectItem>
                        <SelectItem value="pumps">pumps</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" onClick={() => removeIngredient(index)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addIngredient}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Ingredient
                </Button>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
