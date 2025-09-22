// src/components/menu-card.tsx
import Image from 'next/image';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { MenuItem } from '@/lib/types';

interface MenuCardProps {
  item: MenuItem;
}

// --- DEFINE A FALLBACK IMAGE URL ---
const FALLBACK_IMAGE_URL = "https://picsum.photos/600/400"; // Remote placeholder image (allowed in next.config.ts)

export function MenuCard({ item }: MenuCardProps) {
  // --- FIX: Use the item's image URL or the fallback if it's missing ---
  const imageUrl = item.imageUrl || FALLBACK_IMAGE_URL;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-0">
        <div className="aspect-video relative">
          <Image
            src={imageUrl} // Use the safe imageUrl variable
            alt={item.name}
            fill
            className="object-cover"
            // To prevent errors with external domains like picsum.photos
            unoptimized={!imageUrl.startsWith('/')} 
          />
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-headline">{item.name}</CardTitle>
          <Badge variant="secondary" className="whitespace-nowrap">
            ₹{item.price.toFixed(2)}
          </Badge>
        </div>
        <CardDescription className="mt-2 text-sm">{item.description}</CardDescription>
      </CardContent>
    </Card>
  );
}