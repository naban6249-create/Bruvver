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
  const [quantity, setQuantity] = useState<number | string>(0);
  const [imageUrl, setImageUrl] = useState("");
  const [imageError, setImageError] = useState(false);
  const [imagePreview, setImagePreview] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const isLiquidInMl =
    ingredient?.unit === "ml" &&
    (ingredient?.name === "Water" || ingredient?.name === "Milk");

  useEffect(() => {
    if (ingredient) {
      setName(ingredient.name);
      // Handle image URL - use a default if null
      const defaultImage = "https://placehold.co/64x64/EEE/31343C?text=No+Image";
      const currentImageUrl = ingredient.image_url || defaultImage;
      setImageUrl(currentImageUrl);
      setImagePreview(currentImageUrl);
      
      if (isLiquidInMl) {
        setQuantity(((ingredient.quantity || 0) / 1000).toFixed(2));
      } else {
        setQuantity(ingredient.quantity || 0);
      }
    } else {
      setName("");
      const defaultImage = "https://placehold.co/64x64/EEE/31343C?text=Click";
      setImageUrl(defaultImage);
      setImagePreview(defaultImage);
      setQuantity(0);
    }
    setImageError(false);
  }, [ingredient, isOpen, isLiquidInMl]);

  const handleSave = async () => {
    if (!ingredient) return;

    let finalQuantity = Number(quantity);
    if (isLiquidInMl) finalQuantity = finalQuantity * 1000;

    try {
      const res = await fetch(`${API_BASE}/api/ingredients/${ingredient.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify({
          name,
          quantity: finalQuantity,
          unit: ingredient.unit,
          image_url: imageUrl, // Include the updated image URL
        }),
      });

      if (!res.ok) throw new Error("Failed to update ingredient");

      const updated = await res.json();
      onSave(updated);
      toast({
        title: "Ingredient Updated",
        description: `${updated.name} saved successfully.`,
      });
      setIsOpen(false);
    } catch (error) {
      console.error("Error updating ingredient", error);
      toast({
        title: "Error",
        description: "Could not update ingredient.",
        variant: "destructive",
      });
    }
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const uploadImageToServer = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE}/api/upload-image`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload image');
    }

    const result = await response.json();
    return result.url; // Returns something like "/static/images/filename.jpg"
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select an image smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      // Show immediate preview
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImagePreview(result);
        setImageError(false);
      };
      reader.readAsDataURL(file);

      // Upload to server
      const uploadedUrl = await uploadImageToServer(file);
      const fullUrl = uploadedUrl.startsWith('http') ? uploadedUrl : `${API_BASE}${uploadedUrl}`;
      
      setImageUrl(fullUrl);
      
      toast({
        title: "Image Uploaded",
        description: "Image uploaded successfully. Click Save to apply changes.",
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
      // Revert preview on error
      setImagePreview(imageUrl);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-headline">Edit Ingredient</DialogTitle>
          <DialogDescription>
            Update the details for this ingredient. Changes are saved to the database.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Ingredient Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quantity">
              Total Quantity Used ({isLiquidInMl ? "L" : ingredient?.unit})
            </Label>
            <Input
              id="quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Image</Label>
            <div 
              className="w-full cursor-pointer relative" 
              onClick={handleImageClick}
            >
              <Image
                src={
                  imageError
                    ? "https://placehold.co/64x64/EEE/31343C?text=Click"
                    : imagePreview
                }
                alt="Click to upload"
                width={64}
                height={64}
                className="rounded-md object-cover aspect-square"
                onError={() => setImageError(true)}
                onLoad={() => setImageError(false)}
                unoptimized
              />
              {isUploading && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-md">
                  <div className="text-white text-xs">Uploading...</div>
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
            <p className="text-xs text-muted-foreground">
              Click image to upload. Max 5MB. Supports JPG, PNG, GIF.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isUploading}>
            {isUploading ? "Uploading..." : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}