import Image from 'next/image';
import type { MenuItem } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface MenuCardProps {
  item: MenuItem;
}

export function MenuCard({ item }: MenuCardProps) {
  return (
    <Card className="flex flex-col overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
      <CardHeader className="p-0">
        <div className="aspect-video relative">
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            className="object-cover"
            data-ai-hint="coffee drink"
          />
        </div>
        <div className="p-6 pb-2">
            <CardTitle className="font-headline text-2xl">{item.name}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <CardDescription>
          <div className="flex flex-wrap gap-2">
            {item.ingredients.map((ingredient) => (
                <Badge variant="outline" key={ingredient.name}>{ingredient.name}</Badge>
            ))}
          </div>
        </CardDescription>
      </CardContent>
      <CardFooter>
        <div className="text-2xl font-bold text-primary font-headline">
          ₹{item.price.toFixed(2)}
        </div>
      </CardFooter>
    </Card>
  );
}
