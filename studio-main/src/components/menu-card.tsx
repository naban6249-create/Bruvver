import Image from 'next/image';
import type { MenuItem } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface MenuCardProps {
  item: MenuItem;
}

export function MenuCard({ item }: MenuCardProps) {
  const imageUrl = item.imageUrl || 
    (item.image_path ? `http://127.0.0.1:8000${item.image_path}` : '/images/Screenshot-2025-09-02-072706.png');
  
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(price);
  };
  
  return (
    <Card className="flex flex-col overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group">
      <CardHeader className="p-0">
        <div className="aspect-video relative overflow-hidden">
          <Image
            src={imageUrl}
            alt={item.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = "https://placehold.co/400x225/EEE/31343C?text=No+Image";
            }}
          />
          {/* Price badge overlay */}
          <div className="absolute top-2 right-2">
            <Badge className="bg-primary text-primary-foreground font-semibold text-sm">
              {formatPrice(item.price)}
            </Badge>
          </div>
          {/* Category badge */}
          {item.category && (
            <div className="absolute top-2 left-2">
              <Badge variant="secondary" className="text-xs capitalize">
                {item.category}
              </Badge>
            </div>
          )}
        </div>
        <div className="p-6 pb-2">
          <CardTitle className="font-headline text-2xl group-hover:text-primary transition-colors">
            {item.name}
          </CardTitle>
          {item.description && (
            <CardDescription className="mt-2 text-sm text-muted-foreground line-clamp-2">
              {item.description}
            </CardDescription>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-grow px-6 pb-2">
        {item.ingredients && item.ingredients.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Ingredients:</h4>
            <div className="flex flex-wrap gap-1">
              {item.ingredients.slice(0, 4).map((ingredient, index) => (
                <Badge variant="outline" key={index} className="text-xs">
                  {ingredient.name}
                </Badge>
              ))}
              {item.ingredients.length > 4 && (
                <Badge variant="outline" className="text-xs">
                  +{item.ingredients.length - 4} more
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="px-6 pt-0">
        <div className="w-full flex justify-between items-center">
          <div className="text-lg font-semibold text-primary">
            {formatPrice(item.price)}
          </div>
          <div className="text-sm text-muted-foreground">
            {item.is_available ? (
              <span className="text-green-600 font-medium">Available</span>
            ) : (
              <span className="text-red-500 font-medium">Unavailable</span>
            )}
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}