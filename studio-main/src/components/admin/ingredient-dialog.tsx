"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Plus, Minus } from "lucide-react";

interface IngredientDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSave: (ingredient: any) => void;
  ingredient: any;
}

const API_BASE = process.env.NEXT_PUBLIC_API_SERVER_URL || "http://localhost:8000";

export function IngredientDialog({
  isOpen,
  setIsOpen,
  onSave,
  ingredient,
}: IngredientDialogProps) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState<number | string>("");
  const [imageUrl, setImageUrl] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const isEditMode = ingredient && ingredient.id;

  useEffect(() => {
    const defaultImage = "https://placehold.co/64x64/EEE/31343C?text=No+Image";
    if (isOpen && isEditMode) {
      setName(ingredient.name);
      const fullImageUrl = ingredient.image_url && !ingredient.image_url.startsWith('http')
        ? `${API_BASE}${ingredient.image_url}`
        : ingredient.image_url || defaultImage;
      setImageUrl(fullImageUrl);
      setImagePreview(fullImageUrl);

      // If any old data was in 'g', convert it to 'L' for editing.
      let currentQuantity = ingredient.quantity || 0;
      if (ingredient.unit === 'g') {
        currentQuantity = currentQuantity / 1000;
      }
      setQuantity(currentQuantity);

    } else if (isOpen && !isEditMode) {
      setName("");
      setQuantity("");
      setImageUrl(defaultImage);
      setImagePreview(defaultImage);
    }
  }, [ingredient, isOpen, isEditMode]);

  const getAuthToken = (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem("token");
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setImagePreview(URL.createObjectURL(file));
    const token = getAuthToken();
    if (!token) {
      toast({ title: "Authentication Error", variant: "destructive" });
      setIsUploading(false);
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_BASE}/api/upload-image`, {
        method: 'POST',
        headers: { "Authorization": `Bearer ${token}` },
        body: formData,
      });
      if (!response.ok) throw new Error("Upload failed");
      const result = await response.json();
      setImageUrl(result.url);
      toast({ title: "Image Uploaded", description: "Click 'Save changes' to apply." });
    } catch (error) {
      toast({ title: "Upload Failed", variant: "destructive" });
      setImagePreview(ingredient?.image_url || '');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    const token = getAuthToken();
    if (!token) {
      toast({ title: "Authentication Error", variant: "destructive" });
      return;
    }

    const payload = {
      name,
      quantity: Number(quantity),
      unit: 'L', // Always save the unit as Liters
      image_url: imageUrl.startsWith(API_BASE) ? imageUrl.substring(API_BASE.length) : imageUrl,
    };

    const url = isEditMode ? `${API_BASE}/api/ingredients/${ingredient.id}` : `${API_BASE}/api/ingredients`;
    const method = isEditMode ? "PATCH" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`Failed to ${isEditMode ? 'update' : 'create'} ingredient`);

      const savedData = await res.json();
      onSave(savedData);
      setIsOpen(false);
      toast({ title: "Success", description: `Ingredient ${isEditMode ? 'updated' : 'created'} successfully.` });
    } catch (error) {
      toast({ title: "Error", description: "Could not save ingredient.", variant: "destructive" });
    }
  };

  const handleImageClick = () => fileInputRef.current?.click();

  const handleStep = (amount: number) => {
    const currentQty = Number(quantity) || 0;
    const newQty = Math.max(0, currentQty + amount);
    setQuantity(parseFloat(newQty.toFixed(3)));
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-headline">{isEditMode ? "Edit Ingredient" : "Add New Ingredient"}</DialogTitle>
          <DialogDescription>Manage the ingredient's details. All quantities are in Liters (L).</DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Ingredient Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity (Liters)</Label>
            <div className="flex items-center">
              <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => handleStep(-0.1)}><Minus className="h-4 w-4" /></Button>
              <Input
                id="quantity"
                type="number"
                step="0.1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="text-center rounded-none border-l-0 border-r-0"
              />
              <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => handleStep(0.1)}><Plus className="h-4 w-4" /></Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Image</Label>
            <div className="w-24 h-24 cursor-pointer relative group rounded-md" onClick={handleImageClick}>
              <Image
                src={imagePreview}
                alt="Ingredient"
                fill
                className="rounded-md object-cover"
                onError={() => setImagePreview("https://placehold.co/64x64/EEE/31343C?text=No+Image")}
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center transition-all duration-300 rounded-md">
                <p className="text-white text-xs text-center opacity-0 group-hover:opacity-100">Change</p>
              </div>
              {isUploading && (
                <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center rounded-md">
                  <p className="text-white text-xs">Uploading...</p>
                </div>
              )}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept="image/*"
              disabled={isUploading}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={isUploading}>
            {isUploading ? "Uploading..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}