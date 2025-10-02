// src/components/menu-card.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { MenuItem } from '@/lib/types';
import Image from 'next/image';

interface MenuCardProps {
  item: MenuItem;
}

export function MenuCard({ item }: MenuCardProps) {
  // Handle different image URL formats
  const getImageUrl = (imageUrl: string | undefined | null): string => {
    if (!imageUrl) {
      return 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&h=400&fit=crop';
    }

    // Already a valid URL (Cloudinary, Unsplash, etc.)
    if (imageUrl.startsWith('http')) {
      return imageUrl;
    }

    // Relative path - needs server URL
    if (imageUrl.startsWith('/static/')) {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace('/api', '') || 'http://127.0.0.1:8000';
      return `${baseUrl}${imageUrl}`;
    }

    // Default fallback
    return 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&h=400&fit=crop';
  };

  const imageUrl = getImageUrl(item.imageUrl);

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-200">
      <div className="relative h-48 w-full">
        <Image
          src={imageUrl}
          alt={item.name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          onError={(e) => {
            // Fallback on image load error
            const target = e.target as HTMLImageElement;
            target.src = 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&h=400&fit=crop';
          }}
        />
      </div>
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg font-semibold">{item.name}</CardTitle>
          <Badge variant="secondary" className="ml-2">
            ₹{item.price}
          </Badge>
        </div>
        <CardDescription className="text-sm text-muted-foreground">
          {item.description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <Badge variant={item.category === 'hot' ? 'default' : 'outline'}>
            {item.category}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {item.is_available ? 'Available' : 'Unavailable'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
