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
import type { MenuItem } from '@/lib/types';
import Image from 'next/image';
import { Switch } from '@/components/ui/switch';

interface MenuItemDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSave: (data: FormData) => void;
  item: MenuItem | null;
}

export function MenuItemDialog({ isOpen, setIsOpen, onSave, item }: MenuItemDialogProps) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('hot');
  const [isAvailable, setIsAvailable] = useState(true);
  
  // State for image handling
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [imagePreview, setImagePreview] = useState<string>('https://placehold.co/400x200/png?text=Add+Image');
  const [imageFile, setImageFile] = useState<File | undefined>(undefined);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && item) {
      // Editing an existing item
      setName(item.name);
      setPrice(item.price.toString());
      setCategory(item.category);
      setIsAvailable(item.is_available);
      setImageUrlInput(item.imageUrl || '');
      setImagePreview(item.imageUrl || 'https://placehold.co/400x200/png?text=Add+Image');
      setImageFile(undefined);
    } else if (isOpen) {
      // Adding a new item
      setName('');
      setPrice('');
      setCategory('hot');
      setIsAvailable(true);
      setImageUrlInput('');
      setImagePreview('https://placehold.co/400x200/png?text=Add+Image');
      setImageFile(undefined);
    }
  }, [item, isOpen]);

  const handleSave = () => {
    const formData = new FormData();
    if (item?.id) {
        formData.append('id', item.id.toString());
    }
    formData.append('name', name);
    formData.append('price', price);
    formData.append('category', category);
    formData.append('is_available', String(isAvailable));

    // Prioritize URL input over file upload
    if (imageUrlInput) {
        formData.append('image_url', imageUrlInput);
    } else if (imageFile) {
        formData.append('image', imageFile);
    }
    
    onSave(formData);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Clear URL input when file is selected
      setImageUrlInput(''); 
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleUrlInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const url = e.target.value;
      setImageUrlInput(url);
      // Clear file selection when URL is entered
      if (imageFile) {
          setImageFile(undefined);
      }
      // Update preview
      setImagePreview(url || 'https://placehold.co/400x200/png?text=Add+Image');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{item ? 'Edit Menu Item' : 'Add Menu Item'}</DialogTitle>
          <DialogDescription>
            Fill in the details for the menu item. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="price">Price</Label>
            <Input id="price" type="number" value={price} onChange={e => setPrice(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input id="category" value={category} onChange={e => setCategory(e.target.value)} />
          </div>
           <div className="flex items-center space-x-2">
            <Switch id="is_available" checked={isAvailable} onCheckedChange={setIsAvailable} />
            <Label htmlFor="is_available">Available</Label>
          </div>

          {/* Image URL Input */}
          <div className="space-y-2">
            <Label htmlFor="imageUrl">Image URL (Cloudinary or External)</Label>
            <Input 
                id="imageUrl" 
                placeholder="https://res.cloudinary.com/your-cloud/image.jpg"
                value={imageUrlInput}
                onChange={handleUrlInputChange}
            />
            <p className="text-xs text-muted-foreground">
              Paste a Cloudinary URL or any image URL
            </p>
          </div>
          
          <div className="text-center text-sm text-muted-foreground">OR</div>

          {/* File Upload Button */}
          <div className="space-y-2">
            <Label>Upload Image</Label>
            <Button variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()}>
              Choose File
            </Button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
            <p className="text-xs text-muted-foreground">
              Upload a file to automatically get a Cloudinary URL
            </p>
          </div>

          {/* Image Preview */}
          <div className="space-y-2">
            <Label>Preview</Label>
            <Image
              src={imagePreview}
              alt="Image Preview"
              width={400}
              height={200}
              className="rounded-md object-cover w-full aspect-video"
              unoptimized
              onError={() => setImagePreview('https://placehold.co/400x200/png?text=Invalid+Image')}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
