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
import { Checkbox } from "@/components/ui/checkbox";
import type { MenuItem, Ingredient } from '@/lib/types';
import Image from 'next/image';
import { PlusCircle, Trash2, Upload } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface MenuItemDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSave: (item: MenuItem & { imageFile?: File }) => void;
  item: MenuItem | null;
  showIngredients?: boolean;
}

export function MenuItemDialog({
  isOpen,
  setIsOpen,
  onSave,
  item,
  showIngredients = true
}: MenuItemDialogProps) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState(0);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('hot');
  const [isAvailable, setIsAvailable] = useState(true);
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);

  useEffect(() => {
    if (item) {
      setName(item.name);
      setPrice(item.price);
      setDescription(item.description || '');
      setCategory(item.category || 'hot');
      setIsAvailable(item.is_available);
      setImageUrl(item.imageUrl || '');
      setIngredients(item.ingredients || []);
      setImagePreview(item.imageUrl || '');
      setImageFile(null);
    } else {
      // Reset for new item
      setName('');
      setPrice(0);
      setDescription('');
      setCategory('hot');
      setIsAvailable(true);
      setImageUrl('');
      setIngredients([]);
      setImagePreview('');
      setImageFile(null);
    }
  }, [item, isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
      setImageUrl(''); // Clear URL input when file is selected
    }
  };

  const handleUrlChange = (url: string) => {
    setImageUrl(url);
    setImagePreview(url);
    setImageFile(null); // Clear file when URL is entered
  };

  const handleSave = () => {
    const newItem: MenuItem & { imageFile?: File } = {
      id: item?.id || '',
      name,
      price,
      description,
      category,
      is_available: isAvailable,
      ingredients,
      imageUrl: imageFile ? '' : imageUrl, // Don't pass URL if file is selected
    };

    if (imageFile) {
      newItem.imageFile = imageFile;
    }

    onSave(newItem);
  };

  const handleIngredientChange = (index: number, field: keyof Ingredient, value: string | number) => {
    const newIngredients = [...ingredients];
    if (field === 'quantity') {
      newIngredients[index][field] = Number(value);
    } else if (field === 'unit') {
      newIngredients[index][field] = value as Ingredient['unit'];
    } else {
      newIngredients[index][field] = value as string;
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

  const categories = [
    { value: 'hot', label: 'Hot' },
    { value: 'iced', label: 'Iced' },
    { value: 'specialty', label: 'Specialty' },
    { value: 'pastries', label: 'Pastries' },
    { value: 'snacks', label: 'Snacks' }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-headline">
            {item ? 'Edit Menu Item' : 'Add Menu Item'}
          </DialogTitle>
          <DialogDescription>
            {item ? 'Make changes to the item details.' : 'Add a new item to your menu.'}
            Click save when you're done.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Name + Price */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g., Cappuccino"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Price *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={price}
                onChange={e => setPrice(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brief description..."
              rows={3}
            />
          </div>

          {/* Category + Availability */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2 pt-8">
              <Checkbox
                id="available"
                checked={isAvailable}
                onCheckedChange={(checked) => setIsAvailable(checked as boolean)}
              />
              <Label htmlFor="available">Available</Label>
            </div>
          </div>

          {/* Image Upload Section */}
          <div className="space-y-4">
            <Label>Image</Label>
            
            {/* File Upload */}
            <div className="space-y-2">
              <Label htmlFor="imageFile" className="text-sm text-muted-foreground">
                Upload Image File
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="imageFile"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="flex-1"
                />
                <Upload className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            {/* OR URL Input */}
            <div className="space-y-2">
              <Label htmlFor="imageUrl" className="text-sm text-muted-foreground">
                Or Enter Image URL
              </Label>
              <Input
                id="imageUrl"
                value={imageUrl}
                onChange={e => handleUrlChange(e.target.value)}
                placeholder="e.g., https://example.com/image.jpg"
                disabled={!!imageFile}
              />
            </div>

            {/* Image Preview */}
            {imagePreview && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Preview</Label>
                <div className="relative w-32 h-24 border rounded-md overflow-hidden bg-muted">
                  <Image
                    src={imagePreview}
                    alt="Preview"
                    fill
                    sizes="128px"
                    className="object-cover"
                    onError={() => {
                      setImagePreview('');
                      setImageUrl('');
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Ingredients */}
          {showIngredients && (
            <div className="space-y-2">
              <Label>Ingredients</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {ingredients.map((ing, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      placeholder="Ingredient name"
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
                      min="0"
                      step="0.1"
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
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeIngredient(index)}
                      type="button"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addIngredient}
                  type="button"
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Ingredient
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim() || price <= 0}
          >
            {item ? 'Update Item' : 'Add Item'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}