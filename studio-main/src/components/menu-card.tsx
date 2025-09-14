"use client";

import Image from 'next/image';
import type { MenuItem } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit } from 'lucide-react';

interface MenuCardProps {
  item: MenuItem;
  onEdit?: () => void; // Function to call when edit is clicked
  allowEditing?: boolean; // Controls if the edit button is visible
}

const API_BASE = process.env.NEXT_PUBLIC_API_SERVER_URL || "http://localhost:8000";

export function MenuCard({ item, onEdit, allowEditing = false }: MenuCardProps) {
  
  const getImageUrl = () => {
    if (!item.imageUrl) {
      return '/images/Screenshot-2025-09-02-072706.png';
    }
    if (item.imageUrl.startsWith('http')) {
      return item.imageUrl;
    }
    return `${API_BASE}${item.imageUrl}`;
  };

  const imageUrl = getImageUrl();

  return (
    <Card className="flex flex-col overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 h-full group">
      <CardHeader className="p-0">
        <div className="aspect-video relative">
          <Image
            src={imageUrl}
            alt={item.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            unoptimized
          />
          {/* [THE FIX] Show Edit button if allowed */}
          {allowEditing && (
            <Button
              size="sm"
              variant="secondary"
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={onEdit}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
        </div>
        <div className="p-6 pb-2">
            <CardTitle className="font-headline text-2xl">{item.name}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <CardDescription>
          <div className="flex flex-wrap gap-2">
            {item.ingredients && item.ingredients.map((ingredient) => (
                <Badge variant="outline" key={ingredient.id || ingredient.name}>{ingredient.name}</Badge>
            ))}
          </div>
        </CardDescription>
      </CardContent>
      <CardFooter>
        <p className="font-semibold text-lg">${item.price.toFixed(2)}</p>
      </CardFooter>
    </Card>
  );
}