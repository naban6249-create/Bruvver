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
import type { IngredientMetadata } from "@/lib/types";

interface IngredientDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSave: (ingredient: any) => void; // can refine later
  ingredient: (IngredientMetadata & { totalQuantity: number }) | null;
}

export function IngredientDialog({
  isOpen,
  setIsOpen,
  onSave,
  ingredient,
}: IngredientDialogProps) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState<number | string>("");
  const [imageUrl, setImageUrl] = useState("https://picsum.photos/64/64");
  const [imageError, setImageError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isLiquidInMl =
    ingredient?.unit === "ml" &&
    (ingredient.name === "Water" || ingredient.name === "Milk");

  useEffect(() => {
    if (ingredient) {
      setName(ingredient.name);
      // ✅ always fallback to placeholder if undefined
      setImageUrl(ingredient.imageUrl ?? "https://picsum.photos/64/64");

      if (isLiquidInMl) {
        setQuantity((ingredient.totalQuantity / 1000).toFixed(2));
      } else {
        setQuantity(ingredient.totalQuantity);
      }
    } else {
      setName("");
      setImageUrl("https://picsum.photos/64/64");
      setQuantity(0);
    }
    setImageError(false);
  }, [ingredient, isOpen, isLiquidInMl]);

  const handleSave = () => {
    if (ingredient) {
      let finalQuantity = Number(quantity);
      if (isLiquidInMl) {
        finalQuantity = finalQuantity * 1000;
      }
      onSave({
        ...ingredient,
        name,
        totalQuantity: finalQuantity,
        imageUrl,
      });
    }
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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-headline">Edit Ingredient</DialogTitle>
          <DialogDescription>
            Update the details for this ingredient. Click save when you're done.
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
            <div className="w-full cursor-pointer" onClick={handleImageClick}>
              <Image
                src={
                  imageError
                    ? "https://placehold.co/64x64/EEE/31343C?text=Click"
                    : imageUrl
                }
                alt="Click to upload"
                width={64}
                height={64}
                className="rounded-md object-cover aspect-square"
                onError={() => setImageError(true)}
                onLoad={() => setImageError(false)}
                unoptimized
                data-ai-hint="ingredient"
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
