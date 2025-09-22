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
  onSave: (item: MenuItem & { imageFile?: File }) => void;
  item: MenuItem | null;
  showIngredients?: boolean;
}

export function MenuItemDialog({ isOpen, setIsOpen, onSave, item, showIngredients = true }: MenuItemDialogProps) {
  const [name, setName] = useState('');
  const [imageUrl, setImageUrl] = useState('https://placehold.co/600x400/EEE/31343C?text=Click+to+upload');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | undefined>(undefined);
  const [price, setPrice] = useState<string>('');

  // Image constraints
  const MAX_FILE_SIZE_BYTES = 1.5 * 1024 * 1024; // 1.5 MB
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
  // Use a consistent 3:2 aspect (matches 600x400 placeholder)
  const PREVIEW_WIDTH = 300;
  const PREVIEW_HEIGHT = 200;

  useEffect(() => {
    if (item) {
      setName(item.name);
      const incoming = (item.imageUrl ?? '').trim();
      setImageUrl(incoming.length > 0 ? incoming : 'https://placehold.co/600x400/EEE/31343C?text=Click+to+upload');
      setIngredients(item.ingredients || []);
      setPrice(typeof item.price === 'number' ? item.price.toString() : '');
    } else {
      setName('');
      setImageUrl('https://placehold.co/600x400/EEE/31343C?text=Click+to+upload');
      setIngredients([]);
      setPrice('');
    }
    setImageError(null);
    setImageFile(undefined);
  }, [item, isOpen]);

  const handleSave = () => {
    const parsedPrice = parseFloat(price || '0');
    const newItem: MenuItem = {
      id: item?.id || '',
      name,
      imageUrl,
      price: isNaN(parsedPrice) ? 0 : parsedPrice,
      ingredients,
      // Provide sensible defaults for required fields
      description: item?.description || '',
      category: item?.category || 'hot',
      is_available: item?.is_available ?? true,
    };
    // Pass the imageFile (if any) so the backend can store it
    onSave({ ...(newItem as any), imageFile });
  };
  
  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const inputEl = event.target;
    const file = inputEl.files?.[0];
    if (!file) return;

    // Validate type
    if (!ALLOWED_TYPES.includes(file.type)) {
      setImageError("Only JPG, PNG, or WEBP images are allowed.");
      return;
    }
    // Validate size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setImageError("Image is too large. Please upload an image under 1.5 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        // Resize/crop to PREVIEW_WIDTH x PREVIEW_HEIGHT while maintaining cover behavior
        const canvas = document.createElement('canvas');
        canvas.width = PREVIEW_WIDTH;
        canvas.height = PREVIEW_HEIGHT;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setImageError("Failed to process image.");
          return;
        }
        // Compute cover scaling
        const srcW = img.width;
        const srcH = img.height;
        const targetRatio = PREVIEW_WIDTH / PREVIEW_HEIGHT;
        const srcRatio = srcW / srcH;
        let drawW, drawH, sx, sy;
        if (srcRatio > targetRatio) {
          // wider than target: crop sides
          drawH = srcH;
          drawW = srcH * targetRatio;
          sx = (srcW - drawW) / 2;
          sy = 0;
        } else {
          // taller than target: crop top/bottom
          drawW = srcW;
          drawH = srcW / targetRatio;
          sx = 0;
          sy = (srcH - drawH) / 2;
        }
        ctx.drawImage(img, sx, sy, drawW, drawH, 0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT);
        // Create a Blob/File for upload and a preview URL
        canvas.toBlob((blob) => {
          if (!blob) {
            setImageError("Failed to process image.");
            return;
          }
          const uniqueName = `upload_${Date.now()}.webp`;
          const fileOut = new File([blob], uniqueName, { type: 'image/webp' });
          setImageFile(fileOut);
          const outUrl = URL.createObjectURL(blob);
          setImageUrl(outUrl);
          setImageError(null);
        }, 'image/webp', 0.9);
      };
      img.onerror = () => setImageError("Could not load the selected image.");
      img.src = reader.result as string;
    };
    reader.onerror = () => setImageError("Failed to read the selected file.");
    reader.readAsDataURL(file);
    // Allow selecting the same file name again by clearing the input value
    inputEl.value = '';
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
            <Label htmlFor="price">Price</Label>
            <Input id="price" type="number" step="0.01" min="0" value={price} onChange={e => setPrice(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Image</Label>
            <div className="w-full cursor-pointer" onClick={handleImageClick}>
              {(() => {
                const src = imageError ? 'https://placehold.co/600x400/EEE/31343C?text=Click+to+upload' : (imageUrl?.trim() || 'https://placehold.co/600x400/EEE/31343C?text=Click+to+upload');
                const isRemote = !src.startsWith('/')
                return (
                  <Image
                    src={src}
                    alt="Click to upload"
                    width={PREVIEW_WIDTH}
                    height={PREVIEW_HEIGHT}
                    className="rounded-md object-cover"
                    style={{ width: '100%', height: 'auto' }}
                    onError={() => setImageError("Preview failed to load")}
                    onLoad={() => setImageError(null)}
                    unoptimized={isRemote}
                    data-ai-hint="coffee drink"
                  />
                );
              })()}
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange}
              className="hidden"
              accept="image/png, image/jpeg, image/webp"
            />
            {imageError && (
              <p className="text-sm text-destructive mt-1">{imageError}</p>
            )}
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
